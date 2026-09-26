import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/utils/axiosinstance';
import Toast from 'react-native-toast-message';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string | {
        id: string;
        file_id: string;
        url: string;
    } | null;
    isPremium?: boolean;
    emailVerified?: boolean;
    roles?: {
        buyer: boolean;
        seller: { status: string; businessName?: string } | null;
        admin: { role: string; permissions: string[] } | null;
    };
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
            // Restoring a local session must never be held hostage by the network.
            // The previous implementation awaited `/auth/api/me` here. That request
            // has a 90s timeout and retry middleware, which left Android on the
            // launch screen for minutes whenever the API was cold or unreachable.
            const readStoredUser = async () => {
                const userString = await SecureStore.getItemAsync('user');
                return userString ? JSON.parse(userString) : null;
            };

            try {
                const cachedUser = await readStoredUser();
                if (cachedUser) {
                    setUser(cachedUser);
                }
            } catch (e) {
                console.error("Failed to load user from storage", e);
            } finally {
                setIsLoading(false);
            }

            // Revalidate in the background. A valid cached session can enter the
            // app immediately; an explicitly rejected token still signs out.
            // Network failures leave the cached session intact so transient API
            // outages cannot make a real user appear logged out.
            void axiosInstance.get('/auth/api/me')
                .then(async (response) => {
                    if (!response.data?.user) return;
                    setUser(response.data.user);
                    await SecureStore.setItemAsync('user', JSON.stringify(response.data.user));
                })
                .catch((error: any) => {
                    if (error?.response?.status === 401 || error?.response?.status === 403) {
                        setUser(null);
                        void SecureStore.deleteItemAsync('user');
                    }
                });
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
                            if (response.data.refreshToken) await SecureStore.setItemAsync('refresh_token', response.data.refreshToken);
                            
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

    // Keep backend awake by pinging health endpoint every 15 minutes when user is logged in
    useEffect(() => {
        if (!user) return;

        const keepAliveInterval = setInterval(async () => {
            try {
                await axiosInstance.get('/health');
                console.log('✅ Backend keep-alive ping successful');
            } catch (error) {
                console.log('⚠️ Keep-alive ping failed (backend may be sleeping):', error instanceof Error ? error.message : 'Unknown error');
            }
        }, 15 * 60 * 1000); // 15 minutes

        return () => clearInterval(keepAliveInterval);
    }, [user]);

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
            
            // Ping backend immediately to wake it up
            setTimeout(() => {
                axiosInstance.get('/health').catch(() => {
                    console.log('⚠️ Initial wake-up ping sent to backend');
                });
            }, 500);
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
                if (response.data.refreshToken) await SecureStore.setItemAsync('refresh_token', response.data.refreshToken);
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
