/**
 * Email Utility for Backend
 * Provides comprehensive email sending functions using EmailJS and Nodemailer
 * Handles password reset emails, welcome emails, and notifications
 */

import emailjs from 'emailjs';

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

// Type definitions
export interface EmailParams {
  to_email: string;
  to_name?: string;
  reset_url?: string;
  resetToken?: string;
  verificationUrl?: string;
  message?: string;
  subject?: string;
  from_name?: string;
  from_email?: string;
  timestamp?: string;
  user_email?: string;
  username?: string;
  [key: string]: string | undefined;
}

export interface EmailResult {
  success: boolean;
  message: string;
  data?: unknown;
  status?: number;
}

export interface SendEmailOptions {
  to: string;
  templateId: string;
  params: EmailParams;
}

export interface PasswordResetOptions {
  email: string;
  resetToken: string;
  frontendUrl?: string;
}

export interface WelcomeEmailOptions {
  email: string;
  username: string;
}

export interface NotificationEmailOptions {
  email: string;
  subject: string;
  message: string;
  username?: string;
}

/**
 * Check if EmailJS is properly configured
 */
export const isEmailConfigured = (): boolean => {
  return !!(
    EMAILJS_SERVICE_ID && 
    EMAILJS_SERVICE_ID !== 'your_service_id' &&
    EMAILJS_PUBLIC_KEY
  );
};

/**
 * Log EmailJS configuration status (without exposing secrets)
 */
export const logEmailConfigStatus = (): void => {
  console.log('EmailJS Configuration Status:', {
    serviceId: !!EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id',
    templateId: !!EMAILJS_TEMPLATE_ID,
    publicKey: !!EMAILJS_PUBLIC_KEY,
    privateKey: !!EMAILJS_PRIVATE_KEY,
    environment: process.env.NODE_ENV || 'development',
  });
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

/**
 * Get frontend URL from environment or use default
 */
const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

/**
 * Send email using EmailJS
 */
const sendEmailViaEmailJS = async (
  templateId: string,
  params: EmailParams
): Promise<EmailResult> => {
  try {
    const result = await (emailjs as any).send(
      EMAILJS_SERVICE_ID,
      templateId,
      params,
      EMAILJS_PUBLIC_KEY
    );

    return {
      success: true,
      message: 'Email sent successfully',
      data: result,
      status: result.status || 200,
    };
  } catch (error) {
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
export const sendResetEmail = async (
  email: string, 
  token: string,
  frontendUrl?: string
): Promise<EmailResult> => {
  try {
    console.log(`Sending password reset email to ${email}...`);
    
    const resetUrl = `${frontendUrl || getFrontendUrl()}/reset-password/${token}`;
    
    // Check if EmailJS is configured
    if (!isEmailConfigured()) {
      console.warn('EmailJS is not configured. Returning mock success for development.');
      console.warn(`Password reset URL for ${email}: ${resetUrl}`);
      return {
        success: true,
        message: `Password reset URL: ${resetUrl} (Development mode)`,
        status: 200,
      };
    }

    const templateParams: EmailParams = {
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
  } catch (error) {
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

/**
 * Send welcome email to new users
 * @param email - Recipient email address
 * @param username - User's username
 */
export const sendWelcomeEmail = async (
  email: string, 
  username: string
): Promise<EmailResult> => {
  try {
    console.log(`Sending welcome email to ${email}...`);
    
    // Check if EmailJS is configured
    if (!isEmailConfigured()) {
      console.warn('EmailJS is not configured. Returning mock success for development.');
      return {
        success: true,
        message: `Welcome email would be sent to ${email} (Development mode)`,
        status: 200,
      };
    }

    const templateParams: EmailParams = {
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
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send welcome email',
    };
  }
};

/**
 * Send verification email
 * @param email - Recipient email address
 * @param verificationToken - Email verification token
 * @param username - User's username
 */
export const sendVerificationEmail = async (
  email: string,
  verificationToken: string,
  username: string
): Promise<EmailResult> => {
  try {
    console.log(`Sending verification email to ${email}...`);
    
    const verificationUrl = `${getFrontendUrl()}/verify-email/${verificationToken}`;
    
    // Check if EmailJS is configured
    if (!isEmailConfigured()) {
      console.warn('EmailJS is not configured. Returning mock success for development.');
      return {
        success: true,
        message: `Verification URL (dev): ${verificationUrl}`,
        status: 200,
      };
    }

    const templateParams: EmailParams = {
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
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send verification email',
    };
  }
};

/**
 * Send notification email
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param message - Email message body
 * @param username - Optional username for personalization
 */
export const sendNotificationEmail = async (
  email: string,
  subject: string,
  message: string,
  username?: string
): Promise<EmailResult> => {
  try {
    console.log(`Sending notification email to ${email}...`);
    
    // Check if EmailJS is configured
    if (!isEmailConfigured()) {
      console.warn('EmailJS is not configured. Returning mock success for development.');
      return {
        success: true,
        message: `Notification would be sent to ${email} (Development mode)`,
        status: 200,
      };
    }

    const templateParams: EmailParams = {
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
  } catch (error) {
    console.error('Failed to send notification email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send notification email',
    };
  }
};

/**
 * Send email using Nodemailer (fallback/alternative)
 * This uses Ethereal Email for testing or real SMTP in production
 */
export const sendEmailWithNodemailer = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> => {
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
    } else {
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
  } catch (error) {
    console.error('Failed to send email with Nodemailer:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
};

/**
 * Send custom email with template
 */
export const sendCustomEmail = async (
  options: SendEmailOptions
): Promise<EmailResult> => {
  try {
    console.log(`Sending custom email to ${options.to}...`);
    
    if (!isEmailConfigured()) {
      return {
        success: true,
        message: `Email would be sent to ${options.to} (Development mode)`,
        status: 200,
      };
    }

    const result = await sendEmailViaEmailJS(options.templateId, options.params);
    return result;
  } catch (error) {
    console.error('Failed to send custom email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send custom email',
    };
  }
};

// Export all email functions as a single service object
export const emailService = {
  // Core functions
  sendResetEmail,
  sendWelcomeEmail,
  sendVerificationEmail,
  sendNotificationEmail,
  sendCustomEmail,
  sendEmailWithNodemailer,
  
  // Utility functions
  generateSecureToken,
  isEmailConfigured,
  logEmailConfigStatus,
};

export default emailService;
