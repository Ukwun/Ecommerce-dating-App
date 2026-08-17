const sendResendEmail = require('./resendEmail');

const sendEmail = ({ email, subject, message, html, idempotencyKey }) =>
  sendResendEmail({ to: email, subject, text: message, html, idempotencyKey });

module.exports = sendEmail;
