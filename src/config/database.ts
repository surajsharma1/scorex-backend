import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

export const getDbStatus = (): { status: string } => {
  if (!mongoose.connection.readyState) return { status: 'disconnected' };
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return { status: states[mongoose.connection.readyState] };
};

const connectDB = async (): Promise<typeof mongoose> => {
  if (cachedConnection) return cachedConnection;
  
  try {
    const connStr = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!connStr) {
      throw new Error('MONGODB_URI not set in .env');
    }
    
    console.log('🔌 Connecting to MongoDB...');
    cachedConnection = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
    });

    
    console.log('✅ Database connected successfully');
    return cachedConnection;
  } catch (error) {
    console.error('💥 Database connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;

