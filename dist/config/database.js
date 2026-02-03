"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scorex'; // Local fallback
        console.log('Connecting to MongoDB:', mongoURI); // Debug log
        await mongoose_1.default.connect(mongoURI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
        });
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        // Instead of exiting, log the error and continue
        // The app will fail gracefully when trying to use DB operations
        console.error('Database connection failed. Please check MONGODB_URI environment variable.');
    }
};
exports.default = connectDB;
//# sourceMappingURL=database.js.map