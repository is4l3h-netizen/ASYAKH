import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Booking, BookingStatus, BookingType, Branch } from '../../types';
import BookingCard from './BookingCard';
import BookingRow from './BookingRow';
import { FunnelIcon, XMarkIcon, CheckCircleIcon, QueueListIcon, Squares2X2Icon } from '@heroicons/react/24/solid';
import { UsersIcon, BellAlertIcon } from '@heroicons/react/24/outline';


const playSound = (frequency = 600, duration = 150) => {
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
        gain.gain.linearRampToValueAtTime(0.2, context.currentTime + 0.02);
        oscillator.start(context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration / 1000);
        oscillator.stop(context.currentTime + duration / 1000);
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const CallCustomerModal: React.FC<{
    booking: Booking | null;
    onClose: () => void;
    onSend: (message: string) => void;
    defaultMessage: string;
}> = ({ booking, onClose, onSend, defaultMessage }) => {
    const [message, setMessage] = useState(defaultMessage);
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (booking) {
            setMessage(defaultMessage.replace('{customerName}', booking.name).replace('{branchName}', booking.branchId));
            setSent(false);
            setIsSending(false);
        }
    }, [booking, defaultMessage]);

    if (!booking) return null;

    const handleSend = () => {
        setIsSending(true);
        onSend(message);
        setTimeout(() => {
            setIsSending(false);
            setSent(true);
            setTimeout(() => onClose(), 1500);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">نداء العميل: {booking.name}</h3>
                     <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">سيتم إرسال الرسالة التالية إلى جوال العميل عبر القنوات المفعلة (SMS/WhatsApp).</p>
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                />
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">
                        إلغاء
                    </button>
                    <button 
                        onClick={handleSend}
                        disabled={isSending || sent}
                        className={`font-bold py-2 px-4 rounded-lg flex items-center justify-center w-32 transition-colors ${
                            sent ? 'bg-green-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white disabled:bg-fuchsia-400'
                        }`}
                    >
                        {sent ? <CheckCircleIcon className="h-6 w-6"/> : (isSending ? 'جار الإرسال...' : 'إرسال النداء')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CurrentBookings: React.FC = () => {
    const { bookings, updateBooking, branches, settings, sendDirectNotification } = useApp();
    const { user } = useAuth();
    const [filter, setFilter] = useState<'all' | BookingType>('all');
    const [callModalBooking, setCallModalBooking] = useState<Booking | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    
    const userBranchId = user?.branchId;
    const userBranch: Branch | undefined = useMemo(() => {
        return branches.find(b => b.id === userBranchId);
    }, [branches, userBranchId]);
    
    const currentBookings = useMemo(() => {
        return bookings
            .filter(b => {
                const isStaffForAnotherBranch = userBranchId !== 'all' && b.branchId !== userBranchId;
                if (isStaffForAnotherBranch) return false;

                const isActiveStatus = b.status === BookingStatus.WAITING || b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.SEATED;
                const matchesFilter = filter === 'all' || b.bookingType === filter;

                return isActiveStatus && matchesFilter;
            })
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [bookings, userBranchId, filter]);

    const prevBookingCount = useRef(currentBookings.length);

    useEffect(() => {
        // Play sound only for an increase in bookings, not on initial load or decrease.
        if (prevBookingCount.current > 0 && currentBookings.length > prevBookingCount.current) {
            playSound(600, 150);
        }
        prevBookingCount.current = currentBookings.length;
    }, [currentBookings.length]);


    const waitingCount = useMemo(() => currentBookings.filter(b => [BookingStatus.WAITING, BookingStatus.CONFIRMED].includes(b.status)).length, [currentBookings]);
    const seatedCount = useMemo(() => currentBookings.filter(b => b.status === BookingStatus.SEATED).length, [currentBookings]);

    const handleUpdateStatus = (id: string, status: BookingStatus) => {
        updateBooking(id, { status });
    };

    const handleDepartAll = () => {
        const fortyMinutesInMillis = 40 * 60 * 1000;
        const seatedBookings = bookings.filter(b => 
            (userBranchId === 'all' || b.branchId === userBranchId) && 
            b.status === BookingStatus.SEATED &&
            b.seatedAt &&
            (new Date().getTime() - new Date(b.seatedAt).getTime()) > fortyMinutesInMillis
        );

        if (seatedBookings.length === 0) {
            alert("لا يوجد عملاء جالسين لأكثر من 40 دقيقة حالياً لمغادرتهم.");
            return;
        }

        if (window.confirm(`هل أنت متأكد من رغبتك في تسجيل مغادرة جميع العملاء الجالسين لأكثر من 40 دقيقة (${seatedBookings.length})؟`)) {
            seatedBookings.forEach(booking => {
                updateBooking(booking.id, { status: BookingStatus.COMPLETED });
            });
        }
    }
    
    const waitlistCount = currentBookings.filter(b => b.bookingType === BookingType.WAITLIST).length;
    const appointmentsCount = currentBookings.filter(b => b.bookingType === BookingType.APPOINTMENT).length;

    return (
        <div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="w-full sm:w-auto">
                     <h2 className="text-2xl font-bold">الحجوزات الحالية</h2>
                     {userBranch ? <p className="text-gray-500 dark:text-gray-400">فرع {userBranch.name}</p> : <p className="text-gray-500 dark:text-gray-400">جميع الفروع</p>}
                </div>

                <div className="flex-grow flex justify-center sm:justify-start gap-4">
                    <div className="stat-card">
                         <div className="stat-icon bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300">
                             <BellAlertIcon className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="stat-title">المنتظرون</p>
                            <p className="stat-number">{waitingCount}</p>
                         </div>
                    </div>
                     <div className="stat-card">
                        <div className="stat-icon bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300">
                             <UsersIcon className="h-6 w-6" />
                         </div>
                         <div>
                            <p className="stat-title">الجالسون</p>
                            <p className="stat-number">{seatedCount}</p>
                         </div>
                    </div>
                </div>
            </div>
            
            <div className="mb-4 flex flex-col sm:flex-row justify-between items-center gap-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
                 <div className="flex items-center gap-1 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <button onClick={() => setViewMode('grid')} className={`view-btn ${viewMode === 'grid' && 'active'}`} title="عرض البطاقات">
                        <Squares2X2Icon className="h-5 w-5"/>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`view-btn ${viewMode === 'list' && 'active'}`} title="عرض القائمة">
                        <QueueListIcon className="h-5 w-5"/>
                    </button>
                </div>
                
                 <div className="flex items-center gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <FunnelIcon className="h-5 w-5 text-gray-500 mx-2"/>
                    <button onClick={() => setFilter('all')} className={`filter-btn ${filter === 'all' && 'active'}`}>
                        الكل <span className="count-badge">{waitlistCount + appointmentsCount}</span>
                    </button>
                    <button onClick={() => setFilter(BookingType.WAITLIST)} className={`filter-btn ${filter === BookingType.WAITLIST && 'active'}`}>
                        طابور <span className="count-badge">{waitlistCount}</span>
                    </button>
                     <button onClick={() => setFilter(BookingType.APPOINTMENT)} className={`filter-btn ${filter === BookingType.APPOINTMENT && 'active'}`}>
                        مواعيد <span className="count-badge">{appointmentsCount}</span>
                    </button>
                </div>

                <button
                    onClick={handleDepartAll}
                    className="text-sm bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 font-semibold py-2 px-4 rounded-md hover:bg-red-200 dark:hover:bg-red-900"
                >
                    مغادرة الجميع (+40 د)
                </button>
            </div>
            <style>{`
                .stat-card { display: flex; align-items: center; gap: 0.75rem; background-color: white; padding: 0.75rem 1rem; border-radius: 0.75rem; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05); }
                .dark .stat-card { background-color: #1f2937; }
                .stat-icon { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 9999px; }
                .stat-title { font-size: 0.875rem; color: #6b7280; }
                .dark .stat-title { color: #9ca3af; }
                .stat-number { font-size: 1.5rem; font-weight: 700; color: #111827; }
                .dark .stat-number { color: white; }

                .view-btn { padding: 0.5rem; border-radius: 0.375rem; transition-colors; color: #6b7280; }
                .dark .view-btn { color: #9ca3af; }
                .view-btn.active { background-color: white; color: #c026d3; box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
                .dark .view-btn.active { background-color: #374151; }

                .filter-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; font-size: 0.875rem; transition-colors; }
                .filter-btn.active { background-color: white; color: #c026d3; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
                .dark .filter-btn.active { background-color: #374151; }
                .count-badge { background-color: #e9d5ff; color: #a855f7; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; margin-right: -0.25rem;}
                .dark .count-badge { background-color: #581c87; color: #e9d5ff; }
            `}</style>
            
            {currentBookings.length > 0 ? (
                viewMode === 'grid' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {currentBookings.map(booking => (
                            <BookingCard key={booking.id} booking={booking} onUpdateStatus={handleUpdateStatus} onCallCustomer={setCallModalBooking} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {currentBookings.map(booking => (
                            <BookingRow 
                                key={booking.id} 
                                booking={booking} 
                                onUpdateStatus={handleUpdateStatus} 
                                onCallCustomer={setCallModalBooking}
                                showBranch={user?.branchId === 'all'}
                                branches={branches}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">لا توجد حجوزات حالية.</p>
                </div>
            )}

            <CallCustomerModal
                booking={callModalBooking}
                onClose={() => setCallModalBooking(null)}
                onSend={(message) => {
                    if (callModalBooking) {
                        sendDirectNotification(callModalBooking, message);
                    }
                }}
                defaultMessage={settings.notifications.msegat.templates.customerCall}
            />
        </div>
    );
};

export default CurrentBookings;