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
    if (!req.user || !req.user._id) {
        console.error('[OAuth] No user in req.user:', req.user);
        return res.status(401).json({ success: false, message: 'Authentication failed' });
    }
    const token = jsonwebtoken_1.default.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Priority 1: Use state param (passed from frontend Login as redirect_uri)
    let frontendUrl = req.query.state || '';
    // Priority 2: Environment var
    if (!frontendUrl) {
        frontendUrl = process.env.FRONTEND_URL || '';
    }
    // Priority 3: Improved dynamic detection
    if (!frontendUrl) {
        const host = req.get('host') || '';
        const protocol = req.get('x-forwarded-proto') === 'https' || req.protocol === 'https' ? 'https' : 'http';
        if (host.includes('vercel.app') || host.includes('onrender.com') || host.includes('railway.app')) {
            frontendUrl = `${protocol}://${host.replace('backend', 'frontend').replace('-api', '').replace('-server', '')}/`;
        }
        else if (host === 'localhost' || host.includes('127.0.0.1')) {
            frontendUrl = 'http://localhost:5173';
        }
        else {
            // Fallback wildcard prod
            frontendUrl = `${protocol}://${host}`;
            console.warn('[OAuth] Unknown host, using:', frontendUrl);
        }
    }
    console.log('[OAuth] Redirecting to frontend:', frontendUrl, { state: req.query.state, host: req.get('host') });
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
    const fragment = `token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`;
    const redirectUrl = `${frontendUrl}/oauth/callback#${fragment}`;
    console.log('[OAuth] Full redirect URL:', redirectUrl);
    res.redirect(redirectUrl);
};
exports.googleCallback = googleCallback;
exports.githubCallback = exports.googleCallback;
exports.default = {
    register: exports.register, login: exports.login, logout: exports.logout, forgotPassword: exports.forgotPassword, resetPassword: exports.resetPassword,
    getMe: exports.getMe, googleCallback: exports.googleCallback, githubCallback: exports.githubCallback
};
//# sourceMappingURL=authController.js.map