import React, { useState, useEffect, FormEvent } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import Header from './components/layout/Header';
import FloatingWhatsApp from './components/customer/FloatingWhatsApp';
import { SparklesIcon, TicketIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { Booking } from './types';

// New Component: ReviewBookingModal
const ReviewBookingModal: React.FC<{ isOpen: boolean; onClose: () => void; onBookingFound: (booking: Booking) => void; }> = ({ isOpen, onClose, onBookingFound }) => {
    const { findActiveBookingByMobile } = useApp();
    const [mobile, setMobile] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('');
        const mobileRegex = /^(\+9665|05)[0-9]{8}$/;
        if (!mobileRegex.test(mobile)) {
            setError('الرجاء إدخال رقم جوال سعودي صحيح.');
            return;
        }
        
        const normalizedMobile = mobile.startsWith('05') ? `+966${mobile.substring(1)}` : mobile;
        const booking = findActiveBookingByMobile(normalizedMobile);
        if (booking) {
            onBookingFound(booking);
            setMobile('');
        } else {
            setError('لم يتم العثور على حجز فعال بهذا الرقم.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-center mb-4">استعراض الحجز</h3>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">أدخل رقم جوالك المسجل في الحجز.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="review-mobile" className="sr-only">رقم الجوال</label>
                        <input 
                            type="tel" 
                            id="review-mobile" 
                            value={mobile} 
                            onChange={e => setMobile(e.target.value)} 
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-pink-500 focus:border-pink-500 text-center"
                            placeholder="05xxxxxxxx" 
                            required 
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors shadow-lg">
                        بحث
                    </button>
                </form>
            </div>
        </div>
    );
};


// Footer Component
const Footer: React.FC = () => {
    return (
        <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 text-center p-4 text-sm fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 z-40">
            <div className="container mx-auto flex flex-col sm:flex-row justify-center items-center gap-2 sm:gap-4">
                <span>
                    تطوير <a href="https://dbs.sa" target="_blank" rel="noopener noreferrer" className="text-fuchsia-600 dark:text-fuchsia-400 hover:underline font-semibold">دي بزنس</a>
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                <span className="flex items-center gap-1.5">
                   مدعوم بتقنيات الـ Ai
                </span>
            </div>
        </footer>
    );
};


// This component determines which main page to show based on auth state
const AppRouter: React.FC = () => {
    const { user } = useAuth();
    const { findBookingById } = useApp();
    const [view, setView] = useState<'home' | 'login' | 'dashboard'>('home');
    const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

    useEffect(() => {
        if (user) {
            setView('dashboard');
        } else {
             // If not logged in, show home, but allow navigation to login
        }
    }, [user]);

     useEffect(() => {
        const activeBookingId = sessionStorage.getItem('activeBookingId');
        if (activeBookingId) {
            const foundBooking = findBookingById(activeBookingId);
            if (foundBooking) {
                setActiveBooking(foundBooking);
            }
        }
    }, [findBookingById]);

    const navigate = (newView: 'home' | 'login' | 'dashboard') => {
        if (newView === 'dashboard' && !user) {
            setView('login');
        } else {
            setView(newView);
        }
    };

    return (
        <>
            <Header navigate={navigate} currentView={view} onReviewBookingClick={() => setIsReviewModalOpen(true)} />
            <main className="pt-20 pb-20">
                {view === 'home' && <HomePage activeBooking={activeBooking} setActiveBooking={setActiveBooking} />}
                {view === 'login' && <LoginPage onLoginSuccess={() => setView('dashboard')} />}
                {view === 'dashboard' && user && <DashboardPage />}
                
                {view !== 'dashboard' && (
                  <>
                    <FloatingWhatsApp />
                  </>
                )}
            </main>
            <Footer />
            <ReviewBookingModal 
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onBookingFound={(booking) => {
                    setActiveBooking(booking);
                    sessionStorage.setItem('activeBookingId', booking.id);
                    setIsReviewModalOpen(false);
                }}
            />
        </>
    );
}

// The main App component that wraps everything in context providers
const App: React.FC = () => {
    return (
        <ThemeProvider>
            <AppProvider>
                <AuthProvider>
                    <ThemedApp />
                </AuthProvider>
            </AppProvider>
        </ThemeProvider>
    );
};

// A helper component to access theme context for styling the body
const ThemedApp: React.FC = () => {
    const { theme } = useTheme();

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === 'dark' ? 'light' : 'dark');
        root.classList.add(theme);
    }, [theme]);

    return (
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen transition-colors duration-300">
            <AppRouter />
        </div>
    );
};


export default App;