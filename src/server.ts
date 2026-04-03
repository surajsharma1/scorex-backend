import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';
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
import statsRoutes from './routes/stats';

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

// Serve static overlays with CORS
app.use('/overlays', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static('public/overlays'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('public/uploads'));

// ─── Session Middleware ───────────────────────────────────────────────────────
let sessionStore;
if (process.env.RENDER || !process.env.MONGODB_URI) {
  console.log('🧠 Using MemoryStore (Render/No DB)');
  sessionStore = new MemoryStore();
} else {
  try {
    sessionStore = MongoStore.create({ 
      mongoUrl: process.env.MONGODB_URI!
    });
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

console.log('Passport session middleware initialized');

app.use(passport.initialize());
app.use(passport.session());

// ─── Socket.IO ────────────────────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('joinMatch', async (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} joined match:${matchId}`);
    
    // ✅ FIX: Send current match state immediately on join
    try {
      const Match = (mongoose.models.Match as any);
      const match = await Match.findById(matchId)
        .populate('team1 team2 tournamentId')
        .lean();
      if (match) {
        socket.emit('scoreUpdate', { match });
        console.log(`Sent initial match data to ${socket.id}`);
      }
    } catch (err) {
      console.error(`Failed to send initial match ${matchId}:`, err);
    }
  });

  socket.on('leaveMatch', (matchId: string) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('joinTournament', (tournamentId: string) => {
    socket.join(`tournament:${tournamentId}`);
  });

  socket.on('leaveTournament', (tournamentId: string) => {
    socket.leave(`tournament:${tournamentId}`);
  });

  socket.on('manualOverlayTrigger', (payload: { matchId: string, trigger: any }) => {
    console.log('🎬 Manual Trigger received:', payload.trigger.type);
    io.to(`match:${payload.matchId}`).emit('scoreUpdate', {
      activeTrigger: payload.trigger 
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
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
          user.googleId = profile.id;
          await user.save();
        } else {
          user = await User.create({
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
            username: profile.displayName?.replace(/\s/g, '_').toLowerCase() + '_' + Date.now(),
            fullName: profile.displayName,
            verified: true
          });
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
app.use('/api/v1/stats', statsRoutes);

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
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;

// Enhanced health check
app.get('/api/health/db', (req, res) => {
  const dbStatus = getDbStatus();
  res.json({ 
    status: dbStatus.status,
    readyState: mongoose.connection.readyState,
    modelsCount: Object.keys(mongoose.models).length 
  });
});

// ─── Graceful Startup ──────────────────────────────────────────────────────────
const startup = async () => {
  // Session store with Render fallback (already set above)
  
  // Try DB connection (non-blocking)
const dbResult = await connectDB();
  if ('success' in dbResult && dbResult.success) {
    console.log('✅ Full startup complete - DB ready');
  } else {
    console.warn('⚠️ Server starting WITHOUT DB - static assets/API read-only');
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`📊 DB Health: http://localhost:${PORT}/api/health/db`);
  });
};

startup().catch(err => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});

export default app;
