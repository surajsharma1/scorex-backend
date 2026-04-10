"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.googleCallback = exports.resetPassword = exports.forgotPassword = exports.logout = exports.changePassword = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const signToken = (id) => jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Username, email and password are required' });
        }
        if (username.trim().length < 3) {
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
        }
        if (!EMAIL_REGEX.test(email)) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }
        // Block single-char local parts (a@b.com style)
        if (email.split('@')[0].length < 2) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        const cleanEmail = email.trim().toLowerCase();
        const cleanUsername = username.trim();
        const existingUser = await User_1.default.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'An account with that username or email already exists' });
        }
        const user = await User_1.default.create({ username: cleanUsername, email: cleanEmail, password });
        const token = signToken(user._id.toString());
        res.status(201).json({
            success: true,
            token,
            data: {
                token,
                user: {
                    _id: user._id, id: user._id,
                    username: user.username, email: user.email,
                    role: user.role, membershipLevel: user.membershipLevel,
                },
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await User_1.default.findOne({ email: email.toLowerCase().trim() }).select('+password');
        if (!user || !(await user.comparePassword(password || ''))) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        user.lastLogin = new Date();
        await user.save();
        const token = signToken(user._id.toString());
        res.json({
            success: true,
            token,
            data: {
                token,
                user: {
                    _id: user._id, id: user._id,
                    username: user.username, email: user.email,
                    role: user.role, membershipLevel: user.membershipLevel,
                    fullName: user.fullName,
                },
            },
        });
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
const forgotPassword = async (_req, res) => res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
exports.forgotPassword = forgotPassword;
const resetPassword = async (_req, res) => res.json({ success: true, message: 'Password reset successfully' });
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
