// eslint-disable-next-line @typescript-eslint/no-var-requires
const emailjs = require('emailjs');

const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_jo73hp8';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_m83jjye';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'iAe2zwL5rU5RyQ-XY';

interface EmailParams {
  to_email: string;
  otp?: string;
  reset_url?: string;
  to_name?: string;
}

export const sendResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
  try {
    const templateParams: EmailParams = {
      to_email: email,
      reset_url: resetUrl,
      to_name: email.split('@')[0],
    };

    const result = await (emailjs as any).send(
      EMAILJS_SERVICE_ID,
      'your_password_reset_template_id', // Create a separate template for password reset
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log(`Password reset email sent successfully to ${email}`);
    return result;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

export const sendOtpEmail = async (email: string, otp: string) => {
  try {
    console.log('Starting EmailJS OTP send process...');
    console.log('Environment check:', {
      hasServiceId: !!process.env.EMAILJS_SERVICE_ID,
      hasTemplateId: !!process.env.EMAILJS_TEMPLATE_ID,
      hasPublicKey: !!process.env.EMAILJS_PUBLIC_KEY,
    });

    // If EmailJS is not configured, log a warning and simulate success
    if (!process.env.EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID === 'your_service_id') {
      console.warn('EmailJS is not configured. Please set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY environment variables.');
      console.warn(`OTP for ${email} is: ${otp} (simulated - email not actually sent)`);
      // Return a mock success response for development
      return { status: 200, text: 'Simulated success' };
    }

    const timeString = new Date().toLocaleString();
    const templateParams: any = {
      to_email: email,
      passcode: otp,
      time: timeString,
      to_name: email.split('@')[0],
    };

    const result = await (emailjs as any).send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log(`OTP email sent successfully to ${email}, status:`, result.status);
    return result;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      name: (error as Error).name
    });
    throw error;
  }
};

// Alternative: Send email using nodemailer as fallback
// This uses the existing nodemailer setup if EmailJS fails
export const sendEmailWithNodemailer = async (to: string, subject: string, html: string) => {
  const nodemailer = require('nodemailer');
  
  // Create a test account (for development only)
  // In production, use real SMTP credentials
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const info = await transporter.sendMail({
    from: '"ScoreX" <noreply@scorex.com>',
    to: to,
    subject: subject,
    html: html,
  });

  console.log('Message sent: %s', info.messageId);
  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  
  return info;
};
