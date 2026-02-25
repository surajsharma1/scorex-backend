"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = __importDefault(require("../models/User"));
// Serialize User: stores user ID in the session (if using sessions)
// Since we use JWTs, this is mostly for compatibility or if you implement session-based auth later.
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await User_1.default.findById(id);
        done(null, user);
    }
    catch (err) {
        done(err, null);
    }
});
// --- GOOGLE STRATEGY ---
// Only configure if environment variables are present
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
        passReqToCallback: true // Allows us to pass the req object to the callback
    }, async (req, accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0].value;
            const googleId = profile.id;
            const fullName = profile.displayName;
            if (!email) {
                return done(new Error("No email found from Google"), undefined);
            }
            // 1. Check if user exists by googleId
            let user = await User_1.default.findOne({ googleId });
            if (user) {
                return done(null, user);
            }
            // 2. Check if user exists by email
            user = await User_1.default.findOne({ email });
            if (user) {
                // If user exists but isn't linked to Google, link them
                if (!user.googleId) {
                    user.googleId = googleId;
                    // Update fullName if not set
                    if (!user.fullName && fullName) {
                        user.fullName = fullName;
                    }
                    await user.save();
                }
                return done(null, user);
            }
            else {
                // 3. If user doesn't exist, create a new user
                const newUser = await User_1.default.create({
                    username: email.split('@')[0] + Math.floor(Math.random() * 1000), // Generate unique username
                    email: email,
                    googleId: googleId,
                    fullName: fullName,
                    isVerified: true, // Google verified email
                    role: 'viewer',
                    password: undefined // No password for Google users
                });
                return done(null, newUser);
            }
        }
        catch (err) {
            console.error("Google Auth Error:", err);
            return done(err, undefined);
        }
    }));
    console.log('Google OAuth strategy configured');
}
else {
    console.warn('Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
}
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map