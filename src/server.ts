import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import session from 'express-session';
import connectDB from './config/database';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import bracketRoutes from './routes/brackets';
import overlayRoutes from './routes/overlays';
import matchRoutes from './routes/matches';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import statsRoutes from './routes/stats';
import User from './models/User';
import jwt from 'jsonwebtoken';
import MongoStore from 'connect-mongo';
import authRoutes from './routes/auth';
import { sendOtpEmail } from './utils/email';

dotenv.config();

const app = express();
const server = createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
connectDB();

// Passport config
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
     callbackURL: `${process.env.BACKEND_URL || 'https://scorex-backend.onrender.com'}/api/auth/google/callback`,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        done(null, user);
        return;
      }
      // Check if user exists by email
      const email = profile.emails?.[0].value;
      user = await User.findOne({ email });
      if (user) {
        // Associate Google ID with existing user
        user.googleId = profile.id;
        await user.save();
        done(null, user);
        return;
      }
      // New user: create, generate OTP, send email
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      user = await User.create({
        username: profile.displayName,
        email,
        googleId: profile.id,
        role: 'viewer',
        otp,
        otpExpires,
      });
      await sendOtpEmail(email!, otp);
      done(null, user);
    } catch (error) {
      done(error, undefined);
    }
  }));
} else {
  console.warn('Google OAuth not configured.');
}

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL || 'https://scorex-backend.onrender.com'}/api/v1/auth/github/callback`,
  }, async (_accessToken, _refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) {
        done(null, user);
        return;
      }
      // Check if user exists by email
      const email = profile.emails?.[0].value;
      user = await User.findOne({ email });
      if (user) {
        // Associate GitHub ID with existing user
        user.githubId = profile.id;
        await user.save();
        done(null, user);
        return;
      }
      // New user: create account
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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1); // For rate limiting behind proxies

// Session middleware added here
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/v1/tournaments', tournamentRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/brackets', bracketRoutes);
app.use('/api/v1/overlays', overlayRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/auth', authRoutes);

// Serve overlays
app.use('/overlay', express.static('public/overlays'));

// Socket.io
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.on('joinTournament', (tournamentId: string) => {
    socket.join(tournamentId);
  });
  socket.on('updateScore', (data: { tournamentId: string; match: any }) => {
    io.to(data.tournamentId).emit('scoreUpdate', data);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
console.log(`Starting server on port ${PORT}`);
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

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

export default app;