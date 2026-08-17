const axios = require('axios');

let pingInterval: ReturnType<typeof setInterval> | null = null;

const startKeepAlive = (backendUrl: string, intervalMs = 300000) => {
  // Clear any existing interval
  if (pingInterval) clearInterval(pingInterval);

  // Initial ping immediately
  pingBackend(backendUrl);

  // Then ping every 5 minutes (300000ms) to prevent Render sleep
  pingInterval = setInterval(() => {
    pingBackend(backendUrl);
  }, intervalMs);

  console.log(`✅ Keep-alive started. Pinging ${backendUrl} every ${intervalMs / 1000 / 60} minutes`);
};

const pingBackend = async (backendUrl: string) => {
  try {
    const response = await axios.get(`${backendUrl}/health`, { timeout: 5000 });
    console.log(`🔌 Keep-alive ping successful:`, response.data.message);
  } catch (error: any) {
    console.warn(`⚠️ Keep-alive ping failed: ${error.message}`);
  }
};

const stopKeepAlive = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
    console.log('🛑 Keep-alive stopped');
  }
};

module.exports = { startKeepAlive, stopKeepAlive };
