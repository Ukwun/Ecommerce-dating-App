import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';
import { CustomAxiosRequestConfig } from "./axiosinstance.types";

const getExpoLanBackendBase = (): string | null => {
    try {
        const hostUri = (Constants.expoConfig as any)?.hostUri;
        if (!hostUri) return null;

        const host = String(hostUri).split(':')[0];
        const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
        if (!isIp) return null;

        return `http://${host}:8082`;
    } catch {
        return null;
    }
};

// Determine backend URL based on environment and current Expo LAN host.
// In dev, prefer the active Expo LAN host so phone testing keeps working if local IP changes.
// PRODUCTION READY: For 6 clients across cities, we MUST use the public Render URL.
// Use environment variable or default to production backend
const DEFAULT_BACKEND_URL = 'https://ecommerce-dating-app.onrender.com';
let resolvedBase = process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL;

// During local development only, we attempt to find the local machine IP
// DISABLED: MongoDB Atlas connection issues, using Render backend instead
// if (__DEV__ && !process.env.EXPO_PUBLIC_BACKEND_URL) {
//     const lanBase = getExpoLanBackendBase();
//     if (lanBase) resolvedBase = lanBase;
// }

console.log('🔌 [NETWORK] Current Base URL:', resolvedBase);

const axiosInstance = axios.create({
    baseURL: resolvedBase,
    withCredentials: false,
    timeout: 90000, // Increased to 90s for Render free tier cold starts
});

// Retry logic for network requests (handles Render backend wake-up)
const retryCount = new Map<string, number>();
const MAX_RETRIES = 2;

const getRetryCount = (url: string): number => retryCount.get(url) || 0;
const incrementRetryCount = (url: string): number => {
    const newCount = (getRetryCount(url) || 0) + 1;
    retryCount.set(url, newCount);
    return newCount;
};
const resetRetryCount = (url: string): boolean => retryCount.delete(url);

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

const getRefreshToken = async (): Promise<string | null> => {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem("refresh_token");
        }
        return await SecureStore.getItemAsync("refresh_token");
    } catch (error) {
        console.error("Error getting refresh token:", error);
        return null;
    }
};

// Get stored access token
const getAccessToken = async (): Promise<string | null> => {
    try {
        if (Platform.OS === 'web') {
            return localStorage.getItem("access_token");
        }
        return await SecureStore.getItemAsync("access_token");
    }   catch (error) {
        console.error("Error getting access token:", error);
        return null;
    }
};


// Store access token
export const storeTokens = async (accessToken: string, refreshToken?: string): Promise<void> => {
    try {
        // REALISM: Guard against undefined values which crash Expo Go native modules
        if (!accessToken) {
            console.warn("Attempted to store an empty access token. Aborting to prevent crash.");
            return;
        }

        if (Platform.OS === 'web') {
            localStorage.setItem("access_token", accessToken);
            if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        } else {
            await SecureStore.setItemAsync("access_token", accessToken);
            if (refreshToken) await SecureStore.setItemAsync("refresh_token", refreshToken);
        }
    }   catch (error) {
        console.error("Error storing tokens:", error);
    }
};

// Remove access token
export const removeAccessToken = async (): Promise<void> => {
    try {
        if (Platform.OS === 'web') {
            localStorage.removeItem("access_token");
            localStorage.removeItem("refresh_token");
        } else {
            await SecureStore.deleteItemAsync("access_token");
            await SecureStore.deleteItemAsync("refresh_token");
        }
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
        console.log('📤 [AXIOS REQUEST]', config.method?.toUpperCase(), config.url);
        // Add authorization header if token exists
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('📤 [AXIOS] Authorization header added');
        }
        return config;
    },
    (error) => {
        console.error('📤 [AXIOS REQUEST ERROR]', error);
        return Promise.reject(error);
    }
);

// Response interceptor for handling token refresh & retries
axiosInstance.interceptors.response.use(
    (response) => {
        // Reset retry count on success
        if (response.config?.url) {
            resetRetryCount(response.config.url);
        }
        return response;
    },
    async (error) => {
        // REAL-WORLD FEEDBACK: Distinguish between timeouts, cold starts, and absolute network failure
        const url = error.config?.url || 'unknown';
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const isNetworkError = !error.response && error.code !== 'ECONNABORTED';
        
        console.error(`🌐 [NETWORK ERROR] ${error.message} on path: ${url} (timeout: ${isTimeout}, network: ${isNetworkError})`);

        // Retry logic for timeout/network errors (max 2 retries)
        if ((isTimeout || isNetworkError) && error.config && getRetryCount(url) < MAX_RETRIES) {
            incrementRetryCount(url);
            const retryNum = getRetryCount(url);
            const delayMs = Math.pow(2, retryNum) * 1000; // Exponential backoff: 2s, 4s
            
            console.log(`🔄 Retry attempt ${retryNum} for ${url} (waiting ${delayMs}ms for Render to wake up)...`);
            
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(axiosInstance(error.config));
                }, delayMs);
            });
        }

        if (isTimeout || isNetworkError) {
            resetRetryCount(url);
            const isRender = resolvedBase.includes('onrender.com');
            const msg = isRender 
                ? "Server timeout (Render may be waking up from sleep). Please:\n1. Wait 30 seconds\n2. Check your WiFi/data\n3. Try again\n\nIf it persists, contact support@marketplace.app"
                : "The server is unreachable. Please check your internet connection.";
            
            console.warn(`⚠️ [${isRender ? 'RENDER' : 'NETWORK'}] Connection failed after retries`);
            return Promise.reject(new Error(msg));
        }

        const originalRequest = error.config as CustomAxiosRequestConfig;

        // REALISM: Do NOT attempt refresh if the failed request was a login/signup attempt
        const isAuthRequest = originalRequest.url?.includes('/login') || 
                             originalRequest.url?.includes('/user-registration') ||
                             originalRequest.url?.includes('/google-login');

        if (error.response?.status !== 401 || originalRequest._retry || isAuthRequest) {
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
                // Corrected path to match your mounting logic
                const response = await axios.post(`${resolvedBase}/auth/api/refresh-token`, { refreshToken });
                
                if (response.data && response.data.accessToken) {
                    const newAccessToken = response.data.accessToken;
                    await storeTokens(newAccessToken, response.data.refreshToken);
                    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
                    onRefreshSuccess();
                    
                    const headers = originalRequest.headers ?? {};
                    (headers as any).Authorization = `Bearer ${newAccessToken}`;
                    originalRequest.headers = headers;
                    return axiosInstance(originalRequest);
                }

                throw new Error("Invalid token refresh response");
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
        // Using the health endpoint - matches server.js route
        const response = await axios.get(`${resolvedBase}/health`, {
            timeout: 4000,
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

// Keep-alive pinger for Render free tier (prevents 15-min sleep)
export const startBackendKeepAlive = (): (() => void) => {
    const interval = setInterval(async () => {
        try {
            await checkBackendHealth();
        } catch (error) {
            // Silent fail - don't spam logs during normal operation
        }
    }, 14 * 60 * 1000); // Ping every 14 minutes

    return () => clearInterval(interval);
};

export default axiosInstance;
