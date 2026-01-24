import 'dotenv/config'; 
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';
import Tournament from './src/models/Tournament';
import Team from './src/models/Team';

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany();
    await Tournament.deleteMany();
    await Team.deleteMany();

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });

    // Create sample tournament
    const tournament = await Tournament.create({
      name: 'IPL 2024',
      description: 'Indian Premier League 2024',
      format: 'T20',
      startDate: new Date('2024-03-22'),
      numberOfTeams: 10,
      status: 'upcoming',
      createdBy: admin._id,
    });

    // Create sample teams
    const teams = [
      { name: 'Mumbai Indians', color: '#004BA0', tournament: tournament._id, createdBy: admin._id },
      { name: 'Chennai Super Kings', color: '#FFFF3C', tournament: tournament._id, createdBy: admin._id },
      { name: 'Royal Challengers Bangalore', color: '#FF0000', tournament: tournament._id, createdBy: admin._id },
    ];

    await Team.insertMany(teams);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();