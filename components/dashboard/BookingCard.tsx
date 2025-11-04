import React, { useState, useEffect } from 'react';
import { Booking, BookingStatus, SeatingArea, BookingType } from '../../types';
import {
    ClockIcon, UserGroupIcon, MapPinIcon, CalendarIcon,
    CheckCircleIcon, ArrowRightCircleIcon, XCircleIcon, PhoneIcon, PhoneArrowUpRightIcon
} from '@heroicons/react/24/solid';

interface BookingCardProps {
    booking: Booking;
    onUpdateStatus: (id: string, status: BookingStatus) => void;
    onCallCustomer: (booking: Booking) => void;
}

const seatingAreaMap = {
    [SeatingArea.ANY]: 'حسب المتاح',
    [SeatingArea.INDOOR]: 'داخلية',
    [SeatingArea.OUTDOOR]: 'خارجية',
};

const statusInfo = {
    [BookingStatus.WAITING]: { text: 'في الانتظار', color: 'bg-yellow-500' },
    [BookingStatus.CONFIRMED]: { text: 'مؤكد', color: 'bg-blue-500' },
    [BookingStatus.SEATED]: { text: 'تم الجلوس', color: 'bg-indigo-500' },
    [BookingStatus.COMPLETED]: { text: 'مكتمل', color: 'bg-green-500' },
    [BookingStatus.CANCELLED]: { text: 'ملغي', color: 'bg-red-500' },
    [BookingStatus.NO_SHOW]: { text: 'لم يحضر', color: 'bg-gray-500' },
};

const BookingTimer: React.FC<{ startTime: Date; status: BookingStatus }> = ({ startTime, status }) => {
    const calculateElapsedTime = () => {
        const secondsTotal = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
        if (secondsTotal < 0) return '00:00:00';

        const hours = Math.floor(secondsTotal / 3600);
        const minutes = Math.floor((secondsTotal % 3600) / 60);
        const seconds = secondsTotal % 60;

        const padded = (n: number) => n.toString().padStart(2, '0');

        return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
    };

    const [elapsedTime, setElapsedTime] = useState(calculateElapsedTime);

    useEffect(() => {
        const isActive = status === BookingStatus.WAITING || status === BookingStatus.CONFIRMED || status === BookingStatus.SEATED;

        if (isActive) {
            const timer = setInterval(() => {
                setElapsedTime(calculateElapsedTime());
            }, 1000);

            return () => clearInterval(timer);
        }
    }, [startTime, status]);
    
    return <span className="text-sm text-gray-500 dark:text-gray-400 font-mono" dir="ltr">{elapsedTime}</span>;
};


const BookingCard: React.FC<BookingCardProps> = ({ booking, onUpdateStatus, onCallCustomer }) => {
    
    const playSound = (frequency = 440, duration = 100) => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (!context) return;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.frequency.value = frequency; // A4 note for a neutral click
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
                        <button onClick={() => onCallCustomer(booking)} className="btn-action bg-blue-600 hover:bg-blue-700 text-xs">
                            <PhoneArrowUpRightIcon className="h-5 w-5" /> نداء
                        </button>
                        <button onClick={handleSeatCustomer} className="btn-action bg-fuchsia-600 hover:bg-fuchsia-700 text-xs">
                            <ArrowRightCircleIcon className="h-5 w-5" /> جلوس
                        </button>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.CANCELLED)} className="btn-action bg-red-600 hover:bg-red-700 text-xs">
                            <XCircleIcon className="h-5 w-5" /> إلغاء
                        </button>
                    </>
                );
            case BookingStatus.SEATED:
                return (
                     <div className="flex gap-2 w-full">
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.COMPLETED)} className="btn-action bg-green-600 hover:bg-green-700 text-xs">
                            <CheckCircleIcon className="h-5 w-5" /> غادر العميل
                        </button>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.WAITING)} className="btn-action bg-yellow-500 hover:bg-yellow-600 text-xs">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.458 5.152l.001-.002-.002.001a5.5 5.5 0 1 1 9.458-5.152ZM10 2.5a.75.75 0 0 1 .75.75v5.596l1.95 2.198a.75.75 0 1 1-1.1 1.02l-2.25-2.5a.75.75 0 0 1-.22-.53V3.25A.75.75 0 0 1 10 2.5Z" clipRule="evenodd" /></svg>
                            اعادة للطابور
                        </button>
                        <button onClick={() => onUpdateStatus(booking.id, BookingStatus.CANCELLED)} className="btn-action bg-red-600 hover:bg-red-700 text-xs">
                            <XCircleIcon className="h-5 w-5" /> إلغاء
                        </button>
                    </div>
                );
            default:
                return null;
        }
    }
    
    const displayMobile = booking.mobile.startsWith('+966') ? '0' + booking.mobile.substring(4) : booking.mobile;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-xl">{booking.name}</h3>
                        <BookingTimer startTime={booking.seatedAt || booking.createdAt} status={booking.status} />
                    </div>
                    <div className="text-left">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${statusInfo[booking.status].color}`}>
                            {statusInfo[booking.status].text}
                        </span>
                        {booking.bookingType === BookingType.WAITLIST &&
                            <p className="text-2xl font-mono font-extrabold text-fuchsia-500 mt-1">{booking.id}</p>
                        }
                    </div>
                </div>

                <div className="space-y-2.5 text-sm border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex items-center gap-3">
                        <UserGroupIcon className="h-5 w-5 text-gray-400" />
                        <span>{booking.guests} ضيوف</span>
                    </div>
                     <div className="flex items-center gap-3">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <span dir="ltr">{displayMobile}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                        <span>{seatingAreaMap[booking.seatingArea]}</span>
                    </div>
                    {booking.bookingType === BookingType.APPOINTMENT && (
                        <>
                            <div className="flex items-center gap-3">
                                <CalendarIcon className="h-5 w-5 text-gray-400" />
                                <span>{new Date(booking.appointmentDate!).toLocaleDateString('ar-SA')}</span>
                            </div>
                             <div className="flex items-center gap-3">
                                <ClockIcon className="h-5 w-5 text-gray-400" />
                                <span>{booking.appointmentTime}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
            
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <style>{`.btn-action { display: flex; align-items: center; gap: 0.5rem; flex-grow: 1; justify-content: center; color: white; font-weight: bold; padding: 0.6rem; border-radius: 0.5rem; transition: background-color 0.2s; }`}</style>
                {renderActions()}
            </div>
        </div>
    );
};

export default BookingCard;