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
    });

    // Create sample tournament
    const tournament = await Tournament.create({
      name: 'IPL 2024',
      description: 'Indian Premier League 2024 - The biggest cricket tournament',
      format: 'T20',
      startDate: new Date('2024-03-22'),
      numberOfTeams: 5,
      status: 'upcoming',
      createdBy: admin._id,
    });

    // Create sample teams
    const teamsData = [
      {
        name: 'Mumbai Indians',
        color: '#004BA0',
        tournament: tournament._id,
        players: [
          { name: 'Rohit Sharma', role: 'Batsman', jerseyNumber: '45' },
          { name: 'Jasprit Bumrah', role: 'Bowler', jerseyNumber: '93' },
          { name: 'Suryakumar Yadav', role: 'Batsman', jerseyNumber: '63' }
        ],
        createdBy: organizer._id
      },
      {
        name: 'Chennai Super Kings',
        color: '#FFFF3C',
        tournament: tournament._id,
        players: [
          { name: 'MS Dhoni', role: 'Wicketkeeper', jerseyNumber: '7' },
          { name: 'Ravindra Jadeja', role: 'All-rounder', jerseyNumber: '8' },
          { name: 'Ruturaj Gaikwad', role: 'Batsman', jerseyNumber: '31' }
        ],
        createdBy: organizer._id
      },
      {
        name: 'Royal Challengers Bangalore',
        color: '#FF0000',
        tournament: tournament._id,
        players: [
          { name: 'Virat Kohli', role: 'Batsman', jerseyNumber: '18' },
          { name: 'Mohammed Siraj', role: 'Bowler', jerseyNumber: '13' },
          { name: 'Faf du Plessis', role: 'Batsman', jerseyNumber: '13' }
        ],
        createdBy: organizer._id
      },
      {
        name: 'Kolkata Knight Riders',
        color: '#3A225D',
        tournament: tournament._id,
        players: [
          { name: 'Shreyas Iyer', role: 'Batsman', jerseyNumber: '41' },
          { name: 'Andre Russell', role: 'All-rounder', jerseyNumber: '12' },
          { name: 'Venkatesh Iyer', role: 'All-rounder', jerseyNumber: '27' }
        ],
        createdBy: organizer._id
      },
      {
        name: 'Delhi Capitals',
        color: '#17479E',
        tournament: tournament._id,
        players: [
          { name: 'Rishabh Pant', role: 'Wicketkeeper', jerseyNumber: '17' },
          { name: 'Axar Patel', role: 'All-rounder', jerseyNumber: '20' },
          { name: 'David Warner', role: 'Batsman', jerseyNumber: '31' }
        ],
        createdBy: organizer._id
      },
    ];

    const teams = await Team.insertMany(teamsData);

    // Create sample matches
    const matchesData = [
      {
        tournament: tournament._id,
        team1: teams[0]._id, // Mumbai Indians
        team2: teams[1]._id, // Chennai Super Kings
        date: new Date('2024-03-25T14:00:00Z'),
        venue: 'Wankhede Stadium, Mumbai',
        status: 'scheduled',
        createdBy: organizer._id,
      },
      {
        tournament: tournament._id,
        team1: teams[2]._id, // Royal Challengers Bangalore
        team2: teams[3]._id, // Kolkata Knight Riders
        date: new Date('2024-03-26T14:00:00Z'),
        venue: 'M. Chinnaswamy Stadium, Bangalore',
        status: 'scheduled',
        createdBy: organizer._id,
      },
      {
        tournament: tournament._id,
        team1: teams[4]._id, // Delhi Capitals
        team2: teams[0]._id, // Mumbai Indians
        date: new Date('2024-03-27T14:00:00Z'),
        venue: 'Arun Jaitley Stadium, Delhi',
        status: 'scheduled',
        createdBy: organizer._id,
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
