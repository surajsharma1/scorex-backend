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
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = __importDefault(require("./models/User"));
require("./models"); // Register all models
const database_1 = __importStar(require("./config/database"));
const express_session_2 = require("express-session");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const matches_1 = __importDefault(require("./routes/matches"));
const teams_1 = __importDefault(require("./routes/teams"));
const overlays_1 = __importDefault(require("./routes/overlays"));
const messages_1 = __importDefault(require("./routes/messages"));
const payments_1 = __importDefault(require("./routes/payments"));
const users_1 = __importDefault(require("./routes/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const stats_1 = __importDefault(require("./routes/stats"));
const scheduler_1 = require("./utils/scheduler");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];
// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        // Allow all origins for static assets (overlays/*.js/css) + listed origins
        if (!origin || allowedOrigins.includes(origin) || origin?.includes('scorex-live.vercel.app') || origin?.endsWith('.vercel.app') || origin?.includes('suraj-sharmas-projects')) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use('/uploads', express_1.default.static('public/uploads'));
// ✅ DB readiness guard
app.use('/api/v1', (req, res, next) => {
    if (mongoose_1.default.connection.readyState !== 1) {
        return res.status(503).json({
            message: 'Service temporarily unavailable, DB connecting. Retry in a moment.',
            retryAfter: 5
        });
    }
    next();
});
// ─── Session Middleware ───────────────────────────────────────────────────────
let sessionStore;
if (process.env.RENDER || !process.env.MONGODB_URI) {
    console.log('🧠 Using MemoryStore (Render/No DB)');
    sessionStore = new express_session_2.MemoryStore();
}
else {
    try {
        // Lazy-load to avoid import-time crash if package is broken
        const MongoStore = require('connect-mongo');
        const MongoStoreClass = MongoStore.default ?? MongoStore;
        sessionStore = MongoStoreClass.create({ mongoUrl: process.env.MONGODB_URI });
        console.log('🗄️ Using MongoStore');
    }
    catch (e) {
        console.warn('❌ MongoStore failed → MemoryStore:', e);
        sessionStore = new express_session_2.MemoryStore();
    }
}
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ─── Socket.IO (FIXED FOR OBS CORS) ───────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: {
        // 🔥 THIS FIXES OBS: Dynamically allows any origin to connect to the socket
        origin: (origin, callback) => callback(null, true),
        methods: ['GET', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
        credentials: true
    }
});
app.set('io', io);
io.on('connection', (socket) => {
    socket.on('joinMatch', async (matchId) => {
        socket.join(`match:${matchId}`);
        try {
            const MatchModel = mongoose_1.default.models.Match;
            const match = await MatchModel.findById(matchId)
                .populate({ path: 'team1', select: 'name shortName logo players', populate: { path: 'players', select: 'name role' } })
                .populate({ path: 'team2', select: 'name shortName logo players', populate: { path: 'players', select: 'name role' } })
                .populate('tournamentId', 'name sponsors')
                .lean();
            if (match) {
                const currentInn = match.innings?.[match.currentInnings - 1];
                const battingSummary = (currentInn?.batsmen || []).map((b) => ({
                    name: b.name, runs: b.runs ?? 0, balls: b.balls ?? 0,
                    fours: b.fours ?? 0, sixes: b.sixes ?? 0, isOut: b.isOut ?? false,
                }));
                const bowlingSummary = (currentInn?.bowlers || []).map((b) => ({
                    name: b.name, overs: b.balls ? `${Math.floor(b.balls / 6)}.${b.balls % 6}` : '0.0',
                    runs: b.runs ?? 0, wickets: b.wickets ?? 0, economy: b.economy ?? 0,
                }));
                socket.emit('scoreUpdate', { match, battingSummary, bowlingSummary });
            }
        }
        catch (err) {
            console.error(`Failed to send initial match ${matchId}:`, err);
        }
    });
    socket.on('leaveMatch', (matchId) => { socket.leave(`match:${matchId}`); });
    socket.on('joinTournament', (tournamentId) => { socket.join(`tournament:${tournamentId}`); });
    socket.on('leaveTournament', (tournamentId) => { socket.leave(`tournament:${tournamentId}`); });
    socket.on('updateScore', (payload) => {
        if (!payload?.matchId)
            return;
        io.to(`match:${payload.matchId}`).emit('scoreUpdate', { match: payload.match });
    });
    socket.on('updateMatchState', (payload) => {
        if (!payload?.match?._id)
            return;
        io.to(`match:${payload.match._id}`).emit('scoreUpdate', payload);
    });
    socket.on('manualOverlayTrigger', (payload) => {
        if (!payload?.matchId)
            return;
        // 1. scoreUpdate path — for overlays listening via onData → raw.activeTrigger
        io.to(`match:${payload.matchId}`).emit('scoreUpdate', { activeTrigger: payload.trigger });
        // 2. overlayTrigger path — direct event the engine listens to
        io.to(`match:${payload.matchId}`).emit('overlayTrigger', payload.trigger);
        // 3. manualOverlayTrigger relay — engine also listens to this directly
        io.to(`match:${payload.matchId}`).emit('manualOverlayTrigger', payload);
    });
    socket.on('disconnect', () => { });
});
// ─── Passport Google OAuth ────────────────────────────────────────────────────
let hasGoogleStrategy = false;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.BACKEND_URL || ''}/api/v1/auth/google/callback`,
        passReqToCallback: true
    }, async (_req, _accessToken, _refreshToken, profile, done) => {
        try {
            let user = await User_1.default.findOne({ googleId: profile.id });
            if (!user) {
                user = await User_1.default.findOne({ email: profile.emails?.[0]?.value });
                if (user) {
                    user.googleId = profile.id;
                    await user.save();
                }
                else {
                    user = await User_1.default.create({
                        googleId: profile.id,
                        email: profile.emails?.[0]?.value,
                        username: profile.displayName?.replace(/\s/g, '_').toLowerCase() + '_' + Date.now(),
                        fullName: profile.displayName,
                        verified: true
                    });
                }
            }
            done(null, user);
        }
        catch (err) {
            done(err, null);
        }
    }));
    hasGoogleStrategy = true;
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
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/tournaments', tournaments_1.default);
app.use('/api/v1/matches', matches_1.default);
app.use('/api/v1/teams', teams_1.default);
app.use('/api/v1/overlays', overlays_1.default);
app.use('/api/v1/messages', messages_1.default);
app.use('/api/v1/payments', payments_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/stats', stats_1.default);
// Serve static overlays
app.use('/overlays', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    next();
}, express_1.default.static('public/overlays'));
// Health checks
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));
app.get('/api/health/google', async (_req, res) => { res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() }); });
app.get('/api/v1/api/health/google', async (_req, res) => { res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() }); });
app.get('/api/health/db', (req, res) => {
    const dbStatus = (0, database_1.getDbStatus)();
    res.json({ status: dbStatus.status, readyState: mongoose_1.default.connection.readyState, modelsCount: Object.keys(mongoose_1.default.models).length });
});
// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
// ─── Graceful Startup ──────────────────────────────────────────────────────────
const startup = async () => {
    const dbResult = await (0, database_1.default)();
    const dbFailed = typeof dbResult === 'object' && 'success' in dbResult && !dbResult.success;
    if (!dbFailed) {
        console.log('✅ Full startup complete - DB ready');
        (0, scheduler_1.startScheduler)();
    }
    else {
        console.warn('⚠️ Server starting WITHOUT DB - API will return 503 until DB reconnects');
    }
    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
};
startup().catch(err => { console.error('💥 Fatal startup error (server still listening):', err); });
exports.default = app;
