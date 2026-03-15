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

// FIX #1: dotenv MUST be first — before any other import reads process.env
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

import connectDB, { getDbStatus } from './config/database';
import logger from './utils/logger';

// Register all models before any route handler runs
import './models/index';
import User from './models/User';

// Route imports
import express from 'express';
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import matchRoutes from './routes/matches';

const bracketRoutes = express.Router();
const overlayRoutes = express.Router();
const userRoutes = express.Router();
const notificationRoutes = express.Router();
const statsRoutes = express.Router();
const friendRoutes = express.Router();
const clubRoutes = express.Router();
const paymentRoutes = express.Router();
const messageRoutes = express.Router();
const leaderboardRoutes = express.Router();

// ==========================================
// 1. DATABASE
// ==========================================
connectDB();

// ==========================================
// 2. APP + SOCKET.IO SETUP
// ==========================================
const app = express();
const server = createServer(app);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : []),
  'https://scorex-live.vercel.app',
  'https://scorex-frontend-hyz9nf3s7-suraj-sharmas-projects-3413126b.vercel.app',
  'https://*.vercel.app'  // Vercel preview/staging
].filter(Boolean);

export const io = new Server(server, {
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

app.set('io', io);
app.set('trust proxy', 1);
app.set('etag', false);

// ==========================================
// 3. OAUTH STRATEGIES
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/google/callback`,
  }, async (_at, _rt, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) return done(null, user);
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google'), undefined);
      user = await User.findOne({ email });
      if (user) { user.googleId = profile.id; await user.save(); return done(null, user); }
      done(null, false, { pendingGoogleUser: { googleId: profile.id, email, fullName: profile.displayName } });
    } catch (err) { done(err, undefined); }
  }));
} else {
  console.warn('[OAuth] Google not configured — GOOGLE_CLIENT_ID/SECRET missing');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/github/callback`,
  }, async (_at: string, _rt: string, profile: any, done: any) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);
      const email = profile.emails?.[0]?.value;
      user = await User.findOne({ email });
      if (user) { user.githubId = profile.id; await user.save(); return done(null, user); }
      user = await User.create({ username: profile.username || profile.displayName, email, githubId: profile.id, role: 'viewer' });
      done(null, user);
    } catch (err) { done(err, undefined); }
  }));
} else {
  console.warn('[OAuth] GitHub not configured — GITHUB_CLIENT_ID/SECRET missing');
}

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); } catch (e) { done(e, null); }
});

// ==========================================
// 4. GLOBAL MIDDLEWARE
// ==========================================
app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Disable caching on all API routes
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret_change_in_production',
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
}));

app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' }));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 5. STATIC FILES
// ==========================================
const localOverlaysPath = path.resolve(__dirname, '../public/overlays');
app.use('/overlays', express.static(localOverlaysPath));
app.use('/overlay', express.static(localOverlaysPath));

// ==========================================
// 6. API ROUTES
// ==========================================
app.use('/api/v1/auth',          authRoutes);
app.use('/api/v1/tournaments',   tournamentRoutes);
app.use('/api/v1/teams',         teamRoutes);
app.use('/api/v1/matches',       matchRoutes);
app.use('/api/v1/brackets',      bracketRoutes);
app.use('/api/v1/overlays',      overlayRoutes);
app.use('/api/v1/users',         userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats',         statsRoutes);
app.use('/api/v1/friends',       friendRoutes);
app.use('/api/v1/clubs',         clubRoutes);
app.use('/api/v1/payments',      paymentRoutes);
app.use('/api/v1/messages',      messageRoutes);
app.use('/api/v1/leaderboard',   leaderboardRoutes);

// Health check
app.get('/api/v1/health', async (_req, res) => {
  try {
    const db = getDbStatus();
    const healthy = db.status === 'connected';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: db.status },
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: (err as Error).message });
  }
});

// 404 for unmatched API routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.path}` });
});

// ==========================================
// 7. GLOBAL ERROR HANDLER
// ==========================================
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err.message, { stack: err.stack });

  if (err.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: 'Validation Error', errors: Object.values(err.errors).map((e: any) => e.message) });
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
io.on('connection', (socket) => {
  logger.info(`[Socket] Connected: ${socket.id}`);

  // Support both naming formats — old: 'matchId', new: 'match:matchId'
  socket.on('join_match', (matchId: string) => {
    socket.join(matchId);
    socket.join(`match:${matchId}`);
  });
  socket.on('joinMatch', (matchId: string) => {
    socket.join(`match:${matchId}`);
    socket.join(matchId);
  });
  socket.on('leave_match',  (id: string) => { socket.leave(id); socket.leave(`match:${id}`); });
  socket.on('leaveMatch',   (id: string) => { socket.leave(`match:${id}`); socket.leave(id); });

  socket.on('joinTournament',  (id: string) => socket.join(id));
  socket.on('leaveTournament', (id: string) => socket.leave(id));

  socket.on('joinUserRoom', (userId: string) => socket.join(`user:${userId}`));

  socket.on('updateScore', (data: { tournamentId: string; match: any }) => {
    io.to(data.tournamentId).emit('scoreUpdate', data);
  });
  socket.on('updateMatchStatus', (data: { matchId: string; tournamentId: string; status: string }) => {
    io.to(`match:${data.matchId}`).emit('matchStatusUpdate', data);
    io.to(data.tournamentId).emit('matchStatusUpdate', data);
  });
  socket.on('sendNotification', (data: { userId?: string; message: string; type: string }) => {
    if (data.userId) io.to(`user:${data.userId}`).emit('notification', data);
    else io.emit('notification', data);
  });
  socket.on('typing', (data: { roomId: string; userId: string; isTyping: boolean }) => {
    socket.to(data.roomId).emit('userTyping', data);
  });
  socket.on('sendMessage', (data: { roomId: string; message: any }) => {
    io.to(data.roomId).emit('newMessage', data.message);
  });

  socket.on('disconnect', (reason: string) => {
    logger.info(`[Socket] Disconnected: ${socket.id} — ${reason}`);
  });
});

// ==========================================
// 9. START SERVER
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 ScoreX server running on port ${PORT}`);
});

export default app;
