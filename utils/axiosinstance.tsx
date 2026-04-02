import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform, Alert } from 'react-native';
import { CustomAxiosRequestConfig } from "./axiosinstance.types";

// Determine backend URL based on environment
const envBase = process.env.EXPO_PUBLIC_SERVER_URI;
let resolvedBase = envBase;

if (!resolvedBase) {
    // Use the live Render backend for all platforms
    resolvedBase = 'https://ecommerce-dating-app.onrender.com';
}

console.log('🔌 Backend URL configured:', resolvedBase);

const axiosInstance = axios.create({
    baseURL: resolvedBase,
    withCredentials: false, // Disable cookies for React Native
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

const getRefreshToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync("refresh_token");
    } catch (error) {
        console.error("Error getting refresh token:", error);
        return null;
    }
};

// Get stored access token
const getAccessToken = async (): Promise<string | null> => {
    try {
        return await SecureStore.getItemAsync("access_token");
    }   catch (error) {
        console.error("Error getting access token:", error);
        return null;
    }
};


// Store access token
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
    try {
        await SecureStore.setItemAsync("access_token", accessToken);
        if (refreshToken) await SecureStore.setItemAsync("refresh_token", refreshToken);
    }   catch (error) {
        console.error("Error storing tokens:", error);
    }
};

// Remove access token
export const removeAccessToken = async (): Promise<void> => {
    try {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
    }   catch (error) {
        console.error("Error removing access token:", error);
    }
};

const handleLogout = () => {
    // This should trigger a global logout state change
    console.log("Logging out due to token refresh failure.");
};

// Queue failed requests while refreshing
const subscribeTokenrefresh = (callback: () => void) => {
    refreshSubscribers.push(callback);
};

const onRefreshSuccess = () => {
    refreshSubscribers.forEach((callback) => callback());
    refreshSubscribers = [];
};

// Request interceptor
axiosInstance.interceptors.request.use(
    async (config) => {
        // Add authorization header if token exists
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for handling token refresh
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        // If error is not 401, or it's a token refresh request itself, reject
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (!isRefreshing) {
            isRefreshing = true;
            originalRequest._retry = true; // Mark request to avoid infinite loops

            try {
                const refreshToken = await getRefreshToken();
                if (!refreshToken) {
                    handleLogout();
                    return Promise.reject(error);
                }

                // Make the call to your refresh token endpoint
                const { data } = await axios.post(`${resolvedBase}/auth/api/refresh-token`, { refreshToken });
                const { accessToken: newAccessToken } = data;

                await storeTokens(newAccessToken);
                axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                
                onRefreshSuccess(); // Retry all queued requests
                
                // Retry the original request with the new token
                const headers = originalRequest.headers ?? {};
                (headers as any).Authorization = `Bearer ${newAccessToken}`;
                originalRequest.headers = headers;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                handleLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Queue the failed request until the token is refreshed
        return new Promise((resolve) => {
            subscribeTokenrefresh(() => {
                resolve(axiosInstance(originalRequest));
            });
        });
    }
);

// Health check function to verify backend connectivity
export const checkBackendHealth = async (): Promise<{ status: 'ok' | 'error'; message: string; url?: string }> => {
    try {
        console.log('🔍 Checking backend health at:', resolvedBase);
        const response = await axios.get(`${resolvedBase}/health`, {
            timeout: 5000,
        });
        console.log('✅ Backend health check passed:', response.data);
        return { status: 'ok', message: 'Backend is reachable', url: resolvedBase };
    } catch (error: any) {
        console.error('❌ Backend health check failed:', error.message);
        const errorMsg = error.message || 'Unknown error';
        const details = error.code || error.errno || 'No code';
        return {
            status: 'error',
            message: `Cannot reach backend at ${resolvedBase}. Error: ${errorMsg} (${details}). Make sure: 1) Both phone and computer are on same WiFi, 2) Windows Firewall allows port 8082, 3) Backend is running.`,
            url: resolvedBase
        };
    }
};

export default axiosInstance;
