"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = exports.sendResetEmail = void 0;
const googleapis_1 = require("googleapis");
const nodemailer_1 = __importDefault(require("nodemailer"));
const OAuth2 = googleapis_1.google.auth.OAuth2;
const createTransporter = async () => {
    const oauth2Client = new OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'https://developers.google.com/oauthplayground');
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
    const transporter = nodemailer_1.default.createTransport({
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
const sendResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    const msg = {
        to: email,
        from: process.env.EMAIL_USER || 'noreply@scorex.com', // Use a verified sender
        subject: 'Password Reset',
        html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    };
    const transporter = await createTransporter();
    await transporter.send(msg);
};
exports.sendResetEmail = sendResetEmail;
const sendOtpEmail = async (email, otp) => {
    try {
        console.log('Starting email send process...');
        console.log('Environment check:', {
            hasRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
            hasClientId: !!process.env.GOOGLE_CLIENT_ID,
            hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
            emailUser: process.env.EMAIL_USER
        });
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('Google OAuth configuration missing. Please set GOOGLE_REFRESH_TOKEN environment variable.');
        }
        console.log('Creating transporter...');
        const transporter = await createTransporter();
        console.log('Transporter created successfully');
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'OTP for Registration',
            html: `<p>Your OTP for registration is: <strong>${otp}</strong></p>`,
        };
        console.log('Sending email with options:', { from: mailOptions.from, to: mailOptions.to, subject: mailOptions.subject });
        const result = await transporter.sendMail(mailOptions);
        console.log(`OTP email sent successfully to ${email}, message ID: ${result.messageId}`);
        return result;
    }
    catch (error) {
        console.error('Failed to send OTP email:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        throw error;
    }
};
exports.sendOtpEmail = sendOtpEmail;
//# sourceMappingURL=email.js.map