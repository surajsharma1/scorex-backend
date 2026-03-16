"use strict";
/**
 * Email Utility for Backend
 * Provides comprehensive email sending functions using EmailJS and Nodemailer
 * Handles password reset emails, welcome emails, and notifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.sendCustomEmail = exports.sendEmailWithNodemailer = exports.sendNotificationEmail = exports.sendVerificationEmail = exports.sendWelcomeEmail = exports.sendResetEmail = exports.generateSecureToken = exports.logEmailConfigStatus = exports.isEmailConfigured = void 0;
const emailjs_1 = __importDefault(require("emailjs"));
// EmailJS configuration
const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID || 'service_jo73hp8';
const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID || 'template_m83jjye';
const EMAILJS_PUBLIC_KEY = process.env.EMAILJS_PUBLIC_KEY || 'iAe2zwL5rU5RyQ-XY';
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
// Email template IDs
const TEMPLATES = {
    PASSWORD_RESET: process.env.EMAILJS_PASSWORD_RESET_TEMPLATE_ID || 'template_password_reset',
    WELCOME: process.env.EMAILJS_WELCOME_TEMPLATE_ID || 'template_welcome',
    NOTIFICATION: process.env.EMAILJS_NOTIFICATION_TEMPLATE_ID || 'template_notification',
    VERIFICATION: process.env.EMAILJS_VERIFICATION_TEMPLATE_ID || 'template_verification',
};
/**
 * Check if EmailJS is properly configured
 */
const isEmailConfigured = () => {
    return !!(EMAILJS_SERVICE_ID &&
        EMAILJS_SERVICE_ID !== 'your_service_id' &&
        EMAILJS_PUBLIC_KEY);
};
exports.isEmailConfigured = isEmailConfigured;
/**
 * Log EmailJS configuration status (without exposing secrets)
 */
const logEmailConfigStatus = () => {
    console.log('EmailJS Configuration Status:', {
        serviceId: !!EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id',
        templateId: !!EMAILJS_TEMPLATE_ID,
        publicKey: !!EMAILJS_PUBLIC_KEY,
        privateKey: !!EMAILJS_PRIVATE_KEY,
        environment: process.env.NODE_ENV || 'development',
    });
};
exports.logEmailConfigStatus = logEmailConfigStatus;
/**
 * Generate a secure random token
 */
const generateSecureToken = (length = 32) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};
exports.generateSecureToken = generateSecureToken;
/**
 * Get frontend URL from environment or use default
 */
const getFrontendUrl = () => {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
};
/**
 * Send email using EmailJS
 */
const sendEmailViaEmailJS = async (templateId, params) => {
    try {
        const result = await emailjs_1.default.send(EMAILJS_SERVICE_ID, templateId, params, EMAILJS_PUBLIC_KEY);
        return {
            success: true,
            message: 'Email sent successfully',
            data: result,
            status: result.status || 200,
        };
    }
    catch (error) {
        console.error('EmailJS send error:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email',
        };
    }
};
/**
 * Send password reset email
 * @param email - Recipient email address
 * @param token - Password reset token
 * @param frontendUrl - Optional custom frontend URL
 */
const sendResetEmail = async (email, token, frontendUrl) => {
    try {
        console.log(`Sending password reset email to ${email}...`);
        const resetUrl = `${frontendUrl || getFrontendUrl()}/reset-password/${token}`;
        // Check if EmailJS is configured
        if (!(0, exports.isEmailConfigured)()) {
            console.warn('EmailJS is not configured. Returning mock success for development.');
            console.warn(`Password reset URL for ${email}: ${resetUrl}`);
            return {
                success: true,
                message: `Password reset URL: ${resetUrl} (Development mode)`,
                status: 200,
            };
        }
        const templateParams = {
            to_email: email,
            reset_url: resetUrl,
            resetToken: token,
            to_name: email.split('@')[0],
            timestamp: new Date().toLocaleString(),
        };
        const result = await sendEmailViaEmailJS(TEMPLATES.PASSWORD_RESET, templateParams);
        if (result.success) {
            console.log(`Password reset email sent successfully to ${email}`);
        }
        return result;
    }
    catch (error) {
        console.error('Failed to send password reset email:', error);
        if (process.env.NODE_ENV === 'development') {
            const resetUrl = `${frontendUrl || getFrontendUrl()}/reset-password/${token}`;
            return {
                success: true,
                message: `Password reset URL (dev): ${resetUrl}`,
                status: 200,
            };
        }
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send password reset email',
        };
    }
};
exports.sendResetEmail = sendResetEmail;
/**
 * Send welcome email to new users
 * @param email - Recipient email address
 * @param username - User's username
 */
const sendWelcomeEmail = async (email, username) => {
    try {
        console.log(`Sending welcome email to ${email}...`);
        // Check if EmailJS is configured
        if (!(0, exports.isEmailConfigured)()) {
            console.warn('EmailJS is not configured. Returning mock success for development.');
            return {
                success: true,
                message: `Welcome email would be sent to ${email} (Development mode)`,
                status: 200,
            };
        }
        const templateParams = {
            to_email: email,
            to_name: username,
            username: username,
            from_name: 'ScoreX Team',
            timestamp: new Date().toLocaleString(),
        };
        const result = await sendEmailViaEmailJS(TEMPLATES.WELCOME, templateParams);
        if (result.success) {
            console.log(`Welcome email sent successfully to ${email}`);
        }
        return result;
    }
    catch (error) {
        console.error('Failed to send welcome email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send welcome email',
        };
    }
};
exports.sendWelcomeEmail = sendWelcomeEmail;
/**
 * Send verification email
 * @param email - Recipient email address
 * @param verificationToken - Email verification token
 * @param username - User's username
 */
const sendVerificationEmail = async (email, verificationToken, username) => {
    try {
        console.log(`Sending verification email to ${email}...`);
        const verificationUrl = `${getFrontendUrl()}/verify-email/${verificationToken}`;
        // Check if EmailJS is configured
        if (!(0, exports.isEmailConfigured)()) {
            console.warn('EmailJS is not configured. Returning mock success for development.');
            return {
                success: true,
                message: `Verification URL (dev): ${verificationUrl}`,
                status: 200,
            };
        }
        const templateParams = {
            to_email: email,
            to_name: username,
            username: username,
            verificationUrl: verificationUrl,
            timestamp: new Date().toLocaleString(),
        };
        const result = await sendEmailViaEmailJS(TEMPLATES.VERIFICATION, templateParams);
        if (result.success) {
            console.log(`Verification email sent successfully to ${email}`);
        }
        return result;
    }
    catch (error) {
        console.error('Failed to send verification email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send verification email',
        };
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
/**
 * Send notification email
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param message - Email message body
 * @param username - Optional username for personalization
 */
const sendNotificationEmail = async (email, subject, message, username) => {
    try {
        console.log(`Sending notification email to ${email}...`);
        // Check if EmailJS is configured
        if (!(0, exports.isEmailConfigured)()) {
            console.warn('EmailJS is not configured. Returning mock success for development.');
            return {
                success: true,
                message: `Notification would be sent to ${email} (Development mode)`,
                status: 200,
            };
        }
        const templateParams = {
            to_email: email,
            to_name: username || email.split('@')[0],
            subject: subject,
            message: message,
            timestamp: new Date().toLocaleString(),
        };
        const result = await sendEmailViaEmailJS(TEMPLATES.NOTIFICATION, templateParams);
        if (result.success) {
            console.log(`Notification email sent successfully to ${email}`);
        }
        return result;
    }
    catch (error) {
        console.error('Failed to send notification email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send notification email',
        };
    }
};
exports.sendNotificationEmail = sendNotificationEmail;
/**
 * Send email using Nodemailer (fallback/alternative)
 * This uses Ethereal Email for testing or real SMTP in production
 */
const sendEmailWithNodemailer = async (to, subject, html, text) => {
    try {
        const nodemailer = require('nodemailer');
        // Create transporter - use environment variables for production
        let transporter;
        if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
            // Production SMTP configuration
            transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        }
        else {
            // Development - use Ethereal test account
            const testAccount = await nodemailer.createTestAccount();
            transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
        }
        const info = await transporter.sendMail({
            from: `"ScoreX" <${process.env.SMTP_FROM_EMAIL || 'noreply@scorex.com'}>`,
            to: to,
            subject: subject,
            text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
            html: html,
        });
        console.log('Message sent: %s', info.messageId);
        // Preview URL for Ethereal (development only)
        if (info.messageId && !process.env.SMTP_HOST) {
            const previewUrl = nodemailer.getTestMessageUrl(info);
            console.log('Preview URL: %s', previewUrl);
        }
        return {
            success: true,
            message: 'Email sent successfully',
            data: { messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl(info) },
            status: 200,
        };
    }
    catch (error) {
        console.error('Failed to send email with Nodemailer:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send email',
        };
    }
};
exports.sendEmailWithNodemailer = sendEmailWithNodemailer;
/**
 * Send custom email with template
 */
const sendCustomEmail = async (options) => {
    try {
        console.log(`Sending custom email to ${options.to}...`);
        if (!(0, exports.isEmailConfigured)()) {
            return {
                success: true,
                message: `Email would be sent to ${options.to} (Development mode)`,
                status: 200,
            };
        }
        const result = await sendEmailViaEmailJS(options.templateId, options.params);
        return result;
    }
    catch (error) {
        console.error('Failed to send custom email:', error);
        return {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send custom email',
        };
    }
};
exports.sendCustomEmail = sendCustomEmail;
// Export all email functions as a single service object
exports.emailService = {
    // Core functions
    sendResetEmail: exports.sendResetEmail,
    sendWelcomeEmail: exports.sendWelcomeEmail,
    sendVerificationEmail: exports.sendVerificationEmail,
    sendNotificationEmail: exports.sendNotificationEmail,
    sendCustomEmail: exports.sendCustomEmail,
    sendEmailWithNodemailer: exports.sendEmailWithNodemailer,
    // Utility functions
    generateSecureToken: exports.generateSecureToken,
    isEmailConfigured: exports.isEmailConfigured,
    logEmailConfigStatus: exports.logEmailConfigStatus,
};
exports.default = exports.emailService;
