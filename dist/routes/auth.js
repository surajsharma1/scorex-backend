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
exports.protectAdmin = exports.protectOrganizer = exports.authorize = exports.protectAuth = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const passport_1 = __importDefault(require("passport"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const rateLimiters_1 = require("../utils/rateLimiters");
const router = express_1.default.Router();
// Define protectAuth locally
const protectAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            res.status(401).json({ message: 'Not authorized, no token' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = await User_1.default.findById(decoded.id).select('-password');
        if (!user) {
            res.status(401).json({ message: 'Not authorized, user not found' });
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        res.status(401).json({ message: 'Not authorized, token failed' });
    }
};
exports.protectAuth = protectAuth;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'User role not authorized' });
            return;
        }
        next();
    };
};
exports.authorize = authorize;
const protectOrganizer = (req, res, next) => {
    if (req.user && (req.user.role === 'organizer' || req.user.role === 'admin')) {
        next();
    }
    else {
        res.status(403).json({ message: 'User role not authorized' });
    }
};
exports.protectOrganizer = protectOrganizer;
exports.protectAdmin = [exports.protectAuth, (0, exports.authorize)('admin')];
// Email register
router.post('/register', rateLimiters_1.authLimiter, async (req, res) => {
    try {
        const { username, email, password, fullName, dob, googleId } = req.body;
        const userExists = await User_1.default.findOne({ email });
        if (userExists)
            return res.status(400).json({ message: 'User already exists' });
        const usernameExists = await User_1.default.findOne({ username });
        if (usernameExists)
            return res.status(400).json({ message: 'Username already taken' });
        // Always send OTP for verification, regardless of registration method
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await User_1.default.create({ username, email, password, fullName, dob, googleId, otp, otpExpires, role: 'viewer' });
        // Send OTP email
        const { sendOtpEmail } = await Promise.resolve().then(() => __importStar(require('../utils/email')));
        await sendOtpEmail(email, otp);
        res.status(200).json({ message: 'OTP sent to email. Please verify to complete registration.' });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Verify OTP for email registration
router.post('/verify-otp', rateLimiters_1.authLimiter, async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User_1.default.findOne({ email, otp, otpExpires: { $gt: new Date() } });
        if (!user)
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.status(201).json({ token });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Email login
router.post('/login', rateLimiters_1.authLimiter, async (req, res) => {
    try {
        console.log('Login request body:', req.body);
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User_1.default.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        if (user && user.password && (await bcryptjs_1.default.compare(password, user.password))) {
            const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({ token });
        }
        else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Google OAuth routes
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport_1.default.authenticate('google'), async (req, res) => {
    try {
        const user = req.user;
        if (user) {
            const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
        }
        else {
            // New user: redirect to register with prefilled details
            const authInfo = req.authInfo;
            if (authInfo && authInfo.pendingGoogleUser) {
                const { email, fullName, googleId } = authInfo.pendingGoogleUser;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const registerUrl = `${frontendUrl}/register?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&googleId=${encodeURIComponent(googleId)}`;
                res.redirect(registerUrl);
            }
            else {
                res.redirect('/');
            }
        }
    }
    catch (error) {
        console.error('Google OAuth callback error:', error);
        res.redirect('/');
    }
});
// GitHub OAuth routes
router.get('/github', passport_1.default.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', rateLimiters_1.authLimiter, passport_1.default.authenticate('github', { failureRedirect: '/' }), async (req, res) => {
    try {
        const user = req.user;
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
    }
    catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect('/');
    }
});
// Protected route example
router.get('/me', exports.protectAuth, async (req, res) => {
    res.json(req.user);
});
exports.default = router;
//# sourceMappingURL=auth.js.map