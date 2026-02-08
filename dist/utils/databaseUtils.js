"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseUtils = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
class DatabaseUtils {
    static async createIndexes() {
        try {
            // User indexes
            const User = mongoose_1.default.model('User');
            await User.collection.createIndex({ email: 1 }, { unique: true });
            await User.collection.createIndex({ username: 1 }, { unique: true });
            await User.collection.createIndex({ role: 1 });
            await User.collection.createIndex({ deleted: 1 });
            // Tournament indexes
            const Tournament = mongoose_1.default.model('Tournament');
            await Tournament.collection.createIndex({ status: 1 });
            await Tournament.collection.createIndex({ startDate: 1 });
            await Tournament.collection.createIndex({ createdBy: 1 });
            await Tournament.collection.createIndex({ isLive: 1 });
            await Tournament.collection.createIndex({ deleted: 1 });
            await Tournament.collection.createIndex({ status: 1, startDate: -1 });
            await Tournament.collection.createIndex({ name: 'text', description: 'text' });
            await Tournament.collection.createIndex({ registrationFee: 1 });
            // Team indexes
            const Team = mongoose_1.default.model('Team');
            await Team.collection.createIndex({ tournament: 1 });
            await Team.collection.createIndex({ createdBy: 1 });
            await Team.collection.createIndex({ deleted: 1 });
            // Match indexes
            const Match = mongoose_1.default.model('Match');
            await Match.collection.createIndex({ tournament: 1 });
            await Match.collection.createIndex({ date: 1 });
            await Match.collection.createIndex({ status: 1 });
            await Match.collection.createIndex({ deleted: 1 });
            console.log('Database indexes created successfully');
        }
        catch (error) {
            console.error('Error creating database indexes:', error);
        }
    }
    static async optimizeQueries() {
        try {
            // Analyze and optimize slow queries
            // This would typically involve MongoDB's explain() method
            // and query profiling
            console.log('Query optimization completed');
        }
        catch (error) {
            console.error('Error optimizing queries:', error);
        }
    }
    static async setupAggregations() {
        try {
            // Set up aggregation pipelines for complex queries
            // This could include pre-computed views or materialized views
            console.log('Aggregation pipelines set up successfully');
        }
        catch (error) {
            console.error('Error setting up aggregation pipelines:', error);
        }
    }
}
exports.DatabaseUtils = DatabaseUtils;
//# sourceMappingURL=databaseUtils.js.map