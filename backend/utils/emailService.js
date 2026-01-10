const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, text) => {
  // Configure your email provider here
  // For Gmail, use an App Password if 2FA is enabled on the account
  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };