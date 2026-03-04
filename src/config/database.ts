import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex'; // Local fallback
    
    // Log connection attempt details (without exposing credentials)
    const uriParts = mongoURI.split('@');
    const safeUri = uriParts.length > 1 
      ? `mongodb://****@${uriParts[1]}` 
      : mongoURI;
    console.log('Connecting to MongoDB:', safeUri);
    
    await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('MongoDB connected successfully');
    
    // Log connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });
    
  } catch (error: any) {
    console.error('===========================================');
    console.error('MongoDB CONNECTION FAILED');
    console.error('===========================================');
    console.error('Error:', error.message);
    console.error('Please check:');
    console.error('1. MONGODB_URI environment variable is set');
    console.error('2. MongoDB instance is running');
    console.error('3. Network/Firewall allows connection');
    console.error('===========================================');
    // Don't exit - let the app handle DB errors gracefully
  }
};

export default connectDB;
