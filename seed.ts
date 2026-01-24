import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User';
import Tournament from './src/models/Tournament';
import Team from './src/models/Team';
import Bracket from './src/models/Bracket';
import Overlay from './src/models/Overlay';
import bcrypt from 'bcryptjs';

dotenv.config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await User.deleteMany();
    await Tournament.deleteMany();
    await Team.deleteMany();
    await Bracket.deleteMany();
    await Overlay.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('User created:', user.username);

    const tournament1 = await Tournament.create({
      name: 'Cricket World Cup 2024',
      description: 'International cricket tournament',
      status: 'upcoming',
      startDate: new Date('2024-10-01'),
      endDate: new Date('2024-11-15'),
      numberOfTeams: 16,
      format: 'ODI',
      createdBy: user._id,
    });
    const tournament2 = await Tournament.create({
      name: 'Local League 2024',
      description: 'Local cricket league',
      status: 'active',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2024-12-01'),
      numberOfTeams: 8,
      format: 'T20',
      createdBy: user._id,
    });
    console.log('Tournaments created');

    const team1 = await Team.create({
      name: 'Team India',
      color: '#FF9933',
      tournament: tournament1._id,
      logo: '/uploads/india-logo.png',
      createdBy: user._id,
      players: [
        { name: 'Virat Kohli', role: 'Batsman', jerseyNumber: 18 },
        { name: 'Rohit Sharma', role: 'Batsman', jerseyNumber: 45 },
        { name: 'Jasprit Bumrah', role: 'Bowler', jerseyNumber: 93 },
      ],
    });
    const team2 = await Team.create({
      name: 'Team Australia',
      color: '#FFD700',
      tournament: tournament1._id,
      logo: '/uploads/australia-logo.png',
      createdBy: user._id,
      players: [
        { name: 'Steve Smith', role: 'Batsman', jerseyNumber: 49 },
        { name: 'Pat Cummins', role: 'Bowler', jerseyNumber: 30 },
      ],
    });
    const team3 = await Team.create({
      name: 'Local Eagles',
      color: '#008000',
      tournament: tournament2._id,
      logo: '/uploads/eagles-logo.png',
      createdBy: user._id,
      players: [
        { name: 'John Doe', role: 'All-rounder', jerseyNumber: 7 },
      ],
    });
    console.log('Teams created');

    if (team1 && team2) {
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
    } else {
      console.log('Not enough teams for bracket');
    }

    const overlay1 = await Overlay.create({
      name: 'Live Score Overlay',
      tournament: tournament1._id,
      template: 'classic',
      createdBy: user._id,
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