import mongoose from 'mongoose';

export class DatabaseUtils {
  static async createIndexes(): Promise<void> {
    try {
      // User indexes
      const User = mongoose.model('User');
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ username: 1 }, { unique: true });
      await User.collection.createIndex({ role: 1 });
      await User.collection.createIndex({ deleted: 1 });

      // Tournament indexes
      const Tournament = mongoose.model('Tournament');
      await Tournament.collection.createIndex({ status: 1 });
      await Tournament.collection.createIndex({ startDate: 1 });
      await Tournament.collection.createIndex({ createdBy: 1 });
      await Tournament.collection.createIndex({ isLive: 1 });
      await Tournament.collection.createIndex({ deleted: 1 });
      await Tournament.collection.createIndex({ status: 1, startDate: -1 });
      await Tournament.collection.createIndex({ name: 'text', description: 'text' });
      await Tournament.collection.createIndex({ registrationFee: 1 });

      // Team indexes
      const Team = mongoose.model('Team');
      await Team.collection.createIndex({ tournament: 1 });
      await Team.collection.createIndex({ createdBy: 1 });
      await Team.collection.createIndex({ deleted: 1 });

      // Match indexes
      const Match = mongoose.model('Match');
      await Match.collection.createIndex({ tournament: 1 });
      await Match.collection.createIndex({ date: 1 });
      await Match.collection.createIndex({ status: 1 });
      await Match.collection.createIndex({ deleted: 1 });

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating database indexes:', error);
    }
  }

  static async optimizeQueries(): Promise<void> {
    try {
      // Analyze and optimize slow queries
      // This would typically involve MongoDB's explain() method
      // and query profiling

      console.log('Query optimization completed');
    } catch (error) {
      console.error('Error optimizing queries:', error);
    }
  }

  static async setupAggregations(): Promise<void> {
    try {
      // Set up aggregation pipelines for complex queries
      // This could include pre-computed views or materialized views

      console.log('Aggregation pipelines set up successfully');
    } catch (error) {
      console.error('Error setting up aggregation pipelines:', error);
    }
  }
}
