import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';

import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import mongoose from 'mongoose';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from './models/User';
import './models';  // Register all models
import connectDB, { getDbStatus } from './config/database';
import { MemoryStore } from 'express-session';

// Routes
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import matchRoutes from './routes/matches';
import teamRoutes from './routes/teams';
import overlayRoutes from './routes/overlays';
import messageRoutes from './routes/messages';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import statsRoutes from './routes/stats';
import { startScheduler } from './utils/scheduler';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173', 
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
];

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for static assets (overlays/*.js/css) + listed origins
    if (!origin || allowedOrigins.includes(origin) || origin?.includes('scorex-live.vercel.app') || origin?.endsWith('.vercel.app') || origin?.includes('suraj-sharmas-projects')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('public/uploads'));

// ✅ DB readiness guard
app.use('/api/v1', (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
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
  sessionStore = new MemoryStore();
} else {
  try {
    // Lazy-load to avoid import-time crash if package is broken
    const MongoStore = require('connect-mongo');
    const MongoStoreClass = MongoStore.default ?? MongoStore;
    sessionStore = MongoStoreClass.create({ mongoUrl: process.env.MONGODB_URI! });
    console.log('🗄️ Using MongoStore');
  } catch (e) {
    console.warn('❌ MongoStore failed → MemoryStore:', e);
    sessionStore = new MemoryStore();
  }
}

app.use(session({
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

app.use(passport.initialize());
app.use(passport.session());

// ─── Socket.IO (FIXED FOR OBS CORS) ───────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    // 🔥 THIS FIXES OBS: Dynamically allows any origin to connect to the socket
    origin: (origin, callback) => callback(null, true), 
    methods: ['GET', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('joinMatch', async (matchId: string) => {
    socket.join(`match:${matchId}`);
    try {
      const MatchModel = (mongoose.models.Match as any);
      const match = await MatchModel.findById(matchId)
        .populate({ path: 'team1', select: 'name shortName logo players', populate: { path: 'players', select: 'name role' } })
        .populate({ path: 'team2', select: 'name shortName logo players', populate: { path: 'players', select: 'name role' } })
        .populate('tournamentId', 'name sponsors')
        .lean();
      if (match) {
        const currentInn = match.innings?.[match.currentInnings - 1];
        const battingSummary = (currentInn?.batsmen || []).map((b: any) => ({
          name: b.name, runs: b.runs ?? 0, balls: b.balls ?? 0,
          fours: b.fours ?? 0, sixes: b.sixes ?? 0, isOut: b.isOut ?? false,
        }));
        const bowlingSummary = (currentInn?.bowlers || []).map((b: any) => ({
          name: b.name, overs: b.balls ? `${Math.floor(b.balls/6)}.${b.balls%6}` : '0.0',
          runs: b.runs ?? 0, wickets: b.wickets ?? 0, economy: b.economy ?? 0,
        }));
        socket.emit('scoreUpdate', { match, battingSummary, bowlingSummary });
      }
    } catch (err) {
      console.error(`Failed to send initial match ${matchId}:`, err);
    }
  });

  socket.on('leaveMatch', (matchId: string) => { socket.leave(`match:${matchId}`); });
  socket.on('joinTournament', (tournamentId: string) => { socket.join(`tournament:${tournamentId}`); });
  socket.on('leaveTournament', (tournamentId: string) => { socket.leave(`tournament:${tournamentId}`); });

  socket.on('updateScore', (payload: { matchId: string; match: any }) => {
    if (!payload?.matchId) return;
    io.to(`match:${payload.matchId}`).emit('scoreUpdate', { match: payload.match });
  });

  socket.on('updateMatchState', (payload: any) => {
    if (!payload?.match?._id) return;
    io.to(`match:${payload.match._id}`).emit('scoreUpdate', payload);
  });

  socket.on('manualOverlayTrigger', (payload: { matchId: string; trigger: any }) => {
    if (!payload?.matchId) return;
    // 1. scoreUpdate path — for overlays listening via onData → raw.activeTrigger
    io.to(`match:${payload.matchId}`).emit('scoreUpdate', { activeTrigger: payload.trigger });
    // 2. overlayTrigger path — direct event the engine listens to
    io.to(`match:${payload.matchId}`).emit('overlayTrigger', payload.trigger);
    // 3. manualOverlayTrigger relay — engine also listens to this directly
    io.to(`match:${payload.matchId}`).emit('manualOverlayTrigger', payload);
  });

  socket.on('disconnect', () => {});
});

// ─── Passport Google OAuth ────────────────────────────────────────────────────
let hasGoogleStrategy = false;
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || ''}/api/v1/auth/google/callback`,
    passReqToCallback: true
  }, async (_req: any, _accessToken: string, _refreshToken: string, profile: any, done: any) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails?.[0]?.value });
        if (user) {
          // Existing email account — link Google ID and log in directly
          user.googleId = profile.id;
          await user.save();
        } else {
          // Brand-new Google user — store as pending, signal with special error object
          const { storePendingGoogleProfile } = await import('./controllers/authController');
          const tempToken = storePendingGoogleProfile({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            fullName: profile.displayName || '',
          });
          // Use a special "error" to carry the redirect info through passport
          const pendingInfo = {
            needsProfile: true,
            tempToken,
            email: profile.emails?.[0]?.value,
            name: profile.displayName || '',
          };
          return done(null, false, pendingInfo);
        }
      }
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }));
  hasGoogleStrategy = true;
}

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id: string, done) => {
  try { done(null, await User.findById(id)); } catch (e) { done(e, null); }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/overlays', overlayRoutes);

app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats', statsRoutes);

// Serve static overlays
app.use('/overlays', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static('public/overlays'));

// Health checks
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));
app.get('/api/health/google', async (_req, res) => { res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() }); });
app.get('/api/v1/api/health/google', async (_req, res) => { res.json({ status: hasGoogleStrategy ? 'ok' : 'error', message: hasGoogleStrategy ? 'Google OAuth ready' : 'Missing env vars', ts: new Date() }); });
app.get('/api/health/db', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({ status: dbStatus.status, readyState: mongoose.connection.readyState, modelsCount: Object.keys(mongoose.models).length });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
})

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;
// ─── Graceful Startup ──────────────────────────────────────────────────────────
const startup = async () => {
  const dbResult = await connectDB();
  const dbFailed = typeof dbResult === 'object' && 'success' in dbResult && !dbResult.success;
  if (!dbFailed) {
    console.log('✅ Full startup complete - DB ready');
    startScheduler();
  } else {
    console.warn('⚠️ Server starting WITHOUT DB - API will return 503 until DB reconnects');
  }

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startup().catch(err => { console.error('💥 Fatal startup error (server still listening):', err); });

export default app;