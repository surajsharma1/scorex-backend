import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import session from 'express-session';
import connectDB, { getDbStatus } from './config/database';
import jwt from 'jsonwebtoken';
import MongoStore from 'connect-mongo';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger';

// Connect to Database FIRST - this must happen before any model operations
connectDB();

// Import all models AFTER database connection to ensure they're registered properly
// This prevents "Schema hasn't been registered for model" errors in production
import './models/index';
import User from './models/User';
import Player from './models/Player';

// Route Imports
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import bracketRoutes from './routes/brackets';
import overlayRoutes from './routes/overlays';
import matchRoutes from './routes/matches';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import statsRoutes from './routes/stats';
import authRoutes from './routes/auth';
import friendRoutes from './routes/friends';
import clubRoutes from './routes/clubs';
import paymentRoutes from './routes/payments';
import messageRoutes from './routes/messages';
import leaderboardRoutes from './routes/leaderboard';

// Load environment variables
dotenv.config();

// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================
const app = express();
const server = createServer(app);

// Get allowed origins from environment
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3000', 'http://localhost:5173', 'https://scorex-live.vercel.app'];

// Initialize Socket.io with CORS and improved configuration
export const io = new Server(server, {
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
app.set('io', io);

// Trust proxy for rate limiting (Important for Render/Vercel)
app.set('trust proxy', 1);


// ==========================================
// 2. PASSPORT STRATEGIES (OAUTH)
// ==========================================
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
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
      
      let user = await User.findOne({ googleId: profile.id });
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
      
      user = await User.findOne({ email });
      if (user) {
        console.log('[Google OAuth] Existing user found by email, linking Google ID');
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }

      console.log('[Google OAuth] New user, creating pending user');
      const pendingGoogleUser = { googleId: profile.id, email, fullName: profile.displayName };
      done(null, false, { pendingGoogleUser });
    } catch (error) {
      console.error('[Google OAuth] Error in callback:', error);
      done(error, undefined);
    }
  }));
} else {
  console.warn('Google OAuth not configured.');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/v1/auth/github/callback`,
  }, async (_accessToken: string, _refreshToken: string, profile: any, done: (error: any, user?: any) => void) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0].value;
      user = await User.findOne({ email });
      if (user) {
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }

      user = await User.create({
        username: profile.username || profile.displayName,
        email,
        githubId: profile.id,
        role: 'viewer',
      });
      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }));
} else {
  console.warn('GitHub OAuth not configured.');
}

passport.serializeUser((user: any, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});


// ==========================================
// 3. GLOBAL MIDDLEWARE
// ==========================================
app.use(helmet());

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug Logging
app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`[${req.method}] ${req.path} - Content-Type: ${req.headers['content-type']}`);
    console.log('Request body keys:', Object.keys(req.body)); // Logs keys to avoid dumping massive payloads
  }
  next();
});

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret_change_in_prod',
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Passport Init
app.use(passport.initialize());
app.use(passport.session());


// ==========================================
// 4. STATIC FILES
// ==========================================
// Serve engine.js and any local overlay assets from backend's own public/overlays
const localOverlaysPath = path.resolve(__dirname, '../public/overlays');
app.use('/overlays', express.static(localOverlaysPath));
app.use('/overlay', express.static(localOverlaysPath));
// Also try frontend overlays as fallback
const frontendOverlaysPath = path.resolve(__dirname, '../../../scorex-frontend/scorex-frontend/public/overlays');
if (require('fs').existsSync(frontendOverlaysPath)) {
  app.use('/overlays', express.static(frontendOverlaysPath));
  app.use('/overlay', express.static(frontendOverlaysPath));
}
console.log('Serving overlays from:', localOverlaysPath);


// ==========================================
// 5. API ROUTES
// ==========================================
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/brackets', bracketRoutes);
app.use('/api/v1/overlays', overlayRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/friends', friendRoutes);
app.use('/api/v1/clubs', clubRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/v1/health', async (req, res) => {
  try {
    const dbStatus = getDbStatus();
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
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: (error as Error).message 
    });
  }
});

// 🔧 DEBUG: List all available routes - helpful for debugging 404 issues
app.get('/api/v1/routes', (req, res) => {
  const routes: string[] = [];
  
  // Collect all registered routes
  app._router?.stack?.forEach((middleware: any) => {
    if (middleware.route) {
      // Routes registered directly on the app
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // Routes registered on nested routers
      middleware.handle?.stack?.forEach((handler: any) => {
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
  const user = await User.findOne({ email: 'default@example.com' });
  if (!user) {
    const newUser = await User.create({ username: 'Default', email: 'default@example.com', password: 'password', role: 'admin' });
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET!);
    return res.json({ token });
  }
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!);
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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', { 
    message: err.message, 
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  });
  
  // Provide more detailed error in development
  const errorResponse: any = { 
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
      errors: Object.values(err.errors).map((e: any) => e.message),
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
io.use((socket, next) => {
  const sessionID = socket.id;
  const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;
  
  console.log(`[Socket.IO] New connection attempt - Session: ${sessionID}, User: ${userId}`);
  
  // Add session info to socket
  socket.data.sessionID = sessionID;
  socket.data.connectedAt = new Date();
  
  next();
});

// Connection handling with improved error management
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Handle client request for new session (fix for stale session IDs)
  socket.on('request_new_session', () => {
    console.log(`[Socket.IO] Client ${socket.id} requested new session`);
    socket.disconnect(true);
    // The client should reconnect automatically
  });

  // Handle both room formats for compatibility
  // Old format: join_match -> joins 'matchId'
  // New format: joinMatch -> joins 'match:${matchId}'
  socket.on('join_match', (matchId: string) => {
    socket.join(matchId);
    socket.join(`match:${matchId}`); // Also join new format for compatibility
    console.log(`Socket ${socket.id} joined match room: ${matchId} (both formats)`);
  });

  socket.on('joinMatch', (matchId: string) => {
    socket.join(`match:${matchId}`);
    socket.join(matchId); // Also join old format for compatibility
    console.log(`Socket ${socket.id} joined match room: match:${matchId} (both formats)`);
  });

  socket.on('leave_match', (matchId: string) => {
    socket.leave(matchId);
    socket.leave(`match:${matchId}`);
  });

  socket.on('leaveMatch', (matchId: string) => {
    socket.leave(`match:${matchId}`);
    socket.leave(matchId);
  });

  // Legacy event handlers (kept for backward compatibility)
  socket.on('joinTournament', (tournamentId: string) => {
    socket.join(tournamentId);
    logger.info(`User ${socket.id} joined tournament: ${tournamentId}`);
  });

  socket.on('leaveTournament', (tournamentId: string) => {
    socket.leave(tournamentId);
  });

  socket.on('updateScore', (data: { tournamentId: string; match: any }) => {
    io.to(data.tournamentId).emit('scoreUpdate', data);
  });

  socket.on('updateMatchStatus', (data: { matchId: string; tournamentId: string; status: string }) => {
    io.to(`match:${data.matchId}`).emit('matchStatusUpdate', data);
    io.to(data.tournamentId).emit('matchStatusUpdate', data);
  });

  socket.on('updateTournament', (data: { tournamentId: string; tournament: any }) => {
    io.to(data.tournamentId).emit('tournamentUpdate', data);
  });

  socket.on('sendNotification', (data: { userId?: string; message: string; type: string }) => {
    if (data.userId) {
      io.to(`user:${data.userId}`).emit('notification', data);
    } else {
      io.emit('notification', data);
    }
  });

  socket.on('joinUserRoom', (userId: string) => {
    socket.join(`user:${userId}`);
  });

  socket.on('typing', (data: { roomId: string; userId: string; isTyping: boolean }) => {
    socket.to(data.roomId).emit('userTyping', data);
  });

  socket.on('sendMessage', (data: { roomId: string; message: any }) => {
    io.to(data.roomId).emit('newMessage', data.message);
  });

  socket.on('disconnect', (reason: string) => {
    logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);
    
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

export default app;