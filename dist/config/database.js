"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDbStatus = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const maxRetries = 5;
    const baseDelay = 2000; // Start with 2 seconds
    const getDelay = (attempt) => {
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
            await mongoose_1.default.connect(mongoURI, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000, // Increased from 5000
                socketTimeoutMS: 45000,
                bufferCommands: false, // Disable mongoose buffering to fail fast
                connectTimeoutMS: 10000,
            });
            console.log('✅ MongoDB connected successfully');
            // Log connection events
            mongoose_1.default.connection.on('error', (err) => {
                console.error('❌ MongoDB connection error:', err.message);
            });
            mongoose_1.default.connection.on('disconnected', () => {
                console.warn('⚠️ MongoDB disconnected - attempting to reconnect...');
            });
            mongoose_1.default.connection.on('reconnected', () => {
                console.log('✅ MongoDB reconnected');
            });
            mongoose_1.default.connection.on('close', () => {
                console.log('MongoDB connection closed');
            });
            // Test the connection
            await mongoose_1.default.connection.db.admin().ping();
            console.log('✅ Database ping successful');
            return; // Success - exit the retry loop
        }
        catch (error) {
            console.error(`❌ MongoDB connection attempt ${attempt + 1} failed:`);
            console.error(`   Error: ${error.message}`);
            if (attempt < maxRetries - 1) {
                const delay = getDelay(attempt);
                console.log(`   Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            else {
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
exports.default = connectDB;
// Export connection status for health checks
const getDbStatus = () => {
    const state = mongoose_1.default.connection.readyState;
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return {
        status: states[state] || 'unknown',
        readyState: state
    };
};
exports.getDbStatus = getDbStatus;
//# sourceMappingURL=database.js.map