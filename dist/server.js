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
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const express_session_1 = __importDefault(require("express-session"));
const database_1 = __importStar(require("./config/database"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger_1 = __importDefault(require("./utils/logger"));
// Connect to Database FIRST - this must happen before any model operations
(0, database_1.default)();
// Import all models AFTER database connection to ensure they're registered properly
// This prevents "Schema hasn't been registered for model" errors in production
require("./models/index");
const User_1 = __importDefault(require("./models/User"));
// Route Imports
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const teams_1 = __importDefault(require("./routes/teams"));
const brackets_1 = __importDefault(require("./routes/brackets"));
const overlays_1 = __importDefault(require("./routes/overlays"));
const matches_1 = __importDefault(require("./routes/matches"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const stats_1 = __importDefault(require("./routes/stats"));
const auth_1 = __importDefault(require("./routes/auth"));
const friends_1 = __importDefault(require("./routes/friends"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const payments_1 = __importDefault(require("./routes/payments"));
const messages_1 = __importDefault(require("./routes/messages"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
// Load environment variables
dotenv_1.default.config();
// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
// Get allowed origins from environment
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:3000', 'http://localhost:5173', 'https://scorex-live.vercel.app'];
// Initialize Socket.io with CORS and improved configuration
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Improve connection handling
    connectTimeout: 10000,
    // Allow retries for polling transport
    transports: ['websocket', 'polling'],
    // Handle HTTP long-polling specifically
    allowUpgrades: true,
    // Cookie configuration for session
    cookie: {
        name: 'io',
        httpOnly: true,
        sameSite: 'lax',
    },
});
// Make 'io' globally available to controllers
app.set('io', exports.io);
// Trust proxy for rate limiting (Important for Render/Vercel)
app.set('trust proxy', 1);
// ==========================================
// 2. PASSPORT STRATEGIES (OAUTH)
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            console.log('[Google OAuth] Callback received:', {
                profileId: profile.id,
                emails: profile.emails,
                displayName: profile.displayName
            });
            let user = await User_1.default.findOne({ googleId: profile.id });
            if (user) {
                console.log('[Google OAuth] Existing user found by googleId:', user.email);
                return done(null, user);
            }
            const email = profile.emails?.[0]?.value;
            console.log('[Google OAuth] Email from profile:', email);
            if (!email) {
                console.error('[Google OAuth] No email found in profile');
                return done(new Error('No email found from Google'), undefined);
            }
            user = await User_1.default.findOne({ email });
            if (user) {
                console.log('[Google OAuth] Existing user found by email, linking Google ID');
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            }
            console.log('[Google OAuth] New user, creating pending user');
            const pendingGoogleUser = { googleId: profile.id, email, fullName: profile.displayName };
            done(null, false, { pendingGoogleUser });
        }
        catch (error) {
            console.error('[Google OAuth] Error in callback:', error);
            done(error, undefined);
        }
    }));
}
else {
    console.warn('Google OAuth not configured.');
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport_1.default.use(new passport_github2_1.Strategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/github/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            let user = await User_1.default.findOne({ githubId: profile.id });
            if (user)
                return done(null, user);
            const email = profile.emails?.[0].value;
            user = await User_1.default.findOne({ email });
            if (user) {
                user.githubId = profile.id;
                await user.save();
                return done(null, user);
            }
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
// ==========================================
// 3. GLOBAL MIDDLEWARE
// ==========================================
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
// 🚨 CRITICAL FIX: Body parsers placed here before any routes
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Debug Logging
app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
        console.log(`[${req.method}] ${req.path} - Content-Type: ${req.headers['content-type']}`);
        console.log('Request body keys:', Object.keys(req.body)); // Logs keys to avoid dumping massive payloads
    }
    next();
});
// Sessions
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
// Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);
// Passport Init
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ==========================================
// 4. STATIC FILES
// ==========================================
const overlaysPath = path_1.default.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays');
app.use('/overlays', express_1.default.static(overlaysPath));
app.use('/overlay', express_1.default.static(overlaysPath));
console.log('Serving overlays from:', overlaysPath);
// ==========================================
// 5. API ROUTES
// ==========================================
app.use('/api/v1/tournaments', tournaments_1.default);
app.use('/api/v1/teams', teams_1.default);
app.use('/api/v1/brackets', brackets_1.default);
app.use('/api/v1/overlays', overlays_1.default);
app.use('/api/v1/matches', matches_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/stats', stats_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/friends', friends_1.default);
app.use('/api/v1/clubs', clubs_1.default);
app.use('/api/v1/payments', payments_1.default);
app.use('/api/v1/messages', messages_1.default);
app.use('/api/v1/leaderboard', leaderboard_1.default);
// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
    try {
        const dbStatus = (0, database_1.getDbStatus)();
        const cacheService = require('./utils/cache').cacheService;
        const redisStatus = cacheService.isConnected ? 'connected' : 'disconnected';
        const isHealthy = dbStatus.status === 'connected';
        res.status(isHealthy ? 200 : 503).json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: {
                database: dbStatus.status,
                redis: redisStatus
            },
            uptime: process.uptime(),
        });
    }
    catch (error) {
        res.status(503).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});
// 🔧 DEBUG: List all available routes - helpful for debugging 404 issues
app.get('/api/v1/routes', (req, res) => {
    const routes = [];
    // Collect all registered routes
    app._router?.stack?.forEach((middleware) => {
        if (middleware.route) {
            // Routes registered directly on the app
            routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
        }
        else if (middleware.name === 'router') {
            // Routes registered on nested routers
            middleware.handle?.stack?.forEach((handler) => {
                if (handler.route) {
                    const path = handler.route.path;
                    const methods = Object.keys(handler.route.methods).join(',').toUpperCase();
                    // Get the base path from the router
                    const basePath = middleware.regexp.source
                        .replace('\\/?', '')
                        .replace('(?=\\/|$)', '')
                        .replace(/\\\//g, '/')
                        .replace(/\(\?:.*?\)/g, '');
                    routes.push(`${methods} /${basePath}${path}`);
                }
            });
        }
    });
    res.json({
        message: 'Available API routes',
        baseUrl: '/api/v1',
        routes: routes.sort(),
        timestamp: new Date().toISOString()
    });
});
// Auto-Login Route (Moved up from the bottom)
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
// ==========================================
// 6. GLOBAL ERROR HANDLER (MUST BE LAST MIDDLEWARE)
// ==========================================
// 🔧 Catch-all for unmatched API routes - provides helpful error message
app.use('/api', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.path}`,
        error: 'Endpoint not found',
        availableEndpoints: {
            health: '/api/v1/health',
            routes: '/api/v1/routes (debug)',
            auth: '/api/v1/auth/*',
            tournaments: '/api/v1/tournaments/*',
            matches: '/api/v1/matches/*',
            teams: '/api/v1/teams/*',
            users: '/api/v1/users/*',
            overlays: '/api/v1/overlays/*'
        },
        hint: 'Make sure the backend is deployed with the latest code containing all routes'
    });
});
// Fallback for non-API routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.path}`,
        error: 'Not found'
    });
});
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        body: process.env.NODE_ENV === 'development' ? req.body : undefined
    });
    // Provide more detailed error in development
    const errorResponse = {
        message: err.message || 'Internal Server Error'
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err;
    }
    // Handle specific error types with appropriate status codes
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            message: 'Validation Error',
            errors: Object.values(err.errors).map((e) => e.message),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({
            message: 'Invalid ID format',
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    if (err.code === 11000) {
        return res.status(400).json({
            message: 'Duplicate entry',
            field: Object.keys(err.keyValue)[0],
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    res.status(err.statusCode || 500).json(errorResponse);
});
// ==========================================
// 7. WEBSOCKETS (SOCKET.IO) LOGIC
// ==========================================
// Socket.IO middleware for connection tracking and logging
exports.io.use((socket, next) => {
    const sessionID = socket.id;
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
    console.log(`[Socket.IO] New connection attempt - Session: ${sessionID}, User: ${userId}`);
    // Add session info to socket
    socket.data.sessionID = sessionID;
    socket.data.connectedAt = new Date();
    next();
});
// Connection handling with improved error management
exports.io.on('connection', (socket) => {
    logger_1.default.info(`User connected: ${socket.id}`);
    // Handle client request for new session (fix for stale session IDs)
    socket.on('request_new_session', () => {
        console.log(`[Socket.IO] Client ${socket.id} requested new session`);
        socket.disconnect(true);
        // The client should reconnect automatically
    });
    // Handle both room formats for compatibility
    // Old format: join_match -> joins 'matchId'
    // New format: joinMatch -> joins 'match:${matchId}'
    socket.on('join_match', (matchId) => {
        socket.join(matchId);
        socket.join(`match:${matchId}`); // Also join new format for compatibility
        console.log(`Socket ${socket.id} joined match room: ${matchId} (both formats)`);
    });
    socket.on('joinMatch', (matchId) => {
        socket.join(`match:${matchId}`);
        socket.join(matchId); // Also join old format for compatibility
        console.log(`Socket ${socket.id} joined match room: match:${matchId} (both formats)`);
    });
    socket.on('leave_match', (matchId) => {
        socket.leave(matchId);
        socket.leave(`match:${matchId}`);
    });
    socket.on('leaveMatch', (matchId) => {
        socket.leave(`match:${matchId}`);
        socket.leave(matchId);
    });
    // Legacy event handlers (kept for backward compatibility)
    socket.on('joinTournament', (tournamentId) => {
        socket.join(tournamentId);
        logger_1.default.info(`User ${socket.id} joined tournament: ${tournamentId}`);
    });
    socket.on('leaveTournament', (tournamentId) => {
        socket.leave(tournamentId);
    });
    socket.on('updateScore', (data) => {
        exports.io.to(data.tournamentId).emit('scoreUpdate', data);
    });
    socket.on('updateMatchStatus', (data) => {
        exports.io.to(`match:${data.matchId}`).emit('matchStatusUpdate', data);
        exports.io.to(data.tournamentId).emit('matchStatusUpdate', data);
    });
    socket.on('updateTournament', (data) => {
        exports.io.to(data.tournamentId).emit('tournamentUpdate', data);
    });
    socket.on('sendNotification', (data) => {
        if (data.userId) {
            exports.io.to(`user:${data.userId}`).emit('notification', data);
        }
        else {
            exports.io.emit('notification', data);
        }
    });
    socket.on('joinUserRoom', (userId) => {
        socket.join(`user:${userId}`);
    });
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('userTyping', data);
    });
    socket.on('sendMessage', (data) => {
        exports.io.to(data.roomId).emit('newMessage', data.message);
    });
    socket.on('disconnect', (reason) => {
        logger_1.default.info(`User disconnected: ${socket.id}, reason: ${reason}`);
        // If server disconnected the client (not client-initiated), log it
        // Using type-safe string comparisons
        if (reason === 'io server disconnect' || reason === 'transport close') {
            console.log(`[Socket.IO] Server-initiated disconnect for ${socket.id}, reason: ${reason}`);
        }
    });
    // Handle reconnection
    socket.on('reconnect', (attemptNumber) => {
        console.log(`[Socket.IO] Client ${socket.id} reconnected after ${attemptNumber} attempts`);
    });
    // Handle reconnection attempt
    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[Socket.IO] Client ${socket.id} attempting reconnect #${attemptNumber}`);
    });
});
// ==========================================
// 8. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running with WebSockets on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map