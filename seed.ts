import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';
import Tournament from './src/models/Tournament';
import Team from './src/models/Team';
import Match from './src/models/Match';
import Friend from './src/models/Friend';
import Club from './src/models/Club';
import bcrypt from 'bcryptjs';

const seedData = async () => {
  try {
    await connectDB();

    // Drop the entire database to ensure clean state
    await mongoose.connection.db.dropDatabase();

    // Clear existing data (redundant but kept for safety)
    await User.deleteMany();
    await Tournament.deleteMany();
    await Team.deleteMany();
    await Match.deleteMany();

    console.log('Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      profilePicture: 'https://via.placeholder.com/150/000000/FFFFFF?text=Admin',
      bio: 'System administrator and tournament manager.',
      fullName: 'Admin User',
      dob: new Date('1990-01-01'),
      isVerified: true,
    });

    // Create organizer user
    const organizerPassword = await bcrypt.hash('organizer123', 10);
    const organizer = await User.create({
      username: 'organizer',
      email: 'organizer@example.com',
      password: organizerPassword,
      role: 'organizer',
      profilePicture: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Organizer',
      bio: 'Professional tournament organizer and cricket enthusiast.',
      fullName: 'Organizer User',
      dob: new Date('1985-05-15'),
      isVerified: true,
    });

    // Create viewer user
    const viewerPassword = await bcrypt.hash('viewer123', 10);
    const viewer = await User.create({
      username: 'viewer',
      email: 'viewer@example.com',
      password: viewerPassword,
      role: 'viewer',
      profilePicture: 'https://via.placeholder.com/150/00FF00/FFFFFF?text=Viewer',
      bio: 'Cricket fan and tournament spectator.',
      fullName: 'Viewer User',
      dob: new Date('1995-10-20'),
      isVerified: true,
    });

    // Create surajsharma424255@gmail.com as admin user
    const surajPassword = await bcrypt.hash('suraj123', 10);
    const suraj = await User.create({
      username: 'suraj',
      email: 'surajsharma424255@gmail.com',
      password: surajPassword,
      role: 'admin',
      profilePicture: 'https://via.placeholder.com/150/FF6600/FFFFFF?text=Suraj',
      bio: 'System administrator.',
      fullName: 'Suraj Sharma',
      dob: new Date('1990-01-15'),
      isVerified: true,
    });

    // Create sample friends
    const friendsData = [
      {
        from: admin._id,
        to: organizer._id,
        status: 'accepted',
      },
    ];

    await Friend.insertMany(friendsData);

    // Create sample clubs
    const clubsData = [
      {
        name: 'Cricket Enthusiasts Club',
        description: 'A club for cricket lovers and tournament organizers',
        members: [admin._id, organizer._id],
        createdBy: admin._id,
      },
      {
        name: 'Tournament Managers',
        description: 'Professional tournament management and organization',
        members: [organizer._id],
        createdBy: organizer._id,
      },
    ];

    await Club.insertMany(clubsData);

    console.log('Database seeded successfully with:');
    console.log('- 4 users (admin, organizer, viewer, suraj) - all verified');
    console.log('- 1 friend relationship');
    console.log('- 2 clubs');
    console.log('\nAdmin login: admin@example.com / admin123');
    console.log('Organizer login: organizer@example.com / organizer123');
    console.log('Viewer login: viewer@example.com / viewer123');
    console.log('Suraj login: surajsharma424255@gmail.com / suraj123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
