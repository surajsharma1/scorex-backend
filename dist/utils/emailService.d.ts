interface EmailOptions {
    email: string;
    subject: string;
    message: string;
}
/**
 * Send email with proper timeout and fallback handling
 */
declare const sendEmail: (options: EmailOptions) => Promise<void>;
export default sendEmail;
//# sourceMappingURL=emailService.d.ts.map