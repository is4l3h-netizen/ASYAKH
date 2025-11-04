import React from 'react';
import { Branch, BookingType } from '../../types';
import { ChevronLeftIcon, ClockIcon, CalendarDaysIcon, MapPinIcon } from '@heroicons/react/24/solid';

interface BranchSelectorProps {
    branches: Branch[];
    onSelect: (branch: Branch) => void;
    selectedBranch: Branch | null;
    onBookingTypeSelect: (type: BookingType) => void;
    onBack: () => void;
    welcomeMessage: string;
}

const BranchCard: React.FC<{ branch: Branch; onSelect: () => void }> = ({ branch, onSelect }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col">
        <div onClick={onSelect} className="cursor-pointer">
            <img src={branch.imageUrl} alt={branch.name} className="w-full h-40 object-cover" />
            <div className="p-4">
                <h3 className="font-bold text-lg">{branch.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{branch.location}</p>
            </div>
        </div>
        <div className="mt-auto p-4 pt-0 flex flex-col gap-2">
            <button
                onClick={onSelect}
                className="w-full text-center font-bold bg-fuchsia-600 text-white hover:bg-fuchsia-700 rounded-lg py-2.5 transition-colors shadow"
            >
                ابدأ الحجز في الفرع
            </button>
            {branch.googleMapsUrl && (
                <a
                    href={branch.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center justify-center gap-2 w-full text-center text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 rounded-lg py-2 transition-colors"
                >
                    <MapPinIcon className="h-4 w-4" />
                    <span>زيارة الفرع عبر الخرائط</span>
                </a>
            )}
        </div>
    </div>
);

const isWaitlistOpenNow = (branch: Branch): boolean => {
    const { waitlistOpeningTime, waitlistClosingTime } = branch;
    if (!waitlistOpeningTime || !waitlistClosingTime) {
        return true; // Always open if not specified
    }
    try {
        const parseTime = (timeStr: string): Date => {
            const now = new Date();
            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':').map(Number);
            if (modifier.toUpperCase() === 'PM' && hours < 12) {
                hours += 12;
            }
            if (modifier.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
            now.setHours(hours, minutes, 0, 0);
            return now;
        };

        const now = new Date();
        const openingTime = parseTime(waitlistOpeningTime);
        const closingTime = parseTime(waitlistClosingTime);

        // Handle overnight case (e.g., opens 10 PM, closes 2 AM)
        if (closingTime < openingTime) {
            return now >= openingTime || now < closingTime;
        } else {
            return now >= openingTime && now < closingTime;
        }
    } catch (e) {
        console.error("Error parsing waitlist times", e);
        return false; // Fail safe
    }
};


const BookingTypeSelector: React.FC<{ branch: Branch, onSelect: (type: BookingType) => void, onBack: () => void }> = ({ branch, onSelect, onBack }) => {
    const waitlistOpen = isWaitlistOpenNow(branch);
    
    return (
        <div className="max-w-md mx-auto">
            <button onClick={onBack} className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4">
                <ChevronLeftIcon className="h-5 w-5 transform rotate-180" />
                <span className="mr-1">اختر فرع آخر</span>
            </button>
            <div className="text-center mb-6">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                    اختر نوع الحجز
                    <span className="block w-24 h-1 bg-fuchsia-500 mx-auto mt-2"></span>
                </h2>
                <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">في فرع {branch.name}</p>
            </div>

            <div className="space-y-4">
                {branch.isWaitlistEnabled && (
                    <button 
                        onClick={() => onSelect(BookingType.WAITLIST)}
                        disabled={!waitlistOpen}
                        className="w-full text-right flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800"
                    >
                        <ClockIcon className="h-10 w-10 text-fuchsia-500 ml-5" />
                        <div>
                            <h3 className="font-bold text-lg">الانضمام لقائمة الانتظار</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {waitlistOpen
                                    ? 'احصل على دورك الآن وانضم للطابور مباشرة.'
                                    : `الطابور مغلق حاليًا. يفتح من ${branch.waitlistOpeningTime} إلى ${branch.waitlistClosingTime}.`
                                }
                            </p>
                        </div>
                    </button>
                )}
                {branch.isAppointmentEnabled && (
                    <button onClick={() => onSelect(BookingType.APPOINTMENT)} className="w-full text-right flex items-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300">
                        <CalendarDaysIcon className="h-10 w-10 text-pink-500 ml-5" />
                        <div>
                            <h3 className="font-bold text-lg">حجز موعد محدد</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">اختر يوماً ووقتاً يناسبك لزيارتنا.</p>
                        </div>
                    </button>
                )}
                {!branch.isWaitlistEnabled && !branch.isAppointmentEnabled && (
                    <div className="text-center p-6 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                        <p className="font-semibold">عذراً, الحجوزات غير متاحة حالياً في هذا الفرع.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ branches, onSelect, selectedBranch, onBookingTypeSelect, onBack, welcomeMessage }) => {
    if (selectedBranch) {
        return <BookingTypeSelector branch={selectedBranch} onSelect={onBookingTypeSelect} onBack={onBack} />;
    }

    return (
        <div>
            <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    {welcomeMessage}
                    <span className="block w-32 h-1 bg-fuchsia-500 mx-auto mt-2"></span>
                </h1>
                <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">اختر الفرع الأقرب إليك</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.map(branch => (
                    <BranchCard key={branch.id} branch={branch} onSelect={() => onSelect(branch)} />
                ))}
            </div>
        </div>
    );
};

export default BranchSelector;
