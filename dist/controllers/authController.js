"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.googleCallback = exports.resetPassword = exports.forgotPassword = exports.logout = exports.completeGoogleProfile = exports.storePendingGoogleProfile = exports.changePassword = exports.getMe = exports.login = exports.register = exports.checkEmail = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const dns_1 = __importDefault(require("dns"));
const util_1 = require("util");
const User_1 = __importDefault(require("../models/User"));
const emailService_1 = __importDefault(require("../utils/emailService"));
const signToken = (id) => jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const resolveMx = (0, util_1.promisify)(dns_1.default.resolveMx);
// In-memory reset token store (token → {userId, expiresAt})
const resetTokens = new Map();
// Blocklist of known disposable / throwaway email providers
const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'guerrillamail.biz', 'guerrillamail.de', 'guerrillamail.info', 'guerrillamailblock.com',
    'grr.la', 'sharklasers.com', 'guerrillamailblock.com', 'spam4.me',
    'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'dispostable.com',
    'throwam.com', 'throwam.net', 'throwaway.email', 'trashmail.com', 'trashmail.at',
    'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org', 'trashmail.xyz',
    'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf', 'nospam.ze.tc',
    'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr', 'courriel.fr.nf', 'moncourrier.fr.nf',
    'monemail.fr.nf', 'monmail.fr.nf', 'fakeinbox.com', 'fakeinbox.net',
    'maildrop.cc', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
    'mailnesia.com', 'mailnull.com', 'spambox.us', 'spambox.info', 'discard.email',
    'boun.cr', 'mailexpire.com', 'spamfree24.org', 'mailzilla.com', 'spamfree.eu',
    '33mail.com', 'spamherelots.com', 'spamhere.eu', 'spamhereplease.com',
    'filzmail.com', 'spam.la', 'thankyou2010.com', 'thanks2010.com',
    'ihateyoualot.info', 'haltospam.com', 'trashdevil.com', 'trashdevil.de',
    'objectmail.com', 'proxymail.eu', 'rklips.com', 'rpbnc.com', 'safe-mail.net',
    'safetymail.info', 'mailnew.com', 'mailtemp.net', 'jetable.com', 'jetable.net',
    'jetable.org', 'nospamfor.us', 'no-spam.ws', 'hasanmail.ml', 'spamdecoy.net',
    'spamfree24.de', 'spamfree24.eu', 'spamfree24.info', 'spamfree24.net',
    'spamfree24.org', 'spamfree24.com', 'spaminmotion.com', 'spamoff.de',
    'spamslicer.com', 'spamspot.com', 'spamusers.com', 'tempinbox.com',
    'tempomail.fr', 'temporaryemail.net', 'temporaryforwarding.com', 'temporaryinbox.com',
    'tempr.email', 'throwam.com', 'tmail.io', 'tmail.ws', 'throwam.net',
    'getairmail.com', 'inoutmail.de', 'inoutmail.eu', 'inoutmail.info', 'inoutmail.net',
    'mailbucket.org', 'dispostable.com', 'spamgourmet.com',
    'maildrop.cc', 'deadaddress.com', 'filzmail.com'
]);
async function isEmailDomainValid(email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain)
        return false;
    // Block known disposable domains
    if (DISPOSABLE_DOMAINS.has(domain))
        return false;
    // Block obviously fake patterns like random chars + common tlds
    if (/^[a-z0-9]{1,4}\.(ml|gq|cf|tk|ga)$/.test(domain))
        return false;
    try {
        const mx = await resolveMx(domain);
        return mx && mx.length > 0;
    }
    catch {
        return false;
    }
}
const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email || typeof email !== 'string')
            return res.status(400).json({ success: false, valid: false });
        const isValid = await isEmailDomainValid(email.trim().toLowerCase());
        res.json({ success: true, valid: isValid });
    }
    catch {
        res.json({ success: true, valid: false });
    }
};
exports.checkEmail = checkEmail;
const register = async (_req, res) => {
    // Manual email registration is disabled — email cannot be verified without sending a confirmation link.
    // All new accounts must go through Google OAuth (/api/v1/auth/google) which guarantees a real, verified email.
    return res.status(403).json({
        success: false,
        message: 'Direct registration is disabled. Please sign up using Google to verify your email.',
        redirectTo: '/register',
    });
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password || '')))
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        user.lastLogin = new Date();
        await user.save();
        const token = signToken(user._id.toString());
        res.json({ success: true, token, data: { token, user: { _id: user._id, id: user._id, username: user.username, email: user.email, role: user.role, membershipLevel: user.membershipLevel, fullName: user.fullName } } });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id);
        res.json({ success: true, data: user });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMe = getMe;
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        if (newPassword.length < 6)
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
        const user = await User_1.default.findById(req.user._id).select('+password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        if (!user.password)
            return res.status(400).json({ success: false, message: 'Cannot change password for OAuth accounts' });
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch)
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        user.password = newPassword;
        await user.save();
        res.json({ success: true, message: 'Password changed successfully' });
    }
    catch {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.changePassword = changePassword;
// Pending Google profiles: tempToken → profile data (expires 10 min)
const pendingGoogleProfiles = new Map();
const storePendingGoogleProfile = (profile) => {
    const tempToken = crypto_1.default.randomBytes(32).toString('hex');
    pendingGoogleProfiles.set(tempToken, { ...profile, expiresAt: Date.now() + 10 * 60 * 1000 });
    return tempToken;
};
exports.storePendingGoogleProfile = storePendingGoogleProfile;
const completeGoogleProfile = async (req, res, next) => {
    try {
        const { tempToken, username, password } = req.body;
        if (!tempToken || !username || !password) {
            return res.status(400).json({ success: false, message: 'tempToken, username and password are required' });
        }
        if (username.trim().length < 3)
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        const pending = pendingGoogleProfiles.get(tempToken);
        if (!pending)
            return res.status(400).json({ success: false, message: 'Invalid or expired session. Please sign in with Google again.' });
        if (Date.now() > pending.expiresAt) {
            pendingGoogleProfiles.delete(tempToken);
            return res.status(400).json({ success: false, message: 'Session expired. Please sign in with Google again.' });
        }
        // Check username uniqueness
        const existingUsername = await User_1.default.findOne({ username: username.trim() });
        if (existingUsername)
            return res.status(400).json({ success: false, message: 'Username already taken. Please choose another.' });
        // Check if a user already exists with this googleId / email
        let user = await User_1.default.findOne({ $or: [{ googleId: pending.googleId }, { email: pending.email }] });
        if (user) {
            // Account exists but they went through complete-profile again — just update and log in
            user.googleId = pending.googleId;
            if (!user.password)
                user.password = password;
            await user.save();
        }
        else {
            user = await User_1.default.create({
                googleId: pending.googleId,
                email: pending.email,
                username: username.trim(),
                fullName: pending.fullName,
                password,
                verified: true,
            });
            const { sendSavedNotificationsToUser } = await Promise.resolve().then(() => __importStar(require('./adminController')));
            sendSavedNotificationsToUser(user._id).catch(() => { });
        }
        pendingGoogleProfiles.delete(tempToken);
        const token = signToken(user._id.toString());
        res.status(201).json({ success: true, token, data: { token, user: { _id: user._id, id: user._id, username: user.username, email: user.email, role: user.role, membershipLevel: user.membershipLevel } } });
    }
    catch (error) {
        next(error);
    }
};
exports.completeGoogleProfile = completeGoogleProfile;
const logout = (_req, res) => res.json({ success: true, message: 'Logged out' });
exports.logout = logout;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ success: false, message: 'Email is required' });
        const OK = { success: true, message: 'If an account with that email exists, a password reset link has been sent.' };
        const user = await User_1.default.findOne({ email: email.toLowerCase().trim() });
        if (!user || !user.password)
            return res.json(OK); // silently skip OAuth/non-existent
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour
        resetTokens.set(resetToken, { userId: user._id.toString(), expiresAt });
        const frontendUrl = (process.env.FRONTEND_URL || 'https://scorex.vercel.app').replace(/\/$/, '');
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
        const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1117;color:#e6edf3;padding:32px;border-radius:12px;">
        <h1 style="color:#22c55e;text-align:center;">⚡ ScoreX</h1>
        <h2>Password Reset Request</h2>
        <p style="color:#8b949e;">Hi <strong style="color:#e6edf3">${user.username}</strong>, click the button below to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#10b981);color:#000;font-weight:bold;padding:14px 28px;border-radius:8px;text-decoration:none;margin:16px 0;">Reset My Password</a>
        <p style="color:#8b949e;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
        <hr style="border:none;border-top:1px solid #21262d;margin:24px 0;"/>
        <p style="color:#6e7681;font-size:12px;">ScoreX Cricket Scoring Platform</p>
      </div>`;
        try {
            await (0, emailService_1.default)({ email: user.email, subject: 'ScoreX — Password Reset Link', message: html });
        }
        catch (emailErr) {
            resetTokens.delete(resetToken);
            return res.status(500).json({ success: false, message: 'Failed to send reset email. Please try again later.' });
        }
        res.json(OK);
    }
    catch (err) {
        console.error('forgotPassword error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        if (!password || password.length < 6)
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        const record = resetTokens.get(token);
        if (!record)
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        if (Date.now() > record.expiresAt) {
            resetTokens.delete(token);
            return res.status(400).json({ success: false, message: 'Reset token has expired. Please request a new one.' });
        }
        const user = await User_1.default.findById(record.userId);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.password = password;
        await user.save();
        resetTokens.delete(token);
        res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
    }
    catch (err) {
        console.error('resetPassword error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.resetPassword = resetPassword;
const getFrontendUrl = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '');
const googleCallback = (req, res) => {
    if (!req.user?._id)
        return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
    const token = signToken(req.user._id.toString());
    const frontendUrl = req.query.state
        ? decodeURIComponent(req.query.state).replace(/\/$/, '')
        : getFrontendUrl();
    res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
};
exports.googleCallback = googleCallback;
const githubCallback = (req, res) => {
    if (!req.user?._id)
        return res.redirect(`${getFrontendUrl()}/login?error=oauth_failed`);
    const token = signToken(req.user._id.toString());
    res.redirect(`${getFrontendUrl()}/oauth/callback?token=${token}`);
};
exports.githubCallback = githubCallback;
exports.default = { register: exports.register, login: exports.login, getMe: exports.getMe, changePassword: exports.changePassword, logout: exports.logout, forgotPassword: exports.forgotPassword, resetPassword: exports.resetPassword, googleCallback: exports.googleCallback, githubCallback: exports.githubCallback, completeGoogleProfile: exports.completeGoogleProfile, storePendingGoogleProfile: exports.storePendingGoogleProfile, checkEmail: exports.checkEmail };
