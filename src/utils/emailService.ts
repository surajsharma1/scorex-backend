import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  // 1. Create a Transporter
  const transporter = nodemailer.createTransport({
    service: 'Gmail', // Works for Gmail. For others, look up "Nodemailer host settings"
    auth: {
      user: process.env.EMAIL_USERNAME, // Set this in your .env file
      pass: process.env.EMAIL_APP_PASSWORD // Generate this in Google Account > Security > App Passwords
    }
  });

  // 2. Define Email Options
  const mailOptions = {
    from: `ScoreX Team <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.message, // We use HTML for better styling
  };

  // 3. Send Email
  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

export default sendEmail;