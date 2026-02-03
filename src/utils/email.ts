import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendResetEmail = async (email: string, token: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
  });
};

export const sendOtpEmail = async (email: string, otp: string) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'OTP for Registration',
    html: `<p>Your OTP for registration is: <strong>${otp}</strong></p>`,
  });
};
