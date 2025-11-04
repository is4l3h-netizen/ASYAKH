import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { SunIcon, MoonIcon, ArrowRightOnRectangleIcon, UserCircleIcon, Cog6ToothIcon, TicketIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
    navigate: (view: 'home' | 'login' | 'dashboard') => void;
    currentView: 'home' | 'login' | 'dashboard';
    onReviewBookingClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ navigate, currentView, onReviewBookingClick }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const { settings } = useApp();

    const handleLogout = () => {
        logout();
        navigate('home');
    }

    return (
        <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md fixed top-0 left-0 right-0 z-50">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <img className="h-8 w-auto rounded-full" src={settings.logoUrl} alt={settings.restaurantName} />
                        <span className="font-bold text-xl mr-3">{settings.restaurantName}</span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-fuchsia-500 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-800"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
                        </button>
                        
                        {user ? (
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium">{user.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                                </div>
                                <UserCircleIcon className="h-8 w-8 text-gray-400"/>
                                <button onClick={handleLogout} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" title="تسجيل الخروج">
                                    <ArrowRightOnRectangleIcon className="h-6 w-6" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 sm:gap-4">
                                <button 
                                    onClick={onReviewBookingClick} 
                                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
                                >
                                    <TicketIcon className="h-5 w-5"/>
                                    <span className="hidden sm:inline">استعراض الحجز</span>
                                </button>
                                <div className="h-6 w-px bg-gray-200 dark:bg-gray-600"></div>
                                <button 
                                    onClick={() => currentView === 'login' ? navigate('home') : navigate('login')} 
                                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 transition-colors"
                                >
                                    {currentView === 'login' ? 
                                        <span>العودة للرئيسية</span> : 
                                        <>
                                            <Cog6ToothIcon className="h-5 w-5"/>
                                            <span className="hidden sm:inline">لوحة التحكم</span>
                                        </>
                                    }
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;