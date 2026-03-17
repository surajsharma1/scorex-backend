import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';
import Club from './src/models/Club';

const seedClubs = async () => {
  try {
    await connectDB();

    console.log('Seeding clubs...');

    // Find or create organizer user
    let organizer = await User.findOne({ email: 'organizer@example.com' });
    if (!organizer) {
      console.log('👤 Creating test organizer user...');
      organizer = await User.create({
        username: 'organizer',
        email: 'organizer@example.com',
        password: 'password123', // Will be hashed
        fullName: 'Test Organizer',
        role: 'viewer',
        verified: true
      });
      console.log('✅ Created organizer:', organizer.email);
    } else {
      console.log('✅ Found organizer:', organizer.email);
    }

    // Check if test club exists
    let testClub = await Club.findOne({ name: 'Test Club' });
    if (testClub) {
      console.log('✅ Test Club already exists');
    } else {
      testClub = await Club.create({
        name: 'Test Club',
        description: 'Test club for ScoreX',
        type: 'public',
        owner: organizer._id,
        members: [organizer._id],
        viceLeaders: [],
        joinRequests: [],
        isActive: true
      });
      console.log('✅ Created Test Club:', testClub.name);
    }

    // List user's clubs
    const userClubs = await Club.find({
      $or: [{ owner: organizer._id }, { members: organizer._id }],
      isActive: true
    }).populate('owner', 'username email');

    console.log('\\nUser clubs:', userClubs.map(c => c.name));

    console.log('\\n✅ Club seeding complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed clubs error:', error);
    process.exit(1);
  }
};

seedClubs();

