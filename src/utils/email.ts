import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        reject('Failed to create access token');
      }
      resolve(token);
    });
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
  });

  return transporter;
};

export const sendResetEmail = async (email: string, token: string) => {
  const transporter = await createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });
};

export const sendOtpEmail = async (email: string, otp: string) => {
  try {
    if (!process.env.GOOGLE_REFRESH_TOKEN) {
      throw new Error('Google OAuth configuration missing. Please set GOOGLE_REFRESH_TOKEN environment variable.');
    }

    const transporter = await createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'OTP for Registration',
      html: `<p>Your OTP for registration is: <strong>${otp}</strong></p>`,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}, message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    throw error;
  }
};
