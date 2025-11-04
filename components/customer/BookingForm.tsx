import React, { useState, useMemo, useEffect } from 'react';
import { Branch, BookingType, SeatingArea, Booking, BookingStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { ChevronLeftIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

interface BookingFormProps {
    branch: Branch;
    bookingType: BookingType;
    onBookingSuccess: (booking: Booking) => void;
    onBack: () => void;
}

const playSound = (frequency = 800, duration = 200) => {
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!context) return;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.frequency.value = frequency; // Higher pitch for success
        oscillator.type = 'sine';
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.02);
        oscillator.start(context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + duration / 1000);
        oscillator.stop(context.currentTime + duration / 1000);
    } catch (e) {
        console.error("Could not play sound", e);
    }
};

const BookingForm: React.FC<BookingFormProps> = ({ branch, bookingType, onBookingSuccess, onBack }) => {
    const { addBooking, settings, bookings, findActiveBookingByMobile } = useApp();
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('05');
    const [guests, setGuests] = useState(2);
    const [seatingArea, setSeatingArea] = useState<SeatingArea>(SeatingArea.ANY);
    const [appointmentDate, setAppointmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [appointmentTime, setAppointmentTime] = useState('');
    const [agreedToNotifications, setAgreedToNotifications] = useState(true);
    const [error, setError] = useState('');
    const [duplicateMobile, setDuplicateMobile] = useState<string | null>(null);
    const [dateError, setDateError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    // Fix: Extracted seating area translations to a map for cleaner code and to resolve typing issues.
    const seatingAreaTranslations: Record<SeatingArea, string> = {
        [SeatingArea.ANY]: 'حسب المتاح',
        [SeatingArea.INDOOR]: 'داخلية',
        [SeatingArea.OUTDOOR]: 'خارجية',
    };

    const availableSlots = useMemo(() => {
        if (bookingType !== BookingType.APPOINTMENT || !appointmentDate) return [];
        
        const bookingsOnDate = bookings.filter(b => 
            b.branchId === branch.id &&
            b.status === BookingStatus.CONFIRMED &&
            b.appointmentDate && new Date(b.appointmentDate).toISOString().split('T')[0] === appointmentDate
        );

        return branch.appointmentSettings.availableSlots.map(slot => {
            const bookingsForSlot = bookingsOnDate.filter(b => b.appointmentTime === slot.time).length;
            return {
                ...slot,
                isFull: bookingsForSlot >= slot.capacity
            };
        });
    }, [appointmentDate, branch, bookings, bookingType]);
    
    useEffect(() => {
        if (bookingType === BookingType.APPOINTMENT) {
            const selectedDate = new Date(appointmentDate);
            // Use getUTCDay to avoid timezone issues
            const dayOfWeek = selectedDate.getUTCDay(); 
            if (!branch.appointmentSettings.availableDays.includes(dayOfWeek)) {
                const availableDayNames = branch.appointmentSettings.availableDays
                    .map(d => ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][d])
                    .join('، ');
                setDateError(`الحجز غير متاح في هذا اليوم. الأيام المتاحة: ${availableDayNames}`);
                setAppointmentTime(''); // Reset time if date is invalid
            } else {
                setDateError('');
            }
        }
    }, [appointmentDate, bookingType, branch.appointmentSettings.availableDays]);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isSuccess) return; // Prevent multiple submissions
        setError('');
        setDuplicateMobile(null);

        if (!name || !mobile || guests < 1) {
            setError('الرجاء تعبئة جميع الحقول الإجبارية.');
            return;
        }
        
        const mobileRegex = /^(\+9665|05)[0-9]{8}$/;
        if (!mobileRegex.test(mobile)) {
            setError('الرجاء إدخال رقم جوال سعودي صحيح (مثال: 0512345678).');
            return;
        }

        if (bookingType === BookingType.APPOINTMENT && (!appointmentDate || !appointmentTime)) {
            setError('الرجاء تحديد التاريخ والوقت للموعد.');
            return;
        }
        
        if (dateError) {
             setError(`لا يمكن الحجز في اليوم المحدد. ${dateError}`);
             return;
        }
        
        const normalizedMobile = mobile.startsWith('05') 
            ? '+966' + mobile.substring(1) 
            : mobile;

        const bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'> = {
            branchId: branch.id,
            bookingType,
            name,
            mobile: normalizedMobile,
            guests,
            seatingArea,
            agreedToNotifications,
            ...(bookingType === BookingType.APPOINTMENT && { 
                appointmentDate: new Date(appointmentDate),
                appointmentTime: appointmentTime 
            })
        };
        
        const newBooking = addBooking(bookingData);
        if (newBooking) {
            playSound();
            setIsSuccess(true);
            setTimeout(() => {
                onBookingSuccess(newBooking);
            }, 1500);
        } else {
            setError('يوجد حجز فعال مسجل بهذا الرقم بالفعل.');
            setDuplicateMobile(normalizedMobile);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-4">
             <button onClick={onBack} className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
                <ChevronLeftIcon className="h-5 w-5 transform rotate-180" />
                <span className="mr-1">العودة</span>
            </button>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {bookingType === BookingType.WAITLIST ? 'الانضمام لقائمة الانتظار' : 'حجز موعد'}
                        <span className="block w-24 h-1 bg-fuchsia-500 mx-auto mt-2"></span>
                    </h2>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">فرع {branch.name}</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الاسم</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500" />
                    </div>
                    <div>
                        <label htmlFor="mobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الجوال</label>
                        <input type="tel" id="mobile" value={mobile} onChange={e => setMobile(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500" placeholder="05xxxxxxxx" />
                    </div>
                    <div>
                        <label htmlFor="guests" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عدد الضيوف</label>
                        <select id="guests" value={guests} onChange={e => setGuests(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500">
                            {Array.from({ length: settings.customerUi.maxGuests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>
                     {settings.customerUi.showSeatingArea && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">منطقة الجلوس</label>
                            <div className="flex gap-2">
                                {/* Fix: Used Object.values for cleaner iteration over the string enum. */}
                                {(Object.values(SeatingArea)).map(area => (
                                    <button type="button" key={area} onClick={() => setSeatingArea(area)} className={`flex-1 py-2 px-4 rounded-lg text-sm transition-colors ${seatingArea === area ? 'bg-fuchsia-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'}`}>
                                        {seatingAreaTranslations[area]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {bookingType === BookingType.APPOINTMENT && (
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label>
                                <input type="date" id="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500" />
                                {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
                            </div>
                            <div>
                                <label htmlFor="time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الوقت</label>
                                <select id="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} required disabled={!!dateError} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 focus:ring-fuchsia-500 focus:border-fuchsia-500 disabled:bg-gray-200 dark:disabled:bg-gray-600">
                                    <option value="" disabled>اختر وقتاً</option>
                                    {availableSlots.map(slot => (
                                        <option key={slot.time} value={slot.time} disabled={slot.isFull}>
                                            {slot.time} {slot.isFull ? '(ممتلئ)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center">
                        <input id="notifications" type="checkbox" checked={agreedToNotifications} onChange={e => setAgreedToNotifications(e.target.checked)} className="h-4 w-4 text-fuchsia-600 border-gray-300 rounded focus:ring-fuchsia-500" />
                        <label htmlFor="notifications" className="mr-2 block text-sm text-gray-900 dark:text-gray-300">أوافق على تلقي إشعارات عبر SMS/WhatsApp.</label>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-3 rounded-lg space-y-2">
                            <p>{error}</p>
                            {duplicateMobile && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const existingBooking = findActiveBookingByMobile(duplicateMobile);
                                        if (existingBooking) {
                                            onBookingSuccess(existingBooking);
                                        }
                                    }}
                                    className="font-semibold underline hover:text-red-700 dark:hover:text-red-300"
                                >
                                    استعراض الحجز الحالي
                                </button>
                            )}
                        </div>
                    )}
                    
                    <button
                        type="submit"
                        disabled={!!dateError || isSuccess}
                        className={`w-full text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-lg flex items-center justify-center ${
                            isSuccess 
                                ? 'bg-green-500 cursor-default' 
                                : 'bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-fuchsia-300 dark:disabled:bg-fuchsia-800 disabled:cursor-not-allowed'
                        }`}
                    >
                        {isSuccess ? (
                            <span className="flex items-center justify-center gap-2">
                                <CheckCircleIcon className="h-6 w-6" />
                                تم الحجز بنجاح!
                            </span>
                        ) : (
                            bookingType === BookingType.WAITLIST ? 'الانضمام الآن' : 'تأكيد الحجز'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default BookingForm;