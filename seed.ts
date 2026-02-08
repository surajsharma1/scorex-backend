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
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
    });

    // Create organizer user
    const organizerPassword = await bcrypt.hash('password123', 10);
    const organizer = await User.create({
      username: 'organizer',
      email: 'organizer@example.com',
      password: organizerPassword,
      role: 'organizer',
    });

    // Create sample tournament
    const tournament = await Tournament.create({
      name: 'IPL 2024',
      description: 'Indian Premier League 2024 - The biggest cricket tournament',
      format: 'T20',
      startDate: new Date('2024-03-22'),
      endDate: new Date('2024-05-26'),
      maxTeams: 10,
      entryFee: 100,
      status: 'upcoming',
      createdBy: admin._id,
    });

    // Create sample teams
    const teamsData = [
      { name: 'Mumbai Indians', color: '#004BA0', captain: 'Rohit Sharma', players: ['Rohit Sharma', 'Jasprit Bumrah', 'Suryakumar Yadav'], createdBy: organizer._id },
      { name: 'Chennai Super Kings', color: '#FFFF3C', captain: 'MS Dhoni', players: ['MS Dhoni', 'Ravindra Jadeja', 'Ruturaj Gaikwad'], createdBy: organizer._id },
      { name: 'Royal Challengers Bangalore', color: '#FF0000', captain: 'Virat Kohli', players: ['Virat Kohli', 'Mohammed Siraj', 'Faf du Plessis'], createdBy: organizer._id },
      { name: 'Kolkata Knight Riders', color: '#3A225D', captain: 'Shreyas Iyer', players: ['Shreyas Iyer', 'Andre Russell', 'Venkatesh Iyer'], createdBy: organizer._id },
      { name: 'Delhi Capitals', color: '#17479E', captain: 'Rishabh Pant', players: ['Rishabh Pant', 'Axar Patel', 'David Warner'], createdBy: organizer._id },
    ];

    const teams = await Team.insertMany(teamsData);

    // Create sample matches
    const matchesData = [
      {
        tournamentId: tournament._id,
        team1Id: teams[0]._id, // Mumbai Indians
        team2Id: teams[1]._id, // Chennai Super Kings
        scheduledDate: new Date('2024-03-25T14:00:00Z'),
        venue: 'Wankhede Stadium, Mumbai',
        status: 'scheduled',
      },
      {
        tournamentId: tournament._id,
        team1Id: teams[2]._id, // Royal Challengers Bangalore
        team2Id: teams[3]._id, // Kolkata Knight Riders
        scheduledDate: new Date('2024-03-26T14:00:00Z'),
        venue: 'M. Chinnaswamy Stadium, Bangalore',
        status: 'scheduled',
      },
      {
        tournamentId: tournament._id,
        team1Id: teams[4]._id, // Delhi Capitals
        team2Id: teams[0]._id, // Mumbai Indians
        scheduledDate: new Date('2024-03-27T14:00:00Z'),
        venue: 'Arun Jaitley Stadium, Delhi',
        status: 'scheduled',
      },
    ];

    await Match.insertMany(matchesData);

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
    console.log('- 2 users (admin and organizer)');
    console.log('- 1 tournament (IPL 2024)');
    console.log('- 5 teams');
    console.log('- 3 matches');
    console.log('- 1 friend relationship');
    console.log('- 2 clubs');
    console.log('\nAdmin login: admin@example.com / password123');
    console.log('Organizer login: organizer@example.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();
