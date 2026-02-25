const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // 1. Create Transporter
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // or 'Outlook', 'Yahoo'
    auth: {
      user: process.env.EMAIL_USERNAME, // Your email (e.g., scorex@gmail.com)
      pass: process.env.EMAIL_APP_PASSWORD // Your App Password (Not your login password!)
    }
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `ScoreX Team <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  // 3. Send Email
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;