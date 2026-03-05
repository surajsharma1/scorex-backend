"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleLogin = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const User_1 = __importDefault(require("../models/User"));
const validation_1 = require("../utils/validation");
const auditLogger_1 = __importDefault(require("../utils/auditLogger"));
// Initialize Google OAuth client
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Helper to convert membershipLevel to string for token
const getMembershipString = (level) => {
    switch (level) {
        case 1: return 'basic';
        case 2: return 'premium';
        default: return 'free';
    }
};
// Helper to generate JWT Token
const signToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
        role: user.role,
        membership: getMembershipString(user.membershipLevel || 0),
        membershipExpiresAt: user.membershipExpiresAt ? user.membershipExpiresAt.toISOString() : null
    }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
// --- REGISTER (No OTP - instant registration) ---
exports.register = [
    (0, validation_1.validateRequest)(validation_1.registerSchema),
    async (req, res) => {
        try {
            const { username, email, password, googleId } = req.body;
            console.log('Register attempt:', { email, username, hasGoogleId: !!googleId });
            // Check if user exists
            const existingUser = await User_1.default.findOne({ email });
            // If user exists, stop. 
            if (existingUser) {
                // If user exists but has googleId, check if it's the same Google account
                if (googleId && existingUser.googleId === googleId) {
                    // Same Google user, allow login by generating token
                    const token = signToken(existingUser);
                    res.status(200).json({
                        message: "Login successful!",
                        token,
                        user: {
                            id: existingUser._id,
                            username: existingUser.username,
                            email: existingUser.email,
                            role: existingUser.role,
                            membership: getMembershipString(existingUser.membershipLevel || 0)
                        }
                    });
                    return;
                }
                auditLogger_1.default.logSystemAction('USER_REGISTRATION_FAILED', 'User', undefined, { reason: 'Email already exists', email });
                res.status(400).json({ message: "Email already exists" });
                return;
            }
            // For Google signup, we might not have a password
            // Generate a random password if not provided
            const finalPassword = password || crypto_1.default.randomBytes(16).toString('hex');
            // Create new user - no OTP verification needed
            const newUser = await User_1.default.create({
                username,
                email,
                password: finalPassword,
                googleId: googleId || undefined, // Store Google ID if provided
                role: 'viewer',
                membershipLevel: 0,
                isVerified: true // Auto-verify - no OTP
            });
            // Generate token directly
            const token = signToken(newUser);
            auditLogger_1.default.logSystemAction('USER_REGISTERED', 'User', newUser._id, { email, username, isGoogleSignup: !!googleId });
            // Return success with token
            res.status(200).json({
                message: googleId ? "Google registration successful!" : "Registration successful!",
                token,
                user: {
                    id: newUser._id,
                    username: newUser.username,
                    email: newUser.email,
                    role: newUser.role,
                    membership: 'free'
                }
            });
        }
        catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ message: error.message });
        }
    }
];
// --- LOGIN ---
exports.login = [
    (0, validation_1.validateRequest)(validation_1.loginSchema),
    async (req, res) => {
        try {
            console.log('Login attempt for email:', req.body.email);
            const { email, password } = req.body;
            // Explicitly select password if your model has select: false
            const user = await User_1.default.findOne({ email }).select('+password');
            if (!user || !user.password || !(await bcryptjs_1.default.compare(password, user.password))) {
                res.status(401).json({ message: 'Invalid credentials' });
                return;
            }
            // Check Verification Status (now always true since we auto-verify)
            if (user.isVerified === false) {
                res.status(403).json({ message: 'Email not verified. Please register again.' });
                return;
            }
            // Check Membership Expiry
            if (user.membershipLevel !== 0 && user.membershipExpiresAt) {
                const expiryDate = new Date(user.membershipExpiresAt);
                if (expiryDate < new Date()) {
                    user.membershipLevel = 0;
                    user.membershipExpiresAt = undefined;
                    await user.save();
                }
            }
            const token = signToken(user);
            auditLogger_1.default.logUserAction(user._id.toString(), 'USER_LOGIN', 'User', user._id.toString(), {}, req.ip || '', req.get('User-Agent') || '');
            res.json({
                token,
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    membership: getMembershipString(user.membershipLevel || 0)
                }
            });
        }
        catch (error) {
            console.error('Login error:', error.message, error.stack);
            res.status(500).json({ message: 'Server error', error: error.message });
        }
    }
];
const googleLogin = async (req, res) => {
    try {
        const { token } = req.body;
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
            res.status(400).json({ message: "Invalid Google Token" });
            return;
        }
        let user = await User_1.default.findOne({ email: payload.email });
        if (!user) {
            user = await User_1.default.create({
                username: payload.name || payload.email.split('@')[0],
                email: payload.email,
                password: crypto_1.default.randomBytes(16).toString('hex'),
                isVerified: true,
                role: 'viewer',
                membershipLevel: 0
            });
        }
        const jwtToken = signToken(user);
        res.json({ token: jwtToken, user });
    }
    catch (err) {
        console.error('Google login error:', err);
        res.status(500).json({ message: "Google Login Failed" });
    }
};
exports.googleLogin = googleLogin;
//# sourceMappingURL=authController.js.map