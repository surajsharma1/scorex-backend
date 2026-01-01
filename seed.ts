// seed.js (or seed.ts if using TypeScript)
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';  // Adjust path if needed
import Tournament from './src/models/Tournament.js';
import Team from './src/models/Team.js';
import Bracket from './src/models/Bracket.js';
import Overlay from './src/models/Overlay.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    // Clear existing data (optional, for fresh start)
    await User.deleteMany();
    await Tournament.deleteMany();
    await Team.deleteMany();
    await Bracket.deleteMany();
    await Overlay.deleteMany();

    // Create a sample user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('User created:', user.username);

    // Create sample tournaments
    const tournament1 = await Tournament.create({
      name: 'Cricket World Cup 2024',
      description: 'International cricket tournament',
      status: 'upcoming',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-11-15'),
      createdBy: user._id,
    });
    const tournament2 = await Tournament.create({
      name: 'Local League 2024',
      description: 'Local cricket league',
      status: 'ongoing',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-01'),
      createdBy: user._id,
    });
    console.log('Tournaments created');

    // Create sample teams
    const team1 = await Team.create({
      name: 'Team India',
      color: '#FF9933',
      tournament: tournament1._id,
      logo: '/uploads/india-logo.png',  // Placeholder
      createdBy: user._id,
      players: [
        { name: 'Virat Kohli', role: 'Batsman' },
        { name: 'Rohit Sharma', role: 'Batsman' },
        { name: 'Jasprit Bumrah', role: 'Bowler' },
      ],
    });
    const team2 = await Team.create({
      name: 'Team Australia',
      color: '#FFD700',
      tournament: tournament1._id,
      logo: '/uploads/australia-logo.png',
      createdBy: user._id,
      players: [
        { name: 'Steve Smith', role: 'Batsman' },
        { name: 'Pat Cummins', role: 'Bowler' },
      ],
    });
    const team3 = await Team.create({
      name: 'Local Eagles',
      color: '#008000',
      tournament: tournament2._id,
      logo: '/uploads/eagles-logo.png',
      createdBy: user._id,
      players: [
        { name: 'John Doe', role: 'All-rounder' },
      ],
    });
    console.log('Teams created');

    // Create sample brackets
    const bracket1 = await Bracket.create({
      tournament: tournament1._id,
      type: 'single-elimination',
      numberOfTeams: 8,
      rounds: [
        {
          roundNumber: 1,
          matches: [
            { id: '1-1', team1: team1._id, team2: team2._id, status: 'pending' },
          ],
        },
      ],
    });
    console.log('Brackets created');

    // Create sample overlays
    const overlay1 = await Overlay.create({
      name: 'Live Score Overlay',
      tournament: tournament1._id,
      template: 'score-template',
      config: {
        backgroundColor: '#16a34a',
        opacity: 90,
        fontFamily: 'Inter',
        position: 'top',
        showAnimations: true,
        autoUpdate: true,
      },
      elements: [
        { type: 'text', content: 'Team India vs Team Australia', position: { x: 10, y: 10 } },
      ],
      publicId: 'overlay-123',
    });
    console.log('Overlays created');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

connectDB().then(seedData);