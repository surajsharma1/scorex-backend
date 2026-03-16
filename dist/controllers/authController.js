"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.googleCallback = exports.resetPassword = exports.forgotPassword = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const signToken = (id) => jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
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
const logout = (_req, res) => res.json({ success: true, message: 'Logged out' });
exports.logout = logout;
const forgotPassword = async (_req, res) => res.json({ success: true, message: 'If that email exists, a reset link was sent.' });
exports.forgotPassword = forgotPassword;
const resetPassword = async (_req, res) => res.json({ success: true, message: 'Password reset successfully' });
exports.resetPassword = resetPassword;
const googleCallback = (req, res) => {
    if (!req.user?._id)
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    const token = signToken(req.user._id.toString());
    const frontendUrl = req.query.state || process.env.FRONTEND_URL || '';
    res.redirect(`${frontendUrl}/oauth/callback?token=${token}`);
};
exports.googleCallback = googleCallback;
const githubCallback = (req, res) => {
    if (!req.user?._id)
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    const token = signToken(req.user._id.toString());
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?token=${token}`);
};
exports.githubCallback = githubCallback;
exports.default = { register: exports.register, login: exports.login, getMe: exports.getMe, logout: exports.logout, forgotPassword: exports.forgotPassword, resetPassword: exports.resetPassword, googleCallback: exports.googleCallback, githubCallback: exports.githubCallback };
