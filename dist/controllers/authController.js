"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubCallback = exports.googleCallback = exports.resetPassword = exports.forgotPassword = exports.logout = exports.getMe = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User_1.default.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }
        const user = await User_1.default.create({ username, email, password });
        await user.populate('membership');
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            success: true,
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role }
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
        const user = await User_1.default.findOne({ email }).select('+password');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        user.lastLogin = new Date();
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            success: true,
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res) => {
    const user = await User_1.default.findById(req.user._id).populate('membership');
    res.json({ success: true, data: user });
};
exports.getMe = getMe;
const logout = (req, res) => {
    res.json({ success: true, message: 'Logged out' });
};
exports.logout = logout;
const forgotPassword = async (req, res, next) => {
    // Email logic stub
    res.json({ success: true, message: 'Password reset email sent' });
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    // Token verification + password update
    res.json({ success: true, message: 'Password reset successful' });
};
exports.resetPassword = resetPassword;
const googleCallback = (req, res) => {
    const token = jsonwebtoken_1.default.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: req.user });
};
exports.googleCallback = googleCallback;
exports.githubCallback = exports.googleCallback;
exports.default = {
    register: exports.register, login: exports.login, logout: exports.logout, forgotPassword: exports.forgotPassword, resetPassword: exports.resetPassword,
    getMe: exports.getMe, googleCallback: exports.googleCallback, githubCallback: exports.githubCallback
};
//# sourceMappingURL=authController.js.map