"use strict";
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
const auditLogger_1 = __importDefault(require("../utils/auditLogger"));
const validation_1 = require("../utils/validation");
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
router.post('/register', (0, validation_1.validateRequest)(validation_1.registerSchema), async (req, res) => {
    try {
        const { username, email, password, fullName, dob, googleId } = req.body;
        // Additional server-side checks
        const userExists = await User_1.default.findOne({ email });
        if (userExists)
            return res.status(400).json({ message: 'User already exists' });
        const usernameExists = await User_1.default.findOne({ username });
        if (usernameExists)
            return res.status(400).json({ message: 'Username already taken' });
        // Check for common weak passwords (additional security layer)
        const weakPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
        if (weakPasswords.includes(password.toLowerCase())) {
            return res.status(400).json({ message: 'Password is too weak. Please choose a stronger password.' });
        }
        // Create the user directly without OTP verification
        const user = await User_1.default.create({
            username,
            email,
            password,
            fullName,
            dob,
            googleId,
            role: 'viewer'
        });
        // Generate token
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        // Audit log successful registration
        auditLogger_1.default.logUserAction(user._id.toString(), 'USER_REGISTERED', 'User', user._id.toString(), { username, email }, req.ip, req.get('User-Agent'));
        res.status(201).json({ token });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// Email login
router.post('/login', async (req, res) => {
    try {
        console.log('Login request body:', req.body);
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User_1.default.findOne({ email });
        console.log('User found:', user ? 'Yes' : 'No');
        if (user && user.password && (await bcryptjs_1.default.compare(password, user.password))) {
            // Check if user has verified OTP (otp field should be undefined after verification)
            if (user.otp !== undefined) {
                return res.status(401).json({ message: 'Please verify your email with OTP before logging in' });
            }
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
router.get('/google/callback', (req, res, next) => {
    passport_1.default.authenticate('google', (err, user, info) => {
        if (err) {
            console.error('Google OAuth error:', err);
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!user) {
            if (info && info.pendingGoogleUser) {
                // New user: redirect to register with prefilled details
                const { email, fullName, googleId } = info.pendingGoogleUser;
                const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                const registerUrl = `${frontendUrl}/register?email=${encodeURIComponent(email)}&fullName=${encodeURIComponent(fullName)}&googleId=${encodeURIComponent(googleId)}`;
                res.redirect(registerUrl);
            }
            else {
                // Authentication failed
                console.error('Google OAuth failed:', info);
                return res.status(401).json({ message: 'Unauthorized' });
            }
        }
        else {
            // Existing user: generate token and redirect
            try {
                const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/?token=${token}`);
            }
            catch (error) {
                console.error('Token generation error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    })(req, res, next);
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