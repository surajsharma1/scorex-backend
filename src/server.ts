import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/database';
import authRoutes from './routes/auth';
import tournamentRoutes from './routes/tournaments';
import teamRoutes from './routes/teams';
import bracketRoutes from './routes/brackets';
import overlayRoutes from './routes/overlays';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

const app = express();
app.set('trust proxy', 1);

// Connect to database
try {
  connectDB();
  console.log('Database connection initialized');
} catch (error) {
  console.error('Database connection failed:', error);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

console.log('CORS configured for:', process.env.FRONTEND_URL);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files with caching
app.use('/uploads', express.static('uploads', {
  maxAge: '1d',  // Cache for 1 day
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/overlays', overlayRoutes);

// Overlay serving route
app.get('/overlay/:id', async (req, res) => {
  try {
    const { serveOverlay } = await import('./controllers/overlayController');  // Named import
    await serveOverlay(req, res);
  } catch (error) {
    console.error('Overlay route error:', error);
    res.status(500).json({ message: 'Error serving overlay' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    mongodb: !!process.env.MONGODB_URI
  });
});

// Error handling middleware
app.use(errorHandler);

// Export for Vercel
export default app;

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}