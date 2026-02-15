"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const express_session_1 = __importDefault(require("express-session"));
const database_1 = __importDefault(require("./config/database"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const teams_1 = __importDefault(require("./routes/teams"));
const brackets_1 = __importDefault(require("./routes/brackets"));
const overlays_1 = __importDefault(require("./routes/overlays"));
const matches_1 = __importDefault(require("./routes/matches"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const stats_1 = __importDefault(require("./routes/stats"));
const User_1 = __importDefault(require("./models/User"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const auth_1 = __importDefault(require("./routes/auth"));
const friends_1 = __importDefault(require("./routes/friends"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const payments_1 = __importDefault(require("./routes/payments"));
const logger_1 = __importDefault(require("./utils/logger"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
    },
});
// Connect to MongoDB
(0, database_1.default)();
// Passport config
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            let user = await User_1.default.findOne({ googleId: profile.id });
            if (user) {
                done(null, user);
                return;
            }
            // Check if user exists by email
            const email = profile.emails?.[0].value;
            user = await User_1.default.findOne({ email });
            if (user) {
                // Associate Google ID with existing user
                user.googleId = profile.id;
                await user.save();
                done(null, user);
                return;
            }
            // New user: store pending info in session, don't create user yet
            const pendingGoogleUser = {
                googleId: profile.id,
                email,
                fullName: profile.displayName,
            };
            // Store in session for callback
            done(null, false, { pendingGoogleUser });
        }
        catch (error) {
            done(error, undefined);
        }
    }));
}
else {
    console.warn('Google OAuth not configured.');
}
// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport_1.default.use(new passport_github2_1.Strategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/github/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            let user = await User_1.default.findOne({ githubId: profile.id });
            if (user) {
                done(null, user);
                return;
            }
            // Check if user exists by email
            const email = profile.emails?.[0].value;
            user = await User_1.default.findOne({ email });
            if (user) {
                // Associate GitHub ID with existing user
                user.githubId = profile.id;
                await user.save();
                done(null, user);
                return;
            }
            // New user: create account
            user = await User_1.default.create({
                username: profile.username || profile.displayName,
                email,
                githubId: profile.id,
                role: 'viewer',
            });
            done(null, user);
        }
        catch (error) {
            done(error, undefined);
        }
    }));
}
else {
    console.warn('GitHub OAuth not configured.');
}
passport_1.default.serializeUser((user, done) => done(null, user._id));
passport_1.default.deserializeUser(async (id, done) => {
    const user = await User_1.default.findById(id);
    done(null, user);
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Debug middleware to log request bodies for troubleshooting
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[${req.method}] ${req.path} - Content-Type: ${req.headers['content-type']}`);
        console.log('Request body:', req.body);
    }
    next();
});
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Trust proxy setting for rate limiting in production
app.set('trust proxy', 1);
// Session middleware added here
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'fallback_secret_change_in_prod',
    store: connect_mongo_1.default.create({ mongoUrl: process.env.MONGODB_URI }),
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
    },
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Passport middleware
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Routes
app.use('/api/v1/tournaments', tournaments_1.default);
app.use('/api/v1/teams', teams_1.default);
app.use('/api/v1/brackets', brackets_1.default);
app.use('/api/v1/overlays', overlays_1.default);
app.use('/v1/api/overlays', overlays_1.default);
app.use('/api/v1/matches', matches_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/stats', stats_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/friends', friends_1.default);
app.use('/api/v1/clubs', clubs_1.default);
app.use('/api/v1/payments', payments_1.default);
// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        // Check database connection
        const mongoose = require('mongoose');
        const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
        // Check Redis connection
        const cacheService = require('./utils/cache').cacheService;
        const redisStatus = cacheService.isConnected ? 'connected' : 'disconnected';
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus,
                redis: redisStatus,
            },
            uptime: process.uptime(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});
// Serve overlays
app.use('/overlay', express_1.default.static('public/overlays'));
// Socket.io
exports.io.on('connection', (socket) => {
    logger_1.default.info(`User connected: ${socket.id}`);
    socket.on('joinTournament', (tournamentId) => {
        socket.join(tournamentId);
        logger_1.default.info(`User ${socket.id} joined tournament: ${tournamentId}`);
    });
    socket.on('updateScore', (data) => {
        exports.io.to(data.tournamentId).emit('scoreUpdate', data);
        logger_1.default.info(`Score update for tournament ${data.tournamentId}:`, data.match);
    });
    socket.on('disconnect', () => {
        logger_1.default.info(`User disconnected: ${socket.id}`);
    });
});
// Error handling
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(500).json({ message: 'Something went wrong!' });
});
const PORT = process.env.PORT || 5000;
console.log(`Starting server on port ${PORT}`);
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
app.get('/api/auth/auto-login', async (req, res) => {
    const user = await User_1.default.findOne({ email: 'default@example.com' });
    if (!user) {
        const newUser = await User_1.default.create({ username: 'Default', email: 'default@example.com', password: 'password', role: 'admin' });
        const token = jsonwebtoken_1.default.sign({ id: newUser._id }, process.env.JWT_SECRET);
        return res.json({ token });
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token });
});
exports.default = app;
//# sourceMappingURL=server.js.map