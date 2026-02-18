/**
 * Email Utility for Backend
 * Provides comprehensive email sending functions using EmailJS and Nodemailer
 * Handles password reset emails, welcome emails, and notifications
 */
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
export declare const isEmailConfigured: () => boolean;
/**
 * Log EmailJS configuration status (without exposing secrets)
 */
export declare const logEmailConfigStatus: () => void;
/**
 * Generate a secure random token
 */
export declare const generateSecureToken: (length?: number) => string;
/**
 * Send password reset email
 * @param email - Recipient email address
 * @param token - Password reset token
 * @param frontendUrl - Optional custom frontend URL
 */
export declare const sendResetEmail: (email: string, token: string, frontendUrl?: string) => Promise<EmailResult>;
/**
 * Send welcome email to new users
 * @param email - Recipient email address
 * @param username - User's username
 */
export declare const sendWelcomeEmail: (email: string, username: string) => Promise<EmailResult>;
/**
 * Send verification email
 * @param email - Recipient email address
 * @param verificationToken - Email verification token
 * @param username - User's username
 */
export declare const sendVerificationEmail: (email: string, verificationToken: string, username: string) => Promise<EmailResult>;
/**
 * Send notification email
 * @param email - Recipient email address
 * @param subject - Email subject
 * @param message - Email message body
 * @param username - Optional username for personalization
 */
export declare const sendNotificationEmail: (email: string, subject: string, message: string, username?: string) => Promise<EmailResult>;
/**
 * Send email using Nodemailer (fallback/alternative)
 * This uses Ethereal Email for testing or real SMTP in production
 */
export declare const sendEmailWithNodemailer: (to: string, subject: string, html: string, text?: string) => Promise<EmailResult>;
/**
 * Send custom email with template
 */
export declare const sendCustomEmail: (options: SendEmailOptions) => Promise<EmailResult>;
export declare const emailService: {
    sendResetEmail: (email: string, token: string, frontendUrl?: string) => Promise<EmailResult>;
    sendWelcomeEmail: (email: string, username: string) => Promise<EmailResult>;
    sendVerificationEmail: (email: string, verificationToken: string, username: string) => Promise<EmailResult>;
    sendNotificationEmail: (email: string, subject: string, message: string, username?: string) => Promise<EmailResult>;
    sendCustomEmail: (options: SendEmailOptions) => Promise<EmailResult>;
    sendEmailWithNodemailer: (to: string, subject: string, html: string, text?: string) => Promise<EmailResult>;
    generateSecureToken: (length?: number) => string;
    isEmailConfigured: () => boolean;
    logEmailConfigStatus: () => void;
};
export default emailService;
//# sourceMappingURL=email.d.ts.map