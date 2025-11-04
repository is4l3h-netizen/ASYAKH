import { GoogleGenAI } from "@google/genai";
import { WaitTimeContext } from "../types";

// Assume API_KEY is set in the environment variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("Gemini API key not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Simple in-memory cache to avoid hitting rate limits
const waitTimeCache = new Map<string, { timestamp: number; waitTime: number }>();
const CACHE_DURATION_MS = 60 * 1000; // 1 minute

const calculateFallbackTime = (queueLength: number): number => {
    // A simple fallback: 5 minutes per group ahead.
    return queueLength * 5;
};

export const getEstimatedWaitTime = async (context: WaitTimeContext): Promise<number> => {
    const { queueAhead, branch, currentTime, averageVisitDuration } = context;
    const queueLength = queueAhead.length;

    // Check cache first
    const cachedEntry = waitTimeCache.get(branch.id);
    if (cachedEntry && (currentTime.getTime() - cachedEntry.timestamp < CACHE_DURATION_MS)) {
        console.log(`Returning cached wait time for branch ${branch.id}: ${cachedEntry.waitTime} minutes.`);
        return cachedEntry.waitTime;
    }

    if (!API_KEY) {
        return calculateFallbackTime(queueLength);
    }

    try {
        const dayOfWeek = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
        const timeOfDay = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        const currentWaitTimesMinutes = queueAhead.map(b => (currentTime.getTime() - new Date(b.createdAt).getTime()) / 60000);
        const avgWaitMinutes = currentWaitTimesMinutes.length > 0 ? currentWaitTimesMinutes.reduce((a, b) => a + b, 0) / currentWaitTimesMinutes.length : 0;
        const maxWaitMinutes = currentWaitTimesMinutes.length > 0 ? Math.max(...currentWaitTimesMinutes) : 0;

        const prompt = `You are an expert restaurant operations analyst for a restaurant in Saudi Arabia. Your task is to provide an accurate wait time estimation.

        Here is the current situation:
        - Branch Name: ${branch.name}
        - Branch Location: ${branch.location} (Use this for context about traffic and peak times)
        - Current Day and Time: ${dayOfWeek}, ${timeOfDay}
        - Number of groups waiting ahead in the queue: ${queueLength}
        
        Historical & Real-time Dynamics:
        - The average dining time for a group at this branch is approximately ${averageVisitDuration.toFixed(0)} minutes.
        - The average current wait time for groups already in the queue is ${avgWaitMinutes.toFixed(1)} minutes.
        - The maximum current wait time for a group in the queue is ${maxWaitMinutes.toFixed(1)} minutes.

        Considering all this information, especially the time of day (e.g., peak dinner time on a weekend vs. a quiet weekday afternoon), the average visit duration, and the real-time queue dynamics, what is the estimated wait time in minutes for the NEXT group joining the queue?

        Provide only a single integer number representing the minutes. Do not include any other text, units, or explanations. For example: 35`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = response.text.trim();
        const waitTime = parseInt(text, 10);

        if (!isNaN(waitTime)) {
            const finalWaitTime = Math.max(5, waitTime); // Ensure a minimum reasonable wait time
            // Store successful result in cache
            waitTimeCache.set(branch.id, { timestamp: currentTime.getTime(), waitTime: finalWaitTime });
            return finalWaitTime;
        } else {
            console.error("Gemini API returned a non-numeric response:", text);
            return calculateFallbackTime(queueLength);
        }

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return calculateFallbackTime(queueLength);
    }
};