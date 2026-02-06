"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: process.env.PORT || 5001,
    mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex-test',
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret-key',
    sessionSecret: process.env.SESSION_SECRET || 'test-session-secret',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5001',
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    githubClientId: process.env.GITHUB_CLIENT_ID,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    emailService: process.env.EMAIL_SERVICE || 'gmail',
    emailUser: process.env.EMAIL_USER,
    emailPass: process.env.EMAIL_PASS,
    logLevel: 'error',
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 1000, // Higher for tests
    authRateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    authRateLimitMax: 100, // Higher for tests
    createRateLimitWindowMs: 60 * 60 * 1000, // 1 hour
    createRateLimitMax: 100, // Higher for tests
};
//# sourceMappingURL=test.js.map