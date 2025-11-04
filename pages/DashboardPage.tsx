
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import CurrentBookings from '../components/dashboard/CurrentBookings';
import Archive from '../components/dashboard/Archive';
import Settings from '../components/dashboard/Settings';
import { CalendarDaysIcon, ArchiveBoxIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

type Tab = 'current' | 'archive' | 'settings';

const DashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('current');
    const { user } = useAuth();

    const isAdmin = user?.role === Role.ADMIN;

    const tabs = [
        { id: 'current', label: 'الحجوزات الحالية', icon: CalendarDaysIcon },
        ...(isAdmin ? [{ id: 'archive', label: 'الأرشيف', icon: ArchiveBoxIcon }] : []),
        ...(isAdmin ? [{ id: 'settings', label: 'الإعدادات', icon: Cog6ToothIcon }] : []),
    ];

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-reverse space-x-6 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as Tab)}
                                className={`${
                                    activeTab === tab.id
                                        ? 'border-fuchsia-500 text-fuchsia-600 dark:text-fuchsia-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
                                } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200`}
                            >
                                <tab.icon className="-ml-0.5 mr-2 h-5 w-5" aria-hidden="true" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <div>
                {activeTab === 'current' && <CurrentBookings />}
                {activeTab === 'archive' && isAdmin && <Archive />}
                {activeTab === 'settings' && isAdmin && <Settings />}
            </div>
        </div>
    );
};

export default DashboardPage;
