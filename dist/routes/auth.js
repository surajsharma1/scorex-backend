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
const rateLimiters_1 = require("../utils/rateLimiters");
// Import the new controllers
const authController_1 = require("../controllers/authController");
const router = express_1.default.Router();
// --- Middleware Definitions (Preserved) ---
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
// --- AUTH ROUTES ---
// 1. Register (Step 1: Validates input & Sends OTP)
// Note: 'register' from controller includes the validation middleware
router.post('/register', authController_1.register);
// 2. Verify OTP (Step 2: Activates user & returns Token)
router.post('/verify-otp', authController_1.verifyOTP);
// 3. Login
router.post('/login', authController_1.login);
// --- OAUTH ROUTES (Preserved) ---
// Google OAuth
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
                console.error('Google OAuth failed:', info);
                return res.status(401).json({ message: 'Unauthorized' });
            }
        }
        else {
            // Existing user: generate token and redirect to dashboard
            try {
                const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
                res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?token=${token}`);
            }
            catch (error) {
                console.error('Token generation error:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        }
    })(req, res, next);
});
// GitHub OAuth
router.get('/github', passport_1.default.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', rateLimiters_1.authLimiter, passport_1.default.authenticate('github', { failureRedirect: '/login' }), async (req, res) => {
    try {
        const user = req.user;
        const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?token=${token}`);
    }
    catch (error) {
        console.error('GitHub OAuth callback error:', error);
        res.redirect('/login');
    }
});
// Protected route example
router.get('/me', exports.protectAuth, async (req, res) => {
    res.json(req.user);
});
exports.default = router;
//# sourceMappingURL=auth.js.map