import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
}

/**
 * Check if email credentials are configured
 */
const isEmailConfigured = (): boolean => {
  const emailUsername = process.env.EMAIL_USERNAME;
  const emailAppPassword = process.env.EMAIL_APP_PASSWORD;
  return !!(emailUsername && emailAppPassword && 
            emailUsername !== 'your_email@gmail.com' && 
            emailAppPassword !== 'your_app_password');
};

/**
 * Send email with proper timeout and fallback handling
 */
const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Check if email is configured
  if (!isEmailConfigured()) {
    // In development or if not configured, log the email content and return success
    console.log('='.repeat(50));
    console.log('EMAIL (Development Mode - Not Actually Sent)');
    console.log('='.repeat(50));
    console.log(`To: ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Message: ${options.message.substring(0, 200)}...`);
    console.log('='.repeat(50));
    
    // In development mode, we'll still return success to allow testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Email would be sent to ${options.email}`);
      return;
    }
    
    // In production without credentials, throw a clear error
    throw new Error('Email service not configured. Please set EMAIL_USERNAME and EMAIL_APP_PASSWORD environment variables.');
  }

  // 1. Create a Transporter with timeout settings
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_APP_PASSWORD
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  } as nodemailer.TransportOptions);

  // 2. Define Email Options
  const mailOptions = {
    from: `ScoreX Team <${process.env.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.message, // We use HTML for better styling
  };

  // 3. Send Email with timeout handling
  try {
    // Use Promise.race to implement timeout
    const sendPromise = transporter.sendMail(mailOptions);
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Email send timed out after 30 seconds. Please try again later.'));
      }, 30000);
    });
    
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`Email sent successfully to ${options.email}`);
  } catch (error: any) {
    console.error('Error sending email:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('timed out')) {
      throw new Error('Email service is taking too long. Please try again.');
    }
    
    if (error.code === 'EAUTH') {
      throw new Error('Email authentication failed. Please check your EMAIL_APP_PASSWORD.');
    }
    
    if (error.code === 'ENOTFOUND') {
      throw new Error('Email service unreachable. Please check your network connection.');
    }
    
    throw new Error('Failed to send OTP email. Please try again.');
  }
};

export default sendEmail;
