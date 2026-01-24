import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    console.log('MONGODB_URI:', process.env.MONGODB_URI); // Debug log
    await mongoose.connect(process.env.MONGODB_URI!, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;