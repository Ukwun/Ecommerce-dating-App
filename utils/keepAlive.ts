// Keep-Alive Service for Render Free Tier Backend
// Prevents backend from sleeping by pinging health endpoint every 14 minutes

import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = 'https://ecommerce-dating-app.onrender.com';
const KEEP_ALIVE_INTERVAL = 14 * 60 * 1000; // 14 minutes
const STORAGE_KEY = 'last_keep_alive_ping';

let keepAliveInterval: ReturnType<typeof setInterval> | null = null;

export const startKeepAliveService = () => {
  if (keepAliveInterval) return; // Already running
  
  console.log('🔌 Starting Keep-Alive Service for Render backend...');
  
  // First ping immediately
  pingBackend();
  
  // Then ping every 14 minutes
  keepAliveInterval = setInterval(() => {
    pingBackend();
  }, KEEP_ALIVE_INTERVAL);
};

export const stopKeepAliveService = () => {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log('🔌 Keep-Alive Service stopped');
  }
};

const pingBackend = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEY, timestamp);
    
    console.log(`✅ Backend Keep-Alive Ping: ${response.status === 200 ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.warn('⚠️ Keep-Alive Ping failed (this is OK - backend may be temporarily unavailable):', error);
  }
};

// Get last ping time for debugging
export const getLastKeepAlivePing = async (): Promise<string | null> => {
  return await AsyncStorage.getItem(STORAGE_KEY);
};
