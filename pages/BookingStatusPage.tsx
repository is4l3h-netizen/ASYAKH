import React, { useState, useEffect, useMemo } from 'react';
import { Booking, BookingType, BookingStatus, SeatingArea } from '../types';
import { useApp } from '../context/AppContext';
import { getEstimatedWaitTime } from '../services/geminiService';
import { ClockIcon, UserGroupIcon, MapPinIcon, CheckCircleIcon, CalendarIcon, SparklesIcon, XCircleIcon, PencilIcon, ArrowRightOnRectangleIcon, StarIcon } from '@heroicons/react/24/solid';

interface BookingStatusPageProps {
    booking: Booking;
    onBack: () => void;
}

const seatingAreaMap = {
    [SeatingArea.ANY]: 'حسب المتاح',
    [SeatingArea.INDOOR]: 'داخلية',
    [SeatingArea.OUTDOOR]: 'خارجية',
};

const BookingStatusPage: React.FC<BookingStatusPageProps> = ({ booking: initialBooking, onBack }) => {
    const { bookings, branches, currentlyServing, updateBooking, findBookingById, getAverageVisitDuration } = useApp();
    
    // Get the latest, most up-to-date booking object from the global state
    const booking = findBookingById(initialBooking.id);

    const [isLoadingWaitTime, setIsLoadingWaitTime] = useState(false);
    const [estimatedTime, setEstimatedTime] = useState(booking?.estimatedWaitTime);

    // If the booking is not found (e.g., after cancellation and navigation), show a message.
    if (!booking) {
        return (
            <div className="container mx-auto p-4 max-w-lg text-center">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                    <XCircleIcon className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">لم يتم العثور على الحجز</h2>
                    <p className="text-gray-600 dark:text-gray-400">قد يكون الحجز قد اكتمل أو تم إلغاؤه.</p>
                    <button
                        onClick={onBack}
                        className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                        <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        <span>العودة للرئيسية</span>
                    </button>
                </div>
            </div>
        );
    }

    const branch = branches.find(b => b.id === booking.branchId);

    const waitlistQueue = useMemo(() => {
        return bookings
            .filter(b => b.branchId === booking.branchId && b.bookingType === BookingType.WAITLIST && b.status === BookingStatus.WAITING)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [bookings, booking.branchId]);
    
    const positionInQueue = waitlistQueue.findIndex(b => b.id === booking.id) + 1;
    const queueAhead = useMemo(() => waitlistQueue.slice(0, positionInQueue - 1), [waitlistQueue, positionInQueue]);
    const nowServing = currentlyServing(booking.branchId);

    useEffect(() => {
        if (booking.bookingType === BookingType.WAITLIST && positionInQueue > 0 && !estimatedTime && branch) {
            const fetchWaitTime = async () => {
                setIsLoadingWaitTime(true);
                const avgDuration = getAverageVisitDuration(branch.id);
                const context = {
                    queueAhead: queueAhead,
                    branch: branch,
                    currentTime: new Date(),
                    averageVisitDuration: avgDuration,
                };
                const time = await getEstimatedWaitTime(context);
                setEstimatedTime(time);
                updateBooking(booking.id, { estimatedWaitTime: time });
                setIsLoadingWaitTime(false);
            };
            fetchWaitTime();
        }
    }, [booking.bookingType, positionInQueue, estimatedTime, updateBooking, branch, queueAhead, booking.id, getAverageVisitDuration]);
    
    const handleCancel = () => {
        if (window.confirm('هل أنت متأكد من رغبتك في إلغاء الحجز؟')) {
            updateBooking(booking.id, { status: BookingStatus.CANCELLED });
        }
    };
    
    const handleEdit = () => {
        alert('ميزة تعديل الحجز قيد التطوير حالياً وستكون متاحة قريباً.');
    };

    if (!branch) return <p>خطأ: لم يتم العثور على الفرع.</p>;
    
    if (booking.status === BookingStatus.CANCELLED) {
      return (
        <div className="container mx-auto p-4 max-w-lg text-center">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <XCircleIcon className="h-20 w-20 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">تم إلغاء الحجز</h2>
                <p className="text-gray-600 dark:text-gray-400">لقد تم إلغاء حجزك بنجاح.</p>
                <button
                    onClick={onBack}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                    <span>العودة للرئيسية</span>
                </button>
            </div>
        </div>
      )
    }

    const renderWaitlistStatus = () => (
        <>
            <h2 className="text-2xl font-bold text-center mb-1">حالة الطابور</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6">فرع {branch.name}</p>
            <div className="grid grid-cols-2 gap-4 text-center mb-6">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">رقمك الحالي</p>
                    <p className="text-3xl font-bold text-fuchsia-600 dark:text-fuchsia-400">{booking.id}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">يتم خدمة رقم</p>
                    <p className="text-3xl font-bold">{nowServing}</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">أمامك</p>
                    <p className="text-3xl font-bold">{queueAhead.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">أشخاص</p>
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg flex flex-col justify-center items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <SparklesIcon className="h-4 w-4 text-amber-400" />
                        الوقت المتوقع
                    </p>
                    {isLoadingWaitTime ? (
                        <div className="animate-pulse h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded-md mt-1"></div>
                    ) : (
                        <p className="text-3xl font-bold">{estimatedTime || '...'}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">دقيقة</p>
                </div>
            </div>
        </>
    );

    const renderAppointmentStatus = () => (
        <>
            <div className="text-center mb-6">
                <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold">تم تأكيد حجزك!</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">نتطلع لرؤيتك في فرع {branch.name}</p>
            </div>
            <div className="space-y-3 text-sm">
                <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-400 ml-3" />
                    <span className="font-semibold">التاريخ:</span>
                    <span className="mr-2">{new Date(booking.appointmentDate!).toLocaleDateString('ar-SA')}</span>
                </div>
                <div className="flex items-center">
                    <ClockIcon className="h-5 w-5 text-gray-400 ml-3" />
                    <span className="font-semibold">الوقت:</span>
                    <span className="mr-2">{booking.appointmentTime}</span>
                </div>
            </div>
        </>
    );

    const canBeModified = booking.status === BookingStatus.WAITING || booking.status === BookingStatus.CONFIRMED;

    return (
        <div className="container mx-auto p-4 max-w-lg">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                {booking.bookingType === BookingType.WAITLIST ? renderWaitlistStatus() : renderAppointmentStatus()}
                <div className="border-t border-gray-200 dark:border-gray-700 my-6"></div>
                <h3 className="font-bold mb-3">تفاصيل الحجز</h3>
                <div className="space-y-3 text-sm">
                     <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-gray-400 ml-3" />
                        <span className="font-semibold">الاسم:</span>
                        <span className="mr-2">{booking.name}</span>
                    </div>
                    <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-gray-400 ml-3" />
                        <span className="font-semibold">عدد الضيوف:</span>
                        <span className="mr-2">{booking.guests} أشخاص</span>
                    </div>
                    <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 text-gray-400 ml-3" />
                        <span className="font-semibold">منطقة الجلوس:</span>
                        <span className="mr-2">{seatingAreaMap[booking.seatingArea]}</span>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                    {branch.googleMapsUrl && (
                        <a
                            href={branch.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-center text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 rounded-lg py-3 transition-colors"
                        >
                            <MapPinIcon className="h-5 w-5" />
                            <span>عرض الفرع على الخريطة</span>
                        </a>
                    )}
                    {branch.reviewUrl && (
                         <a
                            href={branch.reviewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full text-center text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 rounded-lg py-3 transition-colors"
                        >
                            <StarIcon className="h-5 w-5" />
                            <span>قيّم تجربتك</span>
                        </a>
                    )}
                </div>


                {canBeModified && (
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <button 
                            onClick={handleEdit}
                            className="w-full flex items-center justify-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
                        >
                            <PencilIcon className="h-5 w-5" />
                            <span>تعديل الحجز</span>
                        </button>
                        <button
                            onClick={handleCancel}
                            className="w-full flex items-center justify-center gap-2 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-600 dark:text-red-400 font-bold py-3 px-4 rounded-lg transition-colors"
                        >
                            <XCircleIcon className="h-5 w-5" />
                            <span>إلغاء الحجز</span>
                        </button>
                    </div>
                )}
                 <button
                    onClick={onBack}
                    className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                    حجز جديد
                </button>
            </div>
        </div>
    );
};

export default BookingStatusPage;