const axios = require('axios');
const crypto = require('crypto');

const sendResendEmail = async ({ to, subject, text, html, idempotencyKey }) => {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    const error = new Error('Email delivery is not configured');
    error.code = 'EMAIL_NOT_CONFIGURED';
    throw error;
  }
  const response = await axios.post('https://api.resend.com/emails', {
    from: process.env.RESEND_FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
  }, {
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey || crypto.randomUUID(),
    },
    timeout: 15000,
  });
  return response.data;
};

module.exports = sendResendEmail;
