import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const maxRetries = 5;
  const baseDelay = 2000; // Start with 2 seconds
  
  const getDelay = (attempt: number) => {
    // Exponential backoff: 2s, 4s, 8s, 16s, 32s
    return baseDelay * Math.pow(2, attempt);
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex';
      
      // Log connection attempt details (without exposing credentials)
      const uriParts = mongoURI.split('@');
      const safeUri = uriParts.length > 1 
        ? `mongodb://****@${uriParts[1]}` 
        : mongoURI;
      console.log(`[DB] Connecting to MongoDB (attempt ${attempt + 1}/${maxRetries}): ${safeUri}`);
      
      await mongoose.connect(mongoURI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000, // Increased from 5000
        socketTimeoutMS: 45000,
        bufferCommands: false, // Disable mongoose buffering to fail fast
        connectTimeoutMS: 10000,
      });
      
      console.log('✅ MongoDB connected successfully');
      
      // Log connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });
      
      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected - attempting to reconnect...');
      });
      
      mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
      });
      
      mongoose.connection.on('close', () => {
        console.log('MongoDB connection closed');
      });

      // Test the connection
      await mongoose.connection.db.admin().ping();
      console.log('✅ Database ping successful');
      
      return; // Success - exit the retry loop
      
    } catch (error: any) {
      console.error(`❌ MongoDB connection attempt ${attempt + 1} failed:`);
      console.error(`   Error: ${error.message}`);
      
      if (attempt < maxRetries - 1) {
        const delay = getDelay(attempt);
        console.log(`   Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('===========================================');
        console.error('MongoDB CONNECTION FAILED AFTER ALL RETRIES');
        console.error('===========================================');
        console.error('The server will continue but database operations will fail.');
        console.error('Please check:');
        console.error('1. MONGODB_URI environment variable is set correctly');
        console.error('2. MongoDB instance is running and accessible');
        console.error('3. Network/Firewall allows connection');
        console.error('===========================================');
        // Don't throw - let the app start so health checks can report status
      }
    }
  }
};

export default connectDB;

// Export connection status for health checks
export const getDbStatus = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return {
    status: states[state as keyof typeof states] || 'unknown',
    readyState: state
  };
};
