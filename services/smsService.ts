interface MsegatConfig {
    userName: string;
    apiKey: string;
    userSender: string;
}

/**
 * Sends an SMS using the Msegat API.
 * @param config Msegat API credentials.
 * @param mobile The recipient's mobile number (e.g., +9665xxxxxxxx).
 * @param message The text message to send.
 * @returns Promise<boolean> True if the message was sent successfully.
 */
export const sendSms = async (config: MsegatConfig, mobile: string, message: string): Promise<boolean> => {
    const { userName, apiKey, userSender } = config;

    if (!userName || !apiKey || !userSender) {
        console.warn("Msegat credentials are not configured. SMS not sent.");
        return false;
    }

    const url = "https://www.msegat.com/gw/sendsms.php";
    
    // Msegat requires the number without the '+' sign
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;

    const payload = {
        userName,
        apiKey,
        userSender,
        numbers: formattedMobile,
        msg: message,
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            console.error(`Msegat API request failed with status: ${response.status}`, await response.text());
            return false;
        }

        const result = await response.json();
        
        // According to Msegat docs, code '1' means success.
        if (result.code === "1") {
            console.log(`SMS sent successfully to ${mobile}. Message ID: ${result.messageId}`);
            return true;
        } else {
            console.error(`Msegat API returned an error. Code: ${result.code}, Message: ${result.message}`);
            return false;
        }

    } catch (error) {
        console.error("Failed to send SMS via Msegat API:", error);
        return false;
    }
};

export interface KarzounConfig {
    appkey: string;
    authkey: string;
}

/**
 * Sends a WhatsApp message using the Karzoun API.
 * This function uses application/x-www-form-urlencoded and has improved error logging
 * to show the full JSON response from the API for easier debugging.
 * @param config Karzoun API credentials.
 * @param mobile The recipient's mobile number (e.g., +9665xxxxxxxx).
 * @param message The text message to send.
 * @returns Promise<boolean> True if the message was sent successfully.
 */
export const sendWhatsAppViaKarzoun = async (config: KarzounConfig, mobile: string, message: string): Promise<boolean> => {
    const { appkey, authkey } = config;

    if (!appkey || !authkey) {
        console.warn("Karzoun credentials are not configured. WhatsApp message not sent.");
        return false;
    }

    const url = "https://karzoun.app/api/send";
    // Karzoun API requires the number without the '+' and with country code
    const formattedMobile = mobile.startsWith('+') ? mobile.substring(1) : mobile;

    const body = new URLSearchParams();
    body.append('appkey', appkey);
    body.append('authkey', authkey);
    body.append('to', formattedMobile);
    body.append('message', message);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
        });

        const result = await response.json().catch(async () => {
             const text = await response.text();
             console.error(`Karzoun API returned non-JSON response with status ${response.status}: ${text}`);
             return { error: `Server returned non-JSON response: ${text}` };
        });

        if (response.ok && result.message_status === "Success") {
            console.log(`WhatsApp message sent successfully to ${mobile}.`);
            return true;
        } else {
            // This block handles both HTTP errors (e.g., 4xx, 5xx) and API-level errors 
            // where the HTTP status is 200 but the response body indicates a failure.
            const errorDetails = result.body || result.error || JSON.stringify(result);
            console.error(`Karzoun API error (HTTP Status: ${response.status}): ${errorDetails}`);
            return false;
        }

    } catch (error) {
        console.error("Failed to send WhatsApp via Karzoun API:", error);
        return false;
    }
};