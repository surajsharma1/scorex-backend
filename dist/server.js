"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = __importDefault(require("./models/User"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const tournaments_1 = __importDefault(require("./routes/tournaments"));
const matches_1 = __importDefault(require("./routes/matches"));
const teams_1 = __importDefault(require("./routes/teams"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const allowedOrigins = [
    process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000'
];
// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        }
        else {
            callback(new Error(`CORS: ${origin} not allowed`));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use(passport_1.default.initialize());
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
    socket.on('joinMatch', (matchId) => {
        socket.join(`match:${matchId}`);
        console.log(`Socket ${socket.id} joined match:${matchId}`);
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
// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));
// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});
// ─── MongoDB + Start ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGODB_URI || '';
mongoose_1.default.connect(MONGO_URI)
    .then(() => {
    console.log('MongoDB connected');
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
    .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
});
exports.default = app;
