import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';
import Team from './src/models/Team';
import bcrypt from 'bcryptjs';

const seedData = async () => {
  try {
    await connectDB();

    // NO DB DROP - PRESERVE USER DATA & CUSTOM CONTENT
    console.log('Database connected - no wipe performed');

    // Admin user only (if missing)
    let admin = await User.findOne({ email: 'admin@example.com' });
    if (!admin) {
      const adminPassword = await bcrypt.hash('admin123', 10);
      admin = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: adminPassword,
        role: 'admin',
        isVerified: true,
        fullName: 'Admin User',
        deleted: false
      });
      console.log('✅ Created admin user');
    }

    // Organizer user only (if missing)
    let organizer = await User.findOne({ email: 'organizer@example.com' });
    if (!organizer) {
      const organizerPassword = await bcrypt.hash('organizer123', 10);
      organizer = await User.create({
        username: 'organizer',
        email: 'organizer@example.com',
        password: organizerPassword,
        role: 'organizer',
        isVerified: true,
        fullName: 'Organizer User',
        deleted: false
      });
      console.log('✅ Created organizer user');
    }

    console.log('\n✅ Minimal seed complete - NO TOURNAMENTS/TEAMS/MATCHES/CLUBS created');
    console.log('Login credentials:');
    console.log('  Admin: admin@example.com / admin123');
    console.log('  Organizer: organizer@example.com / organizer123');
    console.log('\nCustom teams/tournaments persist safely!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();

