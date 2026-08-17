const sendResendEmail = require('./resendEmail');

const sendEmail = (to, subject, text, html) =>
  sendResendEmail({ to, subject, text, html });

module.exports = { sendEmail };
