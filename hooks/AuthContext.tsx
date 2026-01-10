import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: {
        id: string;
        file_id: string;
        url: string;
    }
}

interface AuthContextType {
    user: User | null;
    login: (userData: User, accessToken: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (newUserData: Partial<User>) => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userString = await SecureStore.getItemAsync('user');
                if (userString) {
                    setUser(JSON.parse(userString));
                }
            } catch (e) {
                console.error("Failed to load user from storage", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadUser();
    }, []);

    const login = async (userData: User, accessToken: string, refreshToken?: string) => {
        try {
            setUser(userData);
            const promises = [
                SecureStore.setItemAsync('user', JSON.stringify(userData)),
                SecureStore.setItemAsync('access_token', accessToken),
            ];
            if (refreshToken) promises.push(SecureStore.setItemAsync('refresh_token', refreshToken));
            await Promise.all(promises);
            console.log('✅ User login stored successfully:', userData.email);
        } catch (error) {
            console.error('❌ Error storing login data:', error);
            // Still set user state even if storage fails
            setUser(userData);
            throw error;
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            await Promise.all([
                SecureStore.deleteItemAsync('user'),
                SecureStore.deleteItemAsync('access_token')
            ]);
            // Clear React Query cache on logout
            queryClient.clear();
            console.log('✅ User logged out successfully');
        } catch (error) {
            console.error('❌ Error during logout:', error);
            // Still clear state and cache even if storage deletion fails
            setUser(null);
            queryClient.clear();
        }
    };

    const updateUser = async (newUserData: Partial<User>) => {
        if (!user) return;
        const updatedUser = { ...user, ...newUserData };
        setUser(updatedUser);
        await SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
