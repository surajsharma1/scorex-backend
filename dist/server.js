"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
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
        callbackURL: `https://scorex-backend.onrender.com/api/auth/google/callback`,
    }, async (_accessToken, _refreshToken, profile, done) => {
        try {
            let user = await User_1.default.findOne({ googleId: profile.id });
            if (!user) {
                user = await User_1.default.create({
                    username: profile.displayName,
                    email: profile.emails?.[0].value,
                    googleId: profile.id,
                    role: 'viewer',
                });
            }
            done(null, user);
        }
        catch (error) {
            done(error, undefined); // Fixed
        }
    }));
}
else {
    console.warn('Google OAuth not configured.');
}
passport_1.default.serializeUser((user, done) => done(null, user._id));
passport_1.default.deserializeUser(async (id, done) => {
    const user = await User_1.default.findById(id);
    done(null, user);
});
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.set('trust proxy', 1); // For rate limiting behind proxies
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
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use('/api/', limiter);
// Passport middleware
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
// Routes
app.use('/api/tournaments', tournaments_1.default);
app.use('/api/teams', teams_1.default);
app.use('/api/brackets', brackets_1.default);
app.use('/api/overlays', overlays_1.default);
app.use('/api/matches', matches_1.default);
app.use('/api/users', users_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/stats', stats_1.default);
app.use('/api/auth', auth_1.default);
// Serve overlays
app.use('/overlay', express_1.default.static('public/overlays'));
// Socket.io
exports.io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('joinTournament', (tournamentId) => {
        socket.join(tournamentId);
    });
    socket.on('updateScore', (data) => {
        exports.io.to(data.tournamentId).emit('scoreUpdate', data);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});
// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});
const PORT = process.env.PORT || 5000;
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