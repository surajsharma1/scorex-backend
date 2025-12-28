// Fixed: Improved CORS and error handling
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

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://scorex-live.vercel.app',  // Fixed: Use env var
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use(limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/brackets', bracketRoutes);
app.use('/api/overlays', overlayRoutes);

// Overlay serving
app.get('/overlay/:id', async (req, res) => {
  try {
    const overlayController = (await import('./controllers/overlayController')).default;
    await overlayController.serveOverlay(req, res);
  } catch (error) {
    console.error('Overlay route error:', error);
    res.status(500).json({ message: 'Error serving overlay' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Export for Vercel
export default app;

// For local dev
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}