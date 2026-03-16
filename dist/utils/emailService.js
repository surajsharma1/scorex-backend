"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
/**
 * Check if email credentials are configured
 */
const isEmailConfigured = () => {
    // Support both naming conventions
    const emailUsername = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    const emailAppPassword = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
    return !!(emailUsername && emailAppPassword &&
        !emailUsername.includes('your_email') &&
        !emailAppPassword.includes('your_app'));
};
/**
 * Send email with proper timeout and fallback handling
 */
const sendEmail = async (options) => {
    // Check if email is configured
    if (!isEmailConfigured()) {
        // Use Mailtrap as fallback for testing
        console.log('='.repeat(50));
        console.log('EMAIL: Using Mailtrap (Testing Mode)');
        console.log('='.repeat(50));
        const transporter = nodemailer_1.default.createTransport({
            host: 'sandbox.smtp.mailtrap.io',
            port: 2525,
            secure: false,
            auth: {
                user: '52c6e4a72293da',
                pass: '1b1d787446fac7'
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000
        });
        const mailOptions = {
            from: `ScoreX Team <noreply@scorex.com>`,
            to: options.email,
            subject: options.subject,
            html: options.message,
        };
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email sent via Mailtrap to ${options.email}`);
        }
        catch (error) {
            console.error('Mailtrap error:', error.message);
            throw new Error('Email service unavailable. Please try again later.');
        }
        return;
    }
    // Use the correct environment variables (support both naming conventions)
    const emailUsername = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
    const emailAppPassword = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;
    console.log('Using Gmail SMTP (port 465 with SSL)...');
    // Use Gmail with port 465 (SSL) - More likely to work on cloud platforms
    const transporter = nodemailer_1.default.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // SSL
        auth: {
            user: emailUsername,
            pass: emailAppPassword
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
    });
    // Define Email Options
    const mailOptions = {
        from: `ScoreX Team <${emailUsername}>`,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };
    // Send Email with timeout handling
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
    }
    catch (error) {
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
exports.default = sendEmail;
