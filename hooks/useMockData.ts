//
// Note: This is a partial update. The user's prompt will be used to generate the full content of the file.
//
import { useState, useCallback, useEffect } from 'react';
import { Booking, Branch, User, Settings, Role, BookingStatus, BookingType, SeatingArea } from '../types';
import { sendSms, sendWhatsAppViaKarzoun } from '../services/smsService';

// Helper to generate a short unique ID
// const generateId = () => Math.random().toString(36).substr(2, 5).toUpperCase();

const initialBranches: Branch[] = [
    {
        id: 'branch1',
        name: 'فرع العليا',
        location: 'الرياض، حي العليا',
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80',
        googleMapsUrl: 'https://maps.app.goo.gl/uJGr2uK2X5zB3Z2P9',
        reviewUrl: 'https://maps.app.goo.gl/uJGr2uK2X5zB3Z2P9',
        isWaitlistEnabled: true,
        waitlistOpeningTime: '01:00 PM',
        waitlistClosingTime: '11:00 PM',
        isAppointmentEnabled: true,
        appointmentSettings: {
            availableSlots: [
                { time: '06:00 PM', capacity: 5 },
                { time: '07:00 PM', capacity: 5 },
                { time: '08:00 PM', capacity: 3 },
                { time: '09:00 PM', capacity: 8 },
            ],
            availableDays: [4, 5, 6] // Thu, Fri, Sat
        }
    },
    {
        id: 'branch2',
        name: 'فرع التحلية',
        location: 'جدة، شارع التحلية',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80',
        googleMapsUrl: 'https://maps.app.goo.gl/uJGr2uK2X5zB3Z2P9',
        reviewUrl: 'https://maps.app.goo.gl/uJGr2uK2X5zB3Z2P9',
        isWaitlistEnabled: true,
        waitlistOpeningTime: '12:00 PM',
        waitlistClosingTime: '10:00 PM',
        isAppointmentEnabled: false,
        appointmentSettings: {
            availableSlots: [],
            availableDays: []
        }
    },
];

const initialUsers: User[] = [
    { id: 'user1', name: 'مدير عام', mobile: '+966512345678', password: 'password', role: Role.ADMIN, branchId: 'all' },
    { id: 'user2', name: 'موظف العليا', mobile: '+966511111111', password: 'password', role: Role.STAFF, branchId: 'branch1' },
    { id: 'user3', name: 'موظف التحلية', mobile: '+966522222222', password: 'password', role: Role.STAFF, branchId: 'branch2' },
];

const sharedTemplates = {
    bookingConfirmation: 'عميلنا {customerName}، تم تأكيد حجزك رقم {bookingId} في {branchName}. شكراً لاختيارك {restaurantName}.',
    turnReminder: 'عميلنا {customerName}، اقترب دورك! رقم حجزك هو {bookingId} وأمامك الآن شخص واحد فقط في قائمة الانتظار في {branchName}.',
    bookingSeated: 'أهلاً بك {customerName}! سعداء بخدمتك في {branchName}.',
    bookingCancelled: 'عميلنا {customerName}، نأسف لإبلاغك بأنه تم إلغاء حجزك رقم {bookingId} في {branchName}.',
    customerCall: 'عميلنا العزيز {customerName}، نرجو التوجه إلى موظف الاستقبال الآن. نحن في انتظارك في {branchName}.',
    postVisitFeedback: 'شكراً لزيارتكم {restaurantName}! يسعدنا تقييمكم لنا على الرابط: {reviewLink} لأي ملاحظات، يمكنكم التواصل معنا مباشرة: {whatsappLink}',
};

const initialSettings: Settings = {
    restaurantName: 'مطعمي',
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448609.png',
    whatsappNumber: '+966500000000',
    customerUi: {
        welcomeMessage: 'أهلاً بك في مطعمي',
        maxGuests: 10,
        bookingEnabled: true,
        showSeatingArea: true,
    },
    appearance: {
        primaryColor: '#c026d3',
        secondaryColor: '#db2777',
    },
    notifications: {
        msegat: {
            enabled: false,
            userName: '',
            apiKey: '',
            userSender: '',
            templates: { ...sharedTemplates }
        },
        karzoun: {
            enabled: false,
            appkey: '',
            authkey: '',
            templates: { ...sharedTemplates }
        },
        remindWhenQueuePositionIs: 2,
    }
};


export const useMockData = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [branches, setBranches] = useState<Branch[]>(initialBranches);
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [settings, setSettings] = useState<Settings>(initialSettings);
    const [servingNumber, setServingNumber] = useState<{ [key: string]: string }>({ 'branch1': '---', 'branch2': '---' });
    const [bookingCounters, setBookingCounters] = useState({ waitlist: 0, appointment: 0 });

    const sendNotification = useCallback(async (
        booking: Booking,
        templateName: keyof Settings['notifications']['msegat']['templates'],
        currentBookingsState: Booking[],
        customMessage?: string
    ) => {
        const { msegat, karzoun } = settings.notifications;
        if ((!msegat.enabled && !karzoun.enabled) || !booking.agreedToNotifications) {
            return;
        }
        
        const branch = branches.find(b => b.id === booking.branchId);
        if (!branch) return;

        const waitlistQueue = currentBookingsState
            .filter(b => b.branchId === booking.branchId && b.bookingType === BookingType.WAITLIST && b.status === BookingStatus.WAITING)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const positionInQueue = waitlistQueue.findIndex(b => b.id === booking.id) + 1;

        const replacements: { [key: string]: string | number } = {
            '{customerName}': booking.name,
            '{bookingId}': booking.id,
            '{branchName}': branch.name,
            '{restaurantName}': settings.restaurantName,
            '{queuePosition}': positionInQueue > 0 ? positionInQueue : '-',
            '{waitTime}': booking.estimatedWaitTime || '...',
            '{reviewLink}': branch.reviewUrl || '',
            '{whatsappLink}': settings.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace('+', '')}` : ''
        };
        
        const replacePlaceholders = (template: string) => {
             return Object.entries(replacements).reduce((acc, [key, value]) => {
                return acc.replace(new RegExp(key, 'g'), String(value));
            }, template);
        }

        if (msegat.enabled) {
            const smsTemplate = customMessage ?? msegat.templates[templateName];
            const smsMessage = replacePlaceholders(smsTemplate);
            await sendSms(msegat, booking.mobile, smsMessage);
        }
        if (karzoun.enabled) {
            const whatsappTemplate = customMessage ?? karzoun.templates[templateName];
            const whatsappMessage = replacePlaceholders(whatsappTemplate);
            await sendWhatsAppViaKarzoun(karzoun, booking.mobile, whatsappMessage);
        }

    }, [settings, branches]);


    const addBooking = useCallback((bookingData: Omit<Booking, 'id' | 'createdAt' | 'status'>): Booking | null => {
        // Prevent duplicate bookings based on type
        if (bookingData.bookingType === BookingType.WAITLIST) {
            const existingWaitlist = bookings.find(b =>
                b.mobile === bookingData.mobile &&
                b.bookingType === BookingType.WAITLIST &&
                [BookingStatus.WAITING, BookingStatus.SEATED].includes(b.status)
            );
            if (existingWaitlist) {
                console.error("Duplicate active waitlist booking attempt for mobile:", bookingData.mobile);
                return null;
            }
        } else if (bookingData.bookingType === BookingType.APPOINTMENT) {
            const bookingDateStr = new Date(bookingData.appointmentDate!).toDateString();
            const existingAppointment = bookings.find(b =>
                b.mobile === bookingData.mobile &&
                b.bookingType === BookingType.APPOINTMENT &&
                b.status === BookingStatus.CONFIRMED &&
                b.appointmentDate && (new Date(b.appointmentDate).toDateString() === bookingDateStr)
            );
            if (existingAppointment) {
                console.error("Duplicate appointment for this day for mobile:", bookingData.mobile);
                return null;
            }
        }

        // Generate new sequential ID based on type
        let newId: string;
        if (bookingData.bookingType === BookingType.WAITLIST) {
            const nextWaitlistNumber = bookingCounters.waitlist + 1;
            newId = `${String(nextWaitlistNumber).padStart(3, '0')}`;
            setBookingCounters(prev => ({ ...prev, waitlist: nextWaitlistNumber }));
        } else { // APPOINTMENT
            const nextAppointmentNumber = bookingCounters.appointment + 1;
            newId = `A0${nextAppointmentNumber}`;
            setBookingCounters(prev => ({ ...prev, appointment: nextAppointmentNumber }));
        }

        const newBooking: Booking = {
            ...bookingData,
            id: newId,
            createdAt: new Date(),
            status: bookingData.bookingType === BookingType.APPOINTMENT ? BookingStatus.CONFIRMED : BookingStatus.WAITING,
        };
        const updatedBookings = [...bookings, newBooking];
        setBookings(updatedBookings);
        
        sendNotification(newBooking, 'bookingConfirmation', updatedBookings);

        return newBooking;
    }, [bookings, bookingCounters, sendNotification]);
    
    const updateBooking = useCallback((bookingId: string, updates: Partial<Booking>) => {
        setBookings(prevBookings => {
            let notificationBooking: Booking | null = null;
            let notificationType: keyof Settings['notifications']['msegat']['templates'] | null = null;
            let shouldCheckReminders = false;
            let originalBranchId = '';
            
            let updatedBookings = prevBookings.map(b => {
                 if (b.id === bookingId) {
                    const originalStatus = b.status;
                    let updated: Booking = { ...b, ...updates };
                    originalBranchId = b.branchId;

                    if (updates.status === BookingStatus.SEATED) {
                        updated.seatedAt = new Date();
                        notificationBooking = updated;
                        notificationType = 'bookingSeated';
                        shouldCheckReminders = true;

                    } else if (updates.status === BookingStatus.COMPLETED && originalStatus === BookingStatus.SEATED && b.seatedAt) {
                        const completedAt = new Date();
                        const seatedAt = new Date(b.seatedAt);
                        const duration = (completedAt.getTime() - seatedAt.getTime()) / 60000;
                        updated.completedAt = completedAt;
                        updated.visitDurationMinutes = Math.round(duration);
                        
                        notificationBooking = updated;
                        notificationType = 'postVisitFeedback';
                        shouldCheckReminders = true;

                    } else if (updates.status === BookingStatus.CANCELLED) {
                        notificationBooking = updated;
                        notificationType = 'bookingCancelled';
                        shouldCheckReminders = true;
                    }
                    return updated;
                }
                return b;
            });

            if (notificationBooking && notificationType) {
                sendNotification(notificationBooking, notificationType, updatedBookings);
            }

            if (shouldCheckReminders && originalBranchId) {
                const waitlist = updatedBookings
                    .filter(b => b.branchId === originalBranchId && b.bookingType === BookingType.WAITLIST && b.status === BookingStatus.WAITING)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                
                const reminderPos = settings.notifications.remindWhenQueuePositionIs;

                if (waitlist.length >= reminderPos) {
                    const bookingToRemind = waitlist[reminderPos - 1];
                    if (bookingToRemind && !bookingToRemind.reminderSent) {
                        sendNotification(bookingToRemind, 'turnReminder', updatedBookings);
                        // Mark as sent and return the final state
                        updatedBookings = updatedBookings.map(b => 
                            b.id === bookingToRemind.id ? { ...b, reminderSent: true } : b
                        );
                    }
                }
            }
            
            if (updates.status === BookingStatus.SEATED) {
                const booking = updatedBookings.find(b => b.id === bookingId);
                if (booking) {
                    setServingNumber(prevServing => ({ ...prevServing, [booking.branchId]: booking.id }));
                }
            }
            
            return updatedBookings;
        });
    }, [sendNotification, settings.notifications.remindWhenQueuePositionIs]);

    // Auto-depart guests seated for more than 90 minutes
    useEffect(() => {
        const autoDepartInterval = setInterval(() => {
            setBookings(prevBookings => {
                const now = new Date();
                const ninetyMinutesInMillis = 90 * 60 * 1000;
                let hasChanges = false;

                const updatedBookings = prevBookings.map(booking => {
                    if (booking.status === BookingStatus.SEATED && booking.seatedAt) {
                        const seatedDuration = now.getTime() - new Date(booking.seatedAt).getTime();
                        if (seatedDuration > ninetyMinutesInMillis) {
                            hasChanges = true;
                            
                            const completedAt = new Date();
                            const seatedAt = new Date(booking.seatedAt);
                            const duration = (completedAt.getTime() - seatedAt.getTime()) / 60000;
                            
                            const completedBooking = { 
                                ...booking, 
                                status: BookingStatus.COMPLETED,
                                completedAt,
                                visitDurationMinutes: Math.round(duration)
                            };
                            
                            // Send notification right away. The `prevBookings` state is the most current available here.
                            sendNotification(completedBooking, 'postVisitFeedback', prevBookings);
                            
                            return completedBooking;
                        }
                    }
                    return booking;
                });

                if (hasChanges) {
                    console.log('Auto-departing guests seated over 90 minutes.');
                    return updatedBookings;
                }

                return prevBookings;
            });
        }, 60000); // Check every minute

        return () => clearInterval(autoDepartInterval);
    }, [sendNotification]);


    const findBookingById = useCallback((bookingId: string) => {
        return bookings.find(b => b.id === bookingId);
    }, [bookings]);

    const findActiveBookingByMobile = useCallback((mobile: string): Booking | null => {
        const activeBooking = bookings.find(b => 
            b.mobile === mobile &&
            [BookingStatus.WAITING, BookingStatus.CONFIRMED, BookingStatus.SEATED].includes(b.status)
        );
        return activeBooking || null;
    }, [bookings]);

    const currentlyServing = useCallback((branchId: string) => {
        return servingNumber[branchId] || '---';
    }, [servingNumber]);

    const addUser = useCallback((userData: Omit<User, 'id'>) => {
        const newUser: User = { ...userData, id: `user${users.length + 1}` };
        setUsers(prev => [...prev, newUser]);
        return newUser;
    }, [users.length]);

    const addBranch = useCallback((branchData: Omit<Branch, 'id'>) => {
        const newBranch: Branch = { ...branchData, id: `branch${branches.length + 1}` };
        setBranches(prev => [...prev, newBranch]);
        return newBranch;
    }, [branches.length]);

    const updateBranch = useCallback((branchId: string, updates: Partial<Branch>) => {
        setBranches(prev => prev.map(b => b.id === branchId ? { ...b, ...updates } : b));
    }, []);

    const deleteBranch = useCallback((branchId: string) => {
        setBranches(prev => prev.filter(b => b.id !== branchId));
        // Note: This mock doesn't handle cascading deletes for users or bookings associated with the branch.
    }, []);

    const sendDirectNotification = useCallback((booking: Booking, message: string) => {
        // Using 'customerCall' as a key, but the message is provided directly.
        sendNotification(booking, 'customerCall', bookings, message);
    }, [bookings, sendNotification]);

    const getAverageVisitDuration = useCallback((branchId: string): number => {
        const completedVisits = bookings.filter(b => 
            b.branchId === branchId &&
            b.status === BookingStatus.COMPLETED &&
            b.visitDurationMinutes != null
        );

        if (completedVisits.length === 0) {
            return 45; // Default/fallback average visit duration in minutes
        }

        const totalMinutes = completedVisits.reduce((sum, b) => sum + b.visitDurationMinutes!, 0);
        return totalMinutes / completedVisits.length;
    }, [bookings]);
    
    const getWaitTimeStats = useCallback((year: number, month: number | 'all', branchId: string | 'all') => {
        const relevantBookings = bookings.filter(b => {
            const isCorrectStatus = b.status === BookingStatus.COMPLETED;
            const hasWaitTime = typeof b.estimatedWaitTime === 'number' && b.estimatedWaitTime > 0;
            const isInBranch = branchId === 'all' || b.branchId === branchId;
            if (!isCorrectStatus || !hasWaitTime || !isInBranch || !b.completedAt) return false;

            const completedDate = new Date(b.completedAt);
            const isCorrectYear = completedDate.getFullYear() === year;
            const isCorrectMonth = month === 'all' || (completedDate.getMonth() + 1) === month;

            return isCorrectYear && isCorrectMonth;
        });

        if (month === 'all') { // Group by month
            const monthlyStats: { [key: number]: { totalWait: number, count: number } } = {};
            for (let i = 1; i <= 12; i++) {
                monthlyStats[i] = { totalWait: 0, count: 0 };
            }

            relevantBookings.forEach(b => {
                const bookingMonth = new Date(b.completedAt!).getMonth() + 1;
                monthlyStats[bookingMonth].totalWait += b.estimatedWaitTime!;
                monthlyStats[bookingMonth].count += 1;
            });
            
            const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return Object.entries(monthlyStats).map(([m, data]) => ({
                label: monthLabels[parseInt(m) - 1],
                value: data.count > 0 ? Math.round(data.totalWait / data.count) : 0,
            }));

        } else { // Group by day for the selected month
            const daysInMonth = new Date(year, month, 0).getDate();
            const dailyStats: { [key: number]: { totalWait: number, count: number } } = {};
            for (let i = 1; i <= daysInMonth; i++) {
                dailyStats[i] = { totalWait: 0, count: 0 };
            }
            
            relevantBookings.forEach(b => {
                const dayOfMonth = new Date(b.completedAt!).getDate();
                dailyStats[dayOfMonth].totalWait += b.estimatedWaitTime!;
                dailyStats[dayOfMonth].count += 1;
            });
            
            return Object.entries(dailyStats).map(([day, data]) => ({
                 label: String(day),
                 value: data.count > 0 ? Math.round(data.totalWait / data.count) : 0,
            }));
        }

    }, [bookings]);


    return {
        bookings,
        branches,
        users,
        settings,
        addBooking,
        updateBooking,
        findBookingById,
        findActiveBookingByMobile,
        currentlyServing,
        setSettings,
        addUser,
        addBranch,
        updateBranch,
        deleteBranch,
        sendDirectNotification,
        getAverageVisitDuration,
        getWaitTimeStats,
    };
};