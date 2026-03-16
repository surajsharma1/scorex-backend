"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex-dev',
    jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-production',
    sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    emailService: process.env.EMAIL_SERVICE || 'gmail',
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    logLevel: 'debug',
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    authRateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    authRateLimitMax: 5,
    createRateLimitWindowMs: 60 * 60 * 1000, // 1 hour
    createRateLimitMax: 10,
};
