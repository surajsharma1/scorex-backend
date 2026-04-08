import mongoose from 'mongoose';

let cachedConnection: typeof mongoose | null = null;

export const getDbStatus = (): { status: string } => {
  if (!mongoose.connection.readyState) return { status: 'disconnected' };
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return { status: states[mongoose.connection.readyState] };
};

const connectDB = async (): Promise<{ success: boolean } | typeof mongoose> => {
  if (cachedConnection) return cachedConnection;
  
  try {
    const connStr = process.env.MONGODB_URI || process.env.MONGODB_URL;
    if (!connStr) {
      console.error('💥 MONGODB_URI not set in environment variables');
      return { success: false };
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
    // Don't call process.exit(1) — let the server stay up so Render
    // health checks pass and the /api/health endpoint still responds.
    // The DB-readiness guard in server.ts will return 503 until reconnected.
    return { success: false };
  }
};

export default connectDB;

