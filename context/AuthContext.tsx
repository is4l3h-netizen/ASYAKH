import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';
import { useApp } from './AppContext';

interface AuthContextType {
    user: User | null;
    login: (mobile: string, password?: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const { users } = useApp();

    const login = (mobile: string, password?: string): boolean => {
        // Normalize mobile number from local format (e.g., 05...) to international (+966...) for comparison
        const normalizedMobile = mobile.startsWith('05') ? `+966${mobile.substring(1)}` : mobile;
        
        const foundUser = users.find(u => u.mobile === normalizedMobile && u.password === password);
        if (foundUser) {
            setUser(foundUser);
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};