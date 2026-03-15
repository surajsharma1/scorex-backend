import mongoose from 'mongoose';

// Import all models to register schemas
import './User';
import './Tournament';
import './Match';
import './Team';

// Database connection events
mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

export default mongoose;

