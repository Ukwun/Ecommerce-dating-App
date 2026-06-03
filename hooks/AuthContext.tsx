import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: {
        id: string;
        file_id: string;
        url: string;
    }
    isPremium?: boolean;
}

interface AuthContextType {
    user: User | null;
    login: (userData: User, accessToken: string, refreshToken?: string) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (newUserData: Partial<User>) => Promise<void>;
    isLoading: boolean;
    isOnline: boolean;
    refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
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

    // Setup axios interceptor for token refresh
    useEffect(() => {
        const interceptor = axiosInstance.interceptors.response.use(
            response => response,
            async error => {
                const originalRequest = error.config;

                // Handle offline errors gracefully
                if (!error.response) {
                    setIsOnline(false);
                    Toast.show({
                        type: 'error',
                        text1: 'Connection Error',
                        text2: 'Please check your internet connection',
                    });
                    return Promise.reject(error);
                }

                setIsOnline(true);

                // Handle 401 Unauthorized - try to refresh token
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    
                    try {
                        const refreshTokenStr = await SecureStore.getItemAsync('refresh_token');
                        if (!refreshTokenStr) {
                            // No refresh token, force logout
                            await logout();
                            Toast.show({
                                type: 'error',
                                text1: 'Session Expired',
                                text2: 'Please log in again',
                            });
                            return Promise.reject(error);
                        }

                        // Try to refresh the token
                        const response = await axiosInstance.post('/auth/api/refresh-token', {
                            refreshToken: refreshTokenStr,
                        });

                        if (response.data?.accessToken) {
                            await SecureStore.setItemAsync('access_token', response.data.accessToken);
                            
                            // Update the Authorization header for the retry
                            originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
                            
                            // Retry the original request
                            return axiosInstance(originalRequest);
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                        await logout();
                        Toast.show({
                            type: 'error',
                            text1: 'Session Invalid',
                            text2: 'Please log in again',
                        });
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );

        return () => axiosInstance.interceptors.response.eject(interceptor);
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
            setUser(userData);
            throw error;
        }
    };

    const refreshToken = async (): Promise<boolean> => {
        try {
            const refreshTokenStr = await SecureStore.getItemAsync('refresh_token');
            if (!refreshTokenStr) return false;

            const response = await axiosInstance.post('/auth/api/refresh-token', {
                refreshToken: refreshTokenStr,
            });

            if (response.data?.accessToken) {
                await SecureStore.setItemAsync('access_token', response.data.accessToken);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    };

    const logout = async () => {
        try {
            setUser(null);
            await Promise.all([
                SecureStore.deleteItemAsync('user'),
                SecureStore.deleteItemAsync('access_token'),
                SecureStore.deleteItemAsync('refresh_token'),
            ]);
            queryClient.clear();
            console.log('✅ User logged out successfully');
        } catch (error) {
            console.error('❌ Error during logout:', error);
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
        <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading, isOnline, refreshToken }}>
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
