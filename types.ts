// Fix: Defined and exported all required enums and interfaces.
export enum Role {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
}

export enum BookingStatus {
    WAITING = 'WAITING',
    CONFIRMED = 'CONFIRMED',
    SEATED = 'SEATED',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    NO_SHOW = 'NO_SHOW',
}

export enum BookingType {
    WAITLIST = 'WAITLIST',
    APPOINTMENT = 'APPOINTMENT',
}

export enum SeatingArea {
    ANY = 'ANY',
    INDOOR = 'INDOOR',
    OUTDOOR = 'OUTDOOR',
}

export interface Branch {
    id: string;
    name: string;
    location: string;
    imageUrl: string;
    googleMapsUrl?: string;
    reviewUrl?: string;
    isWaitlistEnabled: boolean;
    waitlistOpeningTime: string;
    waitlistClosingTime: string;
    isAppointmentEnabled: boolean;
    appointmentSettings: {
        availableSlots: { time: string; capacity: number }[];
        availableDays: number[];
    };
}

export interface User {
    id: string;
    name: string;
    mobile: string;
    password?: string;
    role: Role;
    branchId: string | 'all';
}

export interface NotificationTemplates {
    bookingConfirmation: string;
    turnReminder: string;
    bookingSeated: string;
    bookingCancelled: string;
    customerCall: string;
    postVisitFeedback: string;
}

export interface Settings {
    restaurantName: string;
    logoUrl: string;
    whatsappNumber: string;
    customerUi: {
        welcomeMessage: string;
        maxGuests: number;
        bookingEnabled: boolean;
        showSeatingArea: boolean;
    };
    appearance: {
        primaryColor: string;
        secondaryColor: string;
    };
    notifications: {
        msegat: {
            enabled: boolean;
            userName: string;
            apiKey: string;
            userSender: string;
            templates: NotificationTemplates;
        };
        karzoun: {
            enabled: boolean;
            appkey: string;
            authkey: string;
            templates: NotificationTemplates;
        };
        remindWhenQueuePositionIs: number;
    };
}

export interface Booking {
    id: string;
    createdAt: Date;
    status: BookingStatus;
    branchId: string;
    bookingType: BookingType;
    name: string;
    mobile: string;
    guests: number;
    seatingArea: SeatingArea;
    agreedToNotifications: boolean;
    appointmentDate?: Date;
    appointmentTime?: string;
    estimatedWaitTime?: number;
    reminderSent?: boolean;
    seatedAt?: Date;
    completedAt?: Date;
    visitDurationMinutes?: number;
}

export interface WaitTimeContext {
    queueAhead: Booking[];
    branch: Branch;
    currentTime: Date;
    averageVisitDuration: number;
}