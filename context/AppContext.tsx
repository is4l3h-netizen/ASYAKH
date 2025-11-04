
import React, { createContext, useContext, ReactNode } from 'react';
import { useMockData } from '../hooks/useMockData';
import { Booking, Branch, User, Settings } from '../types';

type AppContextType = ReturnType<typeof useMockData>;

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const mockData = useMockData();

    return (
        <AppContext.Provider value={mockData}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};
