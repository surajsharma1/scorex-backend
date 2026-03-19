"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = __importDefault(require("./models/User"));
require("./models"); // Register all models
const database_1 = __importDefault(require("./config/database"));
const express_session_2 = require("express-session");
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const matches_1 = __importDefault(require("./routes/matches"));
const teams_1 = __importDefault(require("./routes/teams"));
const overlays_1 = __importDefault(require("./routes/overlays"));
const clubs_1 = __importDefault(require("./routes/clubs"));
const friends_1 = __importDefault(require("./routes/friends"));
const messages_1 = __importDefault(require("./routes/messages"));
const payments_1 = __importDefault(require("./routes/payments"));
const users_1 = __importDefault(require("./routes/users"));
const admin_1 = __importDefault(require("./routes/admin"));
const stats_1 = __importDefault(require("./routes/stats"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://scorex-live.vercel.app'
];
// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
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
app.use('/overlays', express_1.default.static('public/overlays'));
app.use('/uploads', express_1.default.static('public/uploads'));
// ─── Session Middleware ───────────────────────────────────────────────────────
let sessionStore;
try {
    sessionStore = connect_mongo_1.default.create({
        mongoUrl: process.env.MONGODB_URI || process.env.MONGO_URI || (() => { throw new Error('MONGODB_URI env var required for deployment'); })()
    });
    console.log('Session store: MongoDB (connect-mongo)');
}
catch (error) {
    console.warn('MongoStore failed, using MemoryStore fallback:', error.message);
    sessionStore = new express_session_2.MemoryStore();
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
console.log('Passport session middleware initialized');
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});
app.set('io', io);
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('joinMatch', async (matchId) => {
        socket.join(`match:${matchId}`);
        console.log(`Socket ${socket.id} joined match:${matchId}`);
        // ✅ FIX: Send current match state immediately on join
        try {
            const Match = mongoose_1.default.models.Match;
            const match = await Match.findById(matchId)
                .populate('team1 team2 tournamentId')
                .lean();
            if (match) {
                socket.emit('scoreUpdate', { match });
                console.log(`Sent initial match data to ${socket.id}`);
            }
        }
        catch (err) {
            console.error(`Failed to send initial match ${matchId}:`, err);
        }
    });
    socket.on('leaveMatch', (matchId) => {
        socket.leave(`match:${matchId}`);
    });
    socket.on('joinTournament', (tournamentId) => {
        socket.join(`tournament:${tournamentId}`);
    });
    socket.on('leaveTournament', (tournamentId) => {
        socket.leave(`tournament:${tournamentId}`);
    });
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
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
app.use('/api/v1/clubs', clubs_1.default);
app.use('/api/v1/friends', friends_1.default);
app.use('/api/v1/messages', messages_1.default);
app.use('/api/v1/payments', payments_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/admin', admin_1.default);
app.use('/api/v1/stats', stats_1.default);
// Health checks
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));
// Simplified Google OAuth health check - always OK if strategy loaded (for CORS)
app.get('/api/health/google', async (_req, res) => {
    res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() });
});
// Simplified alias for wrong path /api/v1/api/health/google
app.get('/api/v1/api/health/google', async (_req, res) => {
    res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() });
});
// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});
// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
(0, database_1.default)().then(() => {
    console.log('Full startup complete - DB ready');
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
    console.error('Startup failed:', err.message);
    process.exit(1);
});
exports.default = app;
