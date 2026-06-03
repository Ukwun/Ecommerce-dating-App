const axios = require('axios');

const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL;

const sendAlert = async ({ level = 'warning', title, message, metadata = {} }) => {
  if (!ALERT_WEBHOOK_URL) return;

  const payload = {
    timestamp: new Date().toISOString(),
    level,
    title,
    message,
    metadata,
  };

  try {
    await axios.post(ALERT_WEBHOOK_URL, payload, { timeout: 8000 });
  } catch (error) {
    console.error('Alert webhook failed:', error.message);
  }
};

module.exports = {
  sendAlert,
};
