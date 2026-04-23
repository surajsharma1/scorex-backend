"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.googleCallback = exports.resetPassword = exports.forgotPassword = exports.logout = exports.changePassword = exports.getMe = exports.login = exports.register = void 0;
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
async function isEmailDomainValid(email) {
    const domain = email.split('@')[1];
    if (!domain)
        return false;
    try {
        const mx = await resolveMx(domain);
        return mx && mx.length > 0;
    }
    catch {
        return false;
    }
}
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const isValidDomain = await isEmailDomainValid(email);
        if (!isValidDomain)
            return res.status(400).json({ success: false, message: 'Invalid email domain. Please use a real email address.' });
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existingUser)
            return res.status(400).json({ success: false, message: 'User already exists' });
        const user = await User_1.default.create({ username, email, password });
        const token = signToken(user._id.toString());
        res.status(201).json({ success: true, token, data: { token, user: { _id: user._id, id: user._id, username: user.username, email: user.email, role: user.role, membershipLevel: user.membershipLevel } } });
    }
    catch (error) {
        next(error);
    }
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
exports.default = { register: exports.register, login: exports.login, getMe: exports.getMe, changePassword: exports.changePassword, logout: exports.logout, forgotPassword: exports.forgotPassword, resetPassword: exports.resetPassword, googleCallback: exports.googleCallback, githubCallback: exports.githubCallback };
