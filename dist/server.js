"use strict";
/**
 * server.ts — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. dotenv.config() was called on line 44, AFTER imports on lines 1-40 that
 *    read process.env.* at import time (e.g. database.ts reads MONGODB_URI,
 *    passport reads GOOGLE_CLIENT_ID, etc.) — env vars were all undefined
 *    when those modules initialised.
 *    FIX: dotenv.config() is now the very first statement in the file.
 *
 * 2. /api/auth/auto-login route created an admin user with a plaintext
 *    password and exposed a token to anyone who hit the endpoint — a trivial
 *    auth bypass in production.
 *    FIX: route removed entirely.
 */
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
// FIX #1: dotenv MUST be first — before any other import reads process.env
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_github2_1 = require("passport-github2");
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_1 = __importStar(require("./config/database"));
const logger_1 = __importDefault(require("./utils/logger"));
// Register all models before any route handler runs
require("./models/index");
const User_1 = __importDefault(require("./models/User"));
// Route imports
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const teams_1 = __importDefault(require("./routes/teams"));
const matches_1 = __importDefault(require("./routes/matches"));
const bracketRoutes = express_1.default.Router();
const overlayRoutes = express_1.default.Router();
const userRoutes = express_1.default.Router();
const notificationRoutes = express_1.default.Router();
const statsRoutes = express_1.default.Router();
const friendRoutes = express_1.default.Router();
const clubRoutes = express_1.default.Router();
const paymentRoutes = express_1.default.Router();
const messageRoutes = express_1.default.Router();
const leaderboardRoutes = express_1.default.Router();
// ==========================================
// 1. DATABASE
// ==========================================
(0, database_1.default)();
// ==========================================
// 2. APP + SOCKET.IO SETUP
// ==========================================
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://scorex-live.vercel.app',
    ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
    'https://*.vercel.app',
    'https://*.onrender.com',
    'https://scorex-frontend-lzoh2zfh1-suraj-sharmas-projects-3413126b.vercel.app'
].filter(Boolean);
exports.io = new socket_io_1.Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 10000,
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
});
app.set('io', exports.io);
app.set('trust proxy', 1);
app.set('etag', false);
// ==========================================
// 3. OAUTH STRATEGIES
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
        passReqToCallback: true,
    }, async (req, _at, _rt, profile, done) => {
        try {
            let user = await User_1.default.findOne({ googleId: profile.id });
            if (user)
                return done(null, user);
            const email = profile.emails?.[0]?.value;
            if (!email)
                return done(new Error('No email from Google'), undefined);
            user = await User_1.default.findOne({ email });
            if (user) {
                user.googleId = profile.id;
                await user.save();
                return done(null, user);
            }
            done(null, false, { pendingGoogleUser: { googleId: profile.id, email, fullName: profile.displayName } });
        }
        catch (err) {
            done(err, undefined);
        }
    }));
}
else {
    console.warn('[OAuth] Google not configured — GOOGLE_CLIENT_ID/SECRET missing');
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport_1.default.use(new passport_github2_1.Strategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/github/callback`,
    }, async (_at, _rt, profile, done) => {
        try {
            let user = await User_1.default.findOne({ githubId: profile.id });
            if (user)
                return done(null, user);
            const email = profile.emails?.[0]?.value;
            user = await User_1.default.findOne({ email });
            if (user) {
                user.githubId = profile.id;
                await user.save();
                return done(null, user);
            }
            user = await User_1.default.create({ username: profile.username || profile.displayName, email, githubId: profile.id, role: 'viewer' });
            done(null, user);
        }
        catch (err) {
            done(err, undefined);
        }
    }));
}
else {
    console.warn('[OAuth] GitHub not configured — GITHUB_CLIENT_ID/SECRET missing');
}
passport_1.default.serializeUser((user, done) => done(null, user._id));
passport_1.default.deserializeUser(async (id, done) => {
    try {
        done(null, await User_1.default.findById(id));
    }
    catch (e) {
        done(e, null);
    }
});
// ==========================================
// 4. GLOBAL MIDDLEWARE
// ==========================================
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin))
            return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Disable caching on all API routes
app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'fallback_session_secret_change_in_production',
    store: connect_mongo_1.default.create({ mongoUrl: process.env.MONGODB_URI }),
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
}));
app.use((0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' }));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ==========================================
// 5. STATIC FILES
// ==========================================
const localOverlaysPath = path_1.default.resolve(__dirname, '../public/overlays');
app.use('/overlays', express_1.default.static(localOverlaysPath));
app.use('/overlay', express_1.default.static(localOverlaysPath));
// ==========================================
// 6. API ROUTES
// ==========================================
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/auth-success', require('./routes/auth-success'));
app.use('/api/v1/tournaments', tournaments_1.default);
app.use('/api/v1/teams', teams_1.default);
app.use('/api/v1/matches', matches_1.default);
app.use('/api/v1/overlays', overlayRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/clubs', clubRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);
// Health check
app.get('/api/v1/health', async (_req, res) => {
    try {
        const db = (0, database_1.getDbStatus)();
        const healthy = db.status === 'connected';
        res.status(healthy ? 200 : 503).json({
            status: healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            services: { database: db.status },
            uptime: process.uptime(),
        });
    }
    catch (err) {
        res.status(503).json({ status: 'unhealthy', error: err.message });
    }
});
// 404 for unmatched API routes
app.use('/api', (req, res) => {
    res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});
// ==========================================
// 7. GLOBAL ERROR HANDLER
// ==========================================
app.use((err, _req, res, _next) => {
    logger_1.default.error(err.message, { stack: err.stack });
    if (err.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: 'Validation Error', errors: Object.values(err.errors).map((e) => e.message) });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, message: 'Invalid ID format' });
    }
    if (err.code === 11000) {
        return res.status(400).json({ success: false, message: 'Duplicate entry', field: Object.keys(err.keyValue)[0] });
    }
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// ==========================================
// 8. SOCKET.IO EVENT HANDLERS
// ==========================================
exports.io.on('connection', (socket) => {
    logger_1.default.info(`[Socket] Connected: ${socket.id}`);
    // Support both naming formats — old: 'matchId', new: 'match:matchId'
    socket.on('join_match', (matchId) => {
        socket.join(matchId);
        socket.join(`match:${matchId}`);
    });
    socket.on('joinMatch', (matchId) => {
        socket.join(`match:${matchId}`);
        socket.join(matchId);
    });
    socket.on('leave_match', (id) => { socket.leave(id); socket.leave(`match:${id}`); });
    socket.on('leaveMatch', (id) => { socket.leave(`match:${id}`); socket.leave(id); });
    socket.on('joinTournament', (id) => socket.join(id));
    socket.on('leaveTournament', (id) => socket.leave(id));
    socket.on('joinUserRoom', (userId) => socket.join(`user:${userId}`));
    socket.on('updateScore', (data) => {
        exports.io.to(data.tournamentId).emit('scoreUpdate', data);
    });
    socket.on('updateMatchStatus', (data) => {
        exports.io.to(`match:${data.matchId}`).emit('matchStatusUpdate', data);
        exports.io.to(data.tournamentId).emit('matchStatusUpdate', data);
    });
    socket.on('sendNotification', (data) => {
        if (data.userId)
            exports.io.to(`user:${data.userId}`).emit('notification', data);
        else
            exports.io.emit('notification', data);
    });
    socket.on('typing', (data) => {
        socket.to(data.roomId).emit('userTyping', data);
    });
    socket.on('sendMessage', (data) => {
        exports.io.to(data.roomId).emit('newMessage', data.message);
    });
    socket.on('disconnect', (reason) => {
        logger_1.default.info(`[Socket] Disconnected: ${socket.id} — ${reason}`);
    });
});
// ==========================================
// 9. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger_1.default.info(`🚀 ScoreX server running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=server.js.map