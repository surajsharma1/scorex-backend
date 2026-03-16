"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Import all models to register schemas
require("./User");
require("./Tournament");
require("./Match");
require("./Team");
// Database connection events
mongoose_1.default.connection.on('connected', () => {
    console.log('✅ MongoDB connected');
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
});
exports.default = mongoose_1.default;
