import React from 'react';
import { Booking, BookingStatus, SeatingArea, BookingType, Branch } from '../../types';
import {
    ClockIcon, UserGroupIcon, MapPinIcon, CalendarIcon,
    CheckCircleIcon, ArrowRightCircleIcon, XCircleIcon, PhoneArrowUpRightIcon
} from '@heroicons/react/24/solid';

interface BookingRowProps {
    booking: Booking;
    onUpdateStatus: (id: string, status: BookingStatus) => void;
    onCallCustomer: (booking: Booking) => void;
    showBranch: boolean;
    branches: Branch[];
}

const statusInfo = {
    [BookingStatus.WAITING]: { text: 'في الانتظار', color: 'border-yellow-500' },
    [BookingStatus.CONFIRMED]: { text: 'مؤكد', color: 'border-blue-500' },
    [BookingStatus.SEATED]: { text: 'تم الجلوس', color: 'border-indigo-500' },
};

const playSound = (frequency = 440, duration = 100) => {
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, context.currentTime + 0.02);
        oscillator.start(context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration / 1000);
        oscillator.stop(context.currentTime + duration / 1000);
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const BookingRow: React.FC<BookingRowProps> = ({ booking, onUpdateStatus, onCallCustomer, showBranch, branches }) => {

    const handleSeatCustomer = () => {
        playSound();
        onUpdateStatus(booking.id, BookingStatus.SEATED);
    };
    
    const renderActions = () => {
        switch (booking.status) {
            case BookingStatus.WAITING:
            case BookingStatus.CONFIRMED:
                return (
                    <>
                        <button onClick={() => onCallCustomer(booking)} className="btn-action-row bg-blue-600 hover:bg-blue-700">
                            <PhoneArrowUpRightIcon className="h-4 w-4" /> <span>نداء</span>
                        </button>
                        <button onClick={handleSeatCustomer} className="btn-action-row bg-fuchsia-600 hover:bg-fuchsia-700">
                            <ArrowRightCircleIcon className="h-4 w-4" /> <span>جلوس</span>
                        </button>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.CANCELLED)} className="btn-action-row bg-red-600 hover:bg-red-700">
                            <XCircleIcon className="h-4 w-4" /> <span>إلغاء</span>
                        </button>
                    </>
                );
            case BookingStatus.SEATED:
                return (
                     <>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.COMPLETED)} className="btn-action-row bg-green-600 hover:bg-green-700">
                            <CheckCircleIcon className="h-4 w-4" /> <span>غادر العميل</span>
                        </button>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.WAITING)} className="btn-action-row bg-yellow-500 hover:bg-yellow-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.458 5.152l.001-.002-.002.001a5.5 5.5 0 1 1 9.458-5.152ZM10 2.5a.75.75 0 0 1 .75.75v5.596l1.95 2.198a.75.75 0 1 1-1.1 1.02l-2.25-2.5a.75.75 0 0 1-.22-.53V3.25A.75.75 0 0 1 10 2.5Z" clipRule="evenodd" /></svg>
                            <span>اعادة</span>
                        </button>
                    </>
                );
            default:
                return null;
        }
    }

    const displayMobile = booking.mobile.startsWith('+966') ? '0' + booking.mobile.substring(4) : booking.mobile;
    const branchName = showBranch ? branches.find(b => b.id === booking.branchId)?.name || 'N/A' : null;

    return (
         <div className={`bg-white dark:bg-gray-800 rounded-lg p-3 grid items-center gap-4 grid-cols-3 md:grid-cols-5 ${showBranch ? 'md:grid-cols-6' : ''} border-r-4 ${statusInfo[booking.status]?.color || 'border-gray-300'}`}>
            <div className="font-semibold text-gray-800 dark:text-gray-100 col-span-3 md:col-span-1">
                <p>{booking.name}</p>
                {booking.bookingType === BookingType.WAITLIST &&
                    <p className="text-sm font-mono font-bold text-fuchsia-500">{booking.id}</p>
                }
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{displayMobile}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{booking.guests} ضيوف</div>
            
            {showBranch && <div className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{branchName}</div>}

            <div className={`flex gap-2 items-center justify-end col-span-3 md:col-span-2`}>
                <style>{`.btn-action-row { display: flex; align-items: center; gap: 0.25rem; flex-grow: 1; justify-content: center; color: white; font-weight: 600; padding: 0.5rem; border-radius: 0.375rem; transition: background-color 0.2s; font-size: 0.75rem; }`}</style>
                {renderActions()}
            </div>
        </div>
    );
};

export default BookingRow;
