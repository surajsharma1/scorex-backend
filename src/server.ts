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

// Routes
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import matchRoutes from './routes/matches';
import teamRoutes from './routes/teams';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Session Middleware ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/scorex'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

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

  socket.on('joinMatch', (matchId: string) => {
    socket.join(`match:${matchId}`);
    console.log(`Socket ${socket.id} joined match:${matchId}`);
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

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// ─── Passport Google OAuth ────────────────────────────────────────────────────
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

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// ─── MongoDB + Start ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGODB_URI || '';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

export default app;

