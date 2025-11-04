import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Branch, Booking, BookingType } from '../types';
import BranchSelector from '../components/customer/BranchSelector';
import BookingForm from '../components/customer/BookingForm';
import BookingStatusPage from './BookingStatusPage';
import { InformationCircleIcon, HomeIcon } from '@heroicons/react/24/solid';

interface HomePageProps {
    activeBooking: Booking | null;
    setActiveBooking: (booking: Booking | null) => void;
}

const HomePage: React.FC<HomePageProps> = ({ activeBooking, setActiveBooking }) => {
    const { branches, settings, findActiveBookingByMobile } = useApp();
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [bookingType, setBookingType] = useState<BookingType | null>(null);
    const [searchMobile, setSearchMobile] = useState('');
    const [searchError, setSearchError] = useState('');

    const handleBranchSelect = (branch: Branch) => {
        setSelectedBranch(branch);
    };

    const handleBookingTypeSelect = (type: BookingType) => {
        setBookingType(type);
    };

    const handleBookingSuccess = (booking: Booking) => {
        setActiveBooking(booking);
        sessionStorage.setItem('activeBookingId', booking.id);
    };

    const handleGoBack = () => {
        if (bookingType) {
            setBookingType(null);
        } else if (selectedBranch) {
            setSelectedBranch(null);
        }
    };

    const handleGoHome = () => {
        setSelectedBranch(null);
        setBookingType(null);
        setActiveBooking(null);
        sessionStorage.removeItem('activeBookingId');
    };
    
    const handleSearchBooking = (e: React.FormEvent) => {
        e.preventDefault();
        setSearchError('');
        const mobileRegex = /^(\+9665|05)[0-9]{8}$/;
        if (!mobileRegex.test(searchMobile)) {
            setSearchError('الرجاء إدخال رقم جوال سعودي صحيح (مثال: 0512345678).');
            return;
        }
        
        const normalizedSearchMobile = searchMobile.startsWith('05')
            ? '+966' + searchMobile.substring(1)
            : searchMobile;
            
        const foundBooking = findActiveBookingByMobile(normalizedSearchMobile);
        if (foundBooking) {
            setActiveBooking(foundBooking);
            sessionStorage.setItem('activeBookingId', foundBooking.id);
            setSearchMobile('');
            setSearchError('');
        } else {
            setSearchError('لم يتم العثور على حجز فعال بهذا الرقم.');
        }
    };

    if (activeBooking) {
        return <BookingStatusPage booking={activeBooking} onBack={() => {
             sessionStorage.removeItem('activeBookingId');
             setActiveBooking(null);
        }} />;
    }

    if (!settings.customerUi.bookingEnabled) {
        return (
            <div className="container mx-auto p-4 text-center mt-20">
                <div className="bg-yellow-100 dark:bg-yellow-900/40 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300 p-6 rounded-lg max-w-md mx-auto shadow-lg">
                    <div className="flex">
                        <div className="py-1"><InformationCircleIcon className="h-6 w-6 text-yellow-500 mr-4"/></div>
                        <div>
                            <p className="font-bold">الحجوزات متوقفة مؤقتاً</p>
                            <p className="text-sm">عذراً، نستقبل الحجوزات في وقت لاحق. الرجاء المحاولة مرة أخرى.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedBranch && bookingType) {
        return <BookingForm branch={selectedBranch} bookingType={bookingType} onBookingSuccess={handleBookingSuccess} onBack={handleGoBack} />;
    }

    return (
        <div className="container mx-auto p-4">
             {(selectedBranch || activeBooking) && (
                 <button
                    onClick={handleGoHome}
                    className="fixed bottom-36 left-6 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 z-50 flex items-center gap-2"
                    aria-label="Back to Home"
                    title="العودة إلى الرئيسية"
                >
                    <HomeIcon className="h-7 w-7" />
                </button>
            )}

            <BranchSelector
                branches={branches}
                onSelect={handleBranchSelect}
                selectedBranch={selectedBranch}
                onBookingTypeSelect={handleBookingTypeSelect}
                onBack={() => setSelectedBranch(null)}
                welcomeMessage={settings.customerUi.welcomeMessage}
            />

            {!selectedBranch && (
                <div className="max-w-md mx-auto mt-12" dir="rtl">
                    <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold dark:text-white">لديك حجز بالفعل؟</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">أدخل رقم جوالك لاستعراض حالة الحجز أو تعديله.</p>
                    </div>
                    <form onSubmit={handleSearchBooking} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                        <div>
                            <label htmlFor="search-mobile" className="sr-only">رقم الجوال</label>
                            <input 
                                type="tel" 
                                id="search-mobile" 
                                value={searchMobile} 
                                onChange={e => setSearchMobile(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-pink-500 focus:border-pink-500 text-center"
                                placeholder="05xxxxxxxx" 
                                required 
                            />
                        </div>
                        {searchError && <p className="text-red-500 text-sm text-center">{searchError}</p>}
                        <button type="submit" className="w-full bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 transition-colors shadow-lg">
                            استعراض الحجز
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default HomePage;