import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';
import Player from './src/models/Player';
import Team from './src/models/Team';
import Tournament from './src/models/Tournament';
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
    await User.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Tournament.deleteMany({});
    await Match.deleteMany({});
    await Friend.deleteMany({});
    await Club.deleteMany({});

    console.log('Cleared existing data');

    // ========================================
    // CREATE USERS
    // ========================================
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
      membershipLevel: 2,
      membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      membershipStartedAt: new Date(),
      membershipTimeline: [{
        level: 2,
        status: 'active',
        startedAt: new Date(),
        paymentId: 'admin_payment_001',
        notes: 'Admin account - premium membership'
      }],
      isVerified: true,
      fullName: 'Admin User',
      dob: new Date('1990-01-01'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/000000/FFFFFF?text=Admin',
      bio: 'System administrator and tournament manager.',
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
        tournamentUpdates: true,
        matchResults: true,
        systemAnnouncements: true
      },
      paymentHistory: [{
        amount: 99.99,
        currency: 'USD',
        level: 'Premium',
        duration: 'yearly',
        paymentIntentId: 'admin_payment_001',
        status: 'succeeded',
        date: new Date()
      }],
      deleted: false
    });

    // Create organizer user
    const organizerPassword = await bcrypt.hash('organizer123', 10);
    const organizer = await User.create({
      username: 'organizer',
      email: 'organizer@example.com',
      password: organizerPassword,
      role: 'organizer',
      membershipLevel: 1,
      membershipExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      membershipStartedAt: new Date(),
      membershipTimeline: [{
        level: 1,
        status: 'active',
        startedAt: new Date(),
        paymentId: 'organizer_payment_001',
        notes: 'Basic membership'
      }],
      isVerified: true,
      fullName: 'Organizer User',
      dob: new Date('1985-05-15'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=Organizer',
      bio: 'Professional tournament organizer and cricket enthusiast.',
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
        tournamentUpdates: true,
        matchResults: true,
        systemAnnouncements: true
      },
      paymentHistory: [{
        amount: 49.99,
        currency: 'USD',
        level: 'Basic',
        duration: '6months',
        paymentIntentId: 'organizer_payment_001',
        status: 'succeeded',
        date: new Date()
      }],
      deleted: false
    });

    // Create viewer user
    const viewerPassword = await bcrypt.hash('viewer123', 10);
    const viewer = await User.create({
      username: 'viewer',
      email: 'viewer@example.com',
      password: viewerPassword,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'Viewer User',
      dob: new Date('1995-10-20'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/00FF00/FFFFFF?text=Viewer',
      bio: 'Cricket fan and tournament spectator.',
      notificationPreferences: {
        email: true,
        push: false,
        sms: false,
        tournamentUpdates: true,
        matchResults: true,
        systemAnnouncements: false
      },
      deleted: false
    });

    // Create additional regular users
    const user1Password = await bcrypt.hash('user123', 10);
    const user1 = await User.create({
      username: 'surajsharma424255',
      email: 'surajsharma424255@gmail.com',
      password: user1Password,
      role: 'organizer',
      membershipLevel: 2,
      membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      membershipStartedAt: new Date(),
      isVerified: true,
      fullName: 'Suraj Sharma',
      dob: new Date('1992-08-15'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=Suraj',
      bio: 'Cricket enthusiast and tournament organizer.',
      notificationPreferences: {
        email: true,
        push: true,
        sms: true,
        tournamentUpdates: true,
        matchResults: true,
        systemAnnouncements: true
      },
      deleted: false
    });

    const user2Password = await bcrypt.hash('player123', 10);
    const user2 = await User.create({
      username: 'player1',
      email: 'player1@example.com',
      password: user2Password,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'John Player',
      dob: new Date('1998-03-22'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/FFA500/FFFFFF?text=John',
      bio: 'Passionate cricketer and fan.',
      deleted: false
    });

    const user3Password = await bcrypt.hash('player234', 10);
    const user3 = await User.create({
      username: 'player2',
      email: 'player2@example.com',
      password: user3Password,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'Mike Smith',
      dob: new Date('1996-11-08'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/800080/FFFFFF?text=Mike',
      bio: 'All cricket lover.',
      deleted: false
    });

    const user4Password = await bcrypt.hash('player345', 10);
    const user4 = await User.create({
      username: 'player3',
      email: 'player3@example.com',
      password: user4Password,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'David Johnson',
      dob: new Date('1994-07-30'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/008080/FFFFFF?text=David',
      bio: 'Weekend cricketer.',
      deleted: false
    });

    const user5Password = await bcrypt.hash('player456', 10);
    const user5 = await User.create({
      username: 'player4',
      email: 'player4@example.com',
      password: user5Password,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'Chris Brown',
      dob: new Date('2000-01-15'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/FF4500/FFFFFF?text=Chris',
      bio: 'Young and energetic player.',
      deleted: false
    });

    const user6Password = await bcrypt.hash('player567', 10);
    const user6 = await User.create({
      username: 'player5',
      email: 'player5@example.com',
      password: user6Password,
      role: 'viewer',
      membershipLevel: 0,
      isVerified: true,
      fullName: 'Robert Wilson',
      dob: new Date('1997-09-25'),
      friends: [],
      profilePicture: 'https://via.placeholder.com/150/4B0082/FFFFFF?text=Robert',
      bio: 'Cricket is my life.',
      deleted: false
    });

    console.log('Created 7 users');

    // ========================================
    // CREATE TEAMS FIRST (without players - will update later)
    // ========================================

    const team1 = await Team.create({
      name: 'Mumbai Thunder',
      color: '#FF0000',
      logo: 'https://via.placeholder.com/150/FF0000/FFFFFF?text=MT',
      players: [],
      statistics: {
        matchesPlayed: 25,
        won: 18,
        lost: 7,
        tied: 0,
        points: 36,
        netRunRate: 0.85
      },
      createdBy: admin._id
    });

    const team2 = await Team.create({
      name: 'Delhi Capitals',
      color: '#0000FF',
      logo: 'https://via.placeholder.com/150/0000FF/FFFFFF?text=DC',
      players: [],
      statistics: {
        matchesPlayed: 22,
        won: 14,
        lost: 8,
        tied: 0,
        points: 28,
        netRunRate: 0.62
      },
      createdBy: organizer._id
    });

    const team3 = await Team.create({
      name: 'Chennai Super Kings',
      color: '#FFFF00',
      logo: 'https://via.placeholder.com/150/FFFF00/000000?text=CSK',
      players: [],
      statistics: {
        matchesPlayed: 28,
        won: 20,
        lost: 8,
        tied: 0,
        points: 40,
        netRunRate: 0.95
      },
      createdBy: organizer._id
    });

    const team4 = await Team.create({
      name: 'Royal Challengers Bangalore',
      color: '#FFA500',
      logo: 'https://via.placeholder.com/150/FFA500/FFFFFF?text=RCB',
      players: [],
      statistics: {
        matchesPlayed: 24,
        won: 15,
        lost: 9,
        tied: 0,
        points: 30,
        netRunRate: 0.72
      },
      createdBy: admin._id
    });

    console.log('Created 4 teams');

    // ========================================
    // CREATE PLAYERS FOR TEAMS (with proper team reference)
    // ========================================

    // Team 1 Players - Mumbai Thunder
    const mumbaiPlayers = await Player.insertMany([
      {
        name: 'Rohit Sharma',
        role: 'Batsman',
        jerseyNumber: '45',
        team: team1._id,
        userId: user1._id,
        stats: { matches: 50, runs: 1850, wickets: 0, average: 42.5, battingAverage: 42.5, bowlingAverage: 0, strikeRate: 138.2, economy: 0 }
      },
      {
        name: 'Hardik Pandya',
        role: 'All-rounder',
        jerseyNumber: '33',
        team: team1._id,
        userId: user2._id,
        stats: { matches: 45, runs: 980, wickets: 42, average: 28.5, battingAverage: 28.5, bowlingAverage: 25.2, strikeRate: 145.6, economy: 7.8 }
      },
      {
        name: 'Jasprit Bumrah',
        role: 'Bowler',
        jerseyNumber: '93',
        team: team1._id,
        userId: user3._id,
        stats: { matches: 40, runs: 120, wickets: 55, average: 15.2, battingAverage: 8.5, bowlingAverage: 18.5, strikeRate: 125.0, economy: 6.2 }
      },
      {
        name: 'Surya Kumar Yadav',
        role: 'Batsman',
        jerseyNumber: '63',
        team: team1._id,
        userId: user4._id,
        stats: { matches: 35, runs: 1120, wickets: 0, average: 38.5, battingAverage: 38.5, bowlingAverage: 0, strikeRate: 165.2, economy: 0 }
      },
      {
        name: 'Ishan Kishan',
        role: 'Wicket Keeper',
        jerseyNumber: '32',
        team: team1._id,
        userId: user5._id,
        stats: { matches: 30, runs: 850, wickets: 0, average: 32.5, battingAverage: 32.5, bowlingAverage: 0, strikeRate: 140.2, economy: 0 }
      },
      {
        name: 'Bhuvneshwar Kumar',
        role: 'Bowler',
        jerseyNumber: '15',
        team: team1._id,
        stats: { matches: 55, runs: 180, wickets: 60, average: 22.5, battingAverage: 6.2, bowlingAverage: 24.8, strikeRate: 118.5, economy: 6.5 }
      },
      {
        name: 'Washington Sundar',
        role: 'All-rounder',
        jerseyNumber: '4',
        team: team1._id,
        stats: { matches: 25, runs: 420, wickets: 22, average: 25.2, battingAverage: 25.2, bowlingAverage: 28.5, strikeRate: 135.8, economy: 7.2 }
      },
      {
        name: 'Prithvi Shaw',
        role: 'Batsman',
        jerseyNumber: '100',
        team: team1._id,
        stats: { matches: 28, runs: 780, wickets: 0, average: 30.2, battingAverage: 30.2, bowlingAverage: 0, strikeRate: 158.5, economy: 0 }
      },
      {
        name: 'Shardul Thakur',
        role: 'Bowler',
        jerseyNumber: '54',
        team: team1._id,
        stats: { matches: 32, runs: 280, wickets: 35, average: 18.5, battingAverage: 12.5, bowlingAverage: 26.8, strikeRate: 132.4, economy: 7.8 }
      },
      {
        name: 'Rahul Rahul',
        role: 'Wicket Keeper',
        jerseyNumber: '1',
        team: team1._id,
        userId: user6._id,
        stats: { matches: 42, runs: 1450, wickets: 0, average: 38.5, battingAverage: 38.5, bowlingAverage: 0, strikeRate: 142.5, economy: 0 }
      },
      {
        name: 'Mohammed Shami',
        role: 'Bowler',
        jerseyNumber: '11',
        team: team1._id,
        stats: { matches: 38, runs: 95, wickets: 48, average: 18.2, battingAverage: 5.2, bowlingAverage: 22.5, strikeRate: 120.5, economy: 5.8 }
      }
    ]);

    // Team 2 Players - Delhi Capitals
    const delhiPlayers = await Player.insertMany([
      {
        name: 'Rishabh Pant',
        role: 'Wicket Keeper',
        jerseyNumber: '17',
        team: team2._id,
        stats: { matches: 38, runs: 1250, wickets: 0, average: 35.5, battingAverage: 35.5, bowlingAverage: 0, strikeRate: 148.2, economy: 0 }
      },
      {
        name: 'David Warner',
        role: 'Batsman',
        jerseyNumber: '31',
        team: team2._id,
        stats: { matches: 48, runs: 1680, wickets: 0, average: 38.5, battingAverage: 38.5, bowlingAverage: 0, strikeRate: 142.5, economy: 0 }
      },
      {
        name: 'Kuldeep Yadav',
        role: 'Bowler',
        jerseyNumber: '22',
        team: team2._id,
        stats: { matches: 35, runs: 180, wickets: 42, average: 22.5, battingAverage: 8.5, bowlingAverage: 24.2, strikeRate: 128.5, economy: 7.2 }
      },
      {
        name: 'Axar Patel',
        role: 'All-rounder',
        jerseyNumber: '12',
        team: team2._id,
        stats: { matches: 40, runs: 680, wickets: 38, average: 28.2, battingAverage: 28.2, bowlingAverage: 26.5, strikeRate: 135.8, economy: 7.5 }
      },
      {
        name: 'Anrich Nortje',
        role: 'Bowler',
        jerseyNumber: '59',
        team: team2._id,
        stats: { matches: 22, runs: 65, wickets: 28, average: 18.5, battingAverage: 7.2, bowlingAverage: 20.8, strikeRate: 125.5, economy: 6.2 }
      },
      {
        name: 'Shreyas Iyer',
        role: 'Batsman',
        jerseyNumber: '44',
        team: team2._id,
        stats: { matches: 45, runs: 1520, wickets: 0, average: 36.8, battingAverage: 36.8, bowlingAverage: 0, strikeRate: 145.2, economy: 0 }
      },
      {
        name: 'Prasidh Krishna',
        role: 'Bowler',
        jerseyNumber: '88',
        team: team2._id,
        stats: { matches: 28, runs: 85, wickets: 32, average: 20.5, battingAverage: 6.5, bowlingAverage: 25.2, strikeRate: 122.5, economy: 7.0 }
      },
      {
        name: 'Ripal Patel',
        role: 'All-rounder',
        jerseyNumber: '21',
        team: team2._id,
        stats: { matches: 15, runs: 280, wickets: 12, average: 25.5, battingAverage: 25.5, bowlingAverage: 28.8, strikeRate: 138.2, economy: 7.8 }
      },
      {
        name: 'Yash Dhull',
        role: 'Batsman',
        jerseyNumber: '7',
        team: team2._id,
        stats: { matches: 12, runs: 380, wickets: 0, average: 38.0, battingAverage: 38.0, bowlingAverage: 0, strikeRate: 135.5, economy: 0 }
      },
      {
        name: 'Mukesh Kumar',
        role: 'Bowler',
        jerseyNumber: '25',
        team: team2._id,
        stats: { matches: 18, runs: 45, wickets: 20, average: 18.5, battingAverage: 5.2, bowlingAverage: 22.8, strikeRate: 118.5, economy: 6.5 }
      },
      {
        name: 'Lalit Yadav',
        role: 'All-rounder',
        jerseyNumber: '55',
        team: team2._id,
        stats: { matches: 20, runs: 350, wickets: 15, average: 25.2, battingAverage: 25.2, bowlingAverage: 30.5, strikeRate: 132.5, economy: 8.0 }
      }
    ]);

    // Team 3 Players - Chennai Super Kings
    const cskPlayers = await Player.insertMany([
      {
        name: 'MS Dhoni',
        role: 'Wicket Keeper',
        jerseyNumber: '7',
        team: team3._id,
        stats: { matches: 250, runs: 5087, wickets: 0, average: 42.5, battingAverage: 42.5, bowlingAverage: 0, strikeRate: 137.5, economy: 0 }
      },
      {
        name: 'Ravindra Jadeja',
        role: 'All-rounder',
        jerseyNumber: '8',
        team: team3._id,
        stats: { matches: 220, runs: 3850, wickets: 165, average: 32.5, battingAverage: 32.5, bowlingAverage: 28.5, strikeRate: 128.5, economy: 7.2 }
      },
      {
        name: 'Ruturaj Gaikwad',
        role: 'Batsman',
        jerseyNumber: '77',
        team: team3._id,
        stats: { matches: 35, runs: 1150, wickets: 0, average: 38.5, battingAverage: 38.5, bowlingAverage: 0, strikeRate: 142.5, economy: 0 }
      },
      {
        name: 'Deepak Chahar',
        role: 'Bowler',
        jerseyNumber: '92',
        team: team3._id,
        stats: { matches: 45, runs: 220, wickets: 52, average: 22.5, battingAverage: 10.5, bowlingAverage: 24.8, strikeRate: 125.5, economy: 6.8 }
      },
      {
        name: 'Ambati Rayudu',
        role: 'Batsman',
        jerseyNumber: '1',
        team: team3._id,
        stats: { matches: 180, runs: 4520, wickets: 0, average: 32.5, battingAverage: 32.5, bowlingAverage: 0, strikeRate: 135.2, economy: 0 }
      },
      {
        name: 'Moeen Ali',
        role: 'All-rounder',
        jerseyNumber: '18',
        team: team3._id,
        stats: { matches: 85, runs: 1850, wickets: 75, average: 28.5, battingAverage: 28.5, bowlingAverage: 26.2, strikeRate: 145.5, economy: 7.5 }
      },
      {
        name: 'Shivam Dube',
        role: 'All-rounder',
        jerseyNumber: '24',
        team: team3._id,
        stats: { matches: 25, runs: 520, wickets: 8, average: 28.8, battingAverage: 28.8, bowlingAverage: 35.2, strikeRate: 148.5, economy: 8.2 }
      },
      {
        name: 'Matheesha Pathirana',
        role: 'Bowler',
        jerseyNumber: '88',
        team: team3._id,
        stats: { matches: 15, runs: 45, wickets: 22, average: 15.5, battingAverage: 8.5, bowlingAverage: 18.2, strikeRate: 130.5, economy: 6.5 }
      },
      {
        name: 'Ajinkya Rahane',
        role: 'Batsman',
        jerseyNumber: '27',
        team: team3._id,
        stats: { matches: 180, runs: 4250, wickets: 0, average: 32.5, battingAverage: 32.5, bowlingAverage: 0, strikeRate: 125.5, economy: 0 }
      },
      {
        name: 'Tushar Deshpande',
        role: 'Bowler',
        jerseyNumber: '28',
        team: team3._id,
        stats: { matches: 22, runs: 65, wickets: 25, average: 18.5, battingAverage: 7.2, bowlingAverage: 22.5, strikeRate: 128.5, economy: 7.0 }
      },
      {
        name: 'Maheesh Theekshana',
        role: 'Bowler',
        jerseyNumber: '99',
        team: team3._id,
        stats: { matches: 18, runs: 35, wickets: 20, average: 16.2, battingAverage: 6.5, bowlingAverage: 20.5, strikeRate: 115.5, economy: 5.8 }
      }
    ]);

    // Team 4 Players - Royal Challengers Bangalore
    const rcbPlayers = await Player.insertMany([
      {
        name: 'Virat Kohli',
        role: 'Batsman',
        jerseyNumber: '18',
        team: team4._id,
        stats: { matches: 237, runs: 7265, wickets: 0, average: 38.5, battingAverage: 38.5, bowlingAverage: 0, strikeRate: 138.2, economy: 0 }
      },
      {
        name: 'Faf du Plessis',
        role: 'Batsman',
        jerseyNumber: '28',
        team: team4._id,
        stats: { matches: 180, runs: 4850, wickets: 0, average: 35.2, battingAverage: 35.2, bowlingAverage: 0, strikeRate: 135.5, economy: 0 }
      },
      {
        name: 'Glenn Maxwell',
        role: 'All-rounder',
        jerseyNumber: '32',
        team: team4._id,
        stats: { matches: 95, runs: 2250, wickets: 42, average: 32.5, battingAverage: 32.5, bowlingAverage: 28.5, strikeRate: 155.5, economy: 7.8 }
      },
      {
        name: 'Mohammed Siraj',
        role: 'Bowler',
        jerseyNumber: '13',
        team: team4._id,
        stats: { matches: 58, runs: 180, wickets: 65, average: 18.5, battingAverage: 8.2, bowlingAverage: 23.5, strikeRate: 122.5, economy: 6.2 }
      },
      {
        name: 'Rajat Patidar',
        role: 'Batsman',
        jerseyNumber: '25',
        team: team4._id,
        stats: { matches: 20, runs: 580, wickets: 0, average: 32.5, battingAverage: 32.5, bowlingAverage: 0, strikeRate: 155.5, economy: 0 }
      },
      {
        name: 'Dinesh Karthik',
        role: 'Wicket Keeper',
        jerseyNumber: '21',
        team: team4._id,
        stats: { matches: 220, runs: 4510, wickets: 0, average: 28.5, battingAverage: 28.5, bowlingAverage: 0, strikeRate: 145.5, economy: 0 }
      },
      {
        name: 'Karn Sharma',
        role: 'Bowler',
        jerseyNumber: '5',
        team: team4._id,
        stats: { matches: 45, runs: 280, wickets: 52, average: 22.5, battingAverage: 12.5, bowlingAverage: 24.8, strikeRate: 135.5, economy: 7.2 }
      },
      {
        name: 'Anuj Rawat',
        role: 'Wicket Keeper',
        jerseyNumber: '52',
        team: team4._id,
        stats: { matches: 15, runs: 280, wickets: 0, average: 22.5, battingAverage: 22.5, bowlingAverage: 0, strikeRate: 145.5, economy: 0 }
      },
      {
        name: 'Vijay Kumar',
        role: 'Bowler',
        jerseyNumber: '33',
        team: team4._id,
        stats: { matches: 12, runs: 35, wickets: 15, average: 18.5, battingAverage: 7.5, bowlingAverage: 22.5, strikeRate: 118.5, economy: 6.5 }
      },
      {
        name: 'Suyash Prabhudessai',
        role: 'Batsman',
        jerseyNumber: '17',
        team: team4._id,
        stats: { matches: 18, runs: 380, wickets: 0, average: 25.2, battingAverage: 25.2, bowlingAverage: 0, strikeRate: 138.5, economy: 0 }
      },
      {
        name: 'Akash Deep',
        role: 'Bowler',
        jerseyNumber: '22',
        team: team4._id,
        stats: { matches: 10, runs: 25, wickets: 12, average: 18.5, battingAverage: 6.2, bowlingAverage: 20.5, strikeRate: 125.5, economy: 6.0 }
      }
    ]);

    console.log('Created 44 players (11 for each of 4 teams)');

    // ========================================
    // UPDATE TEAMS WITH CAPTAINS AND PLAYERS
    // ========================================

    await Team.findByIdAndUpdate(team1._id, {
      captain: mumbaiPlayers[0]._id,
      players: mumbaiPlayers.map(p => p._id)
    });

    await Team.findByIdAndUpdate(team2._id, {
      captain: delhiPlayers[0]._id,
      players: delhiPlayers.map(p => p._id)
    });

    await Team.findByIdAndUpdate(team3._id, {
      captain: cskPlayers[0]._id,
      players: cskPlayers.map(p => p._id)
    });

    await Team.findByIdAndUpdate(team4._id, {
      captain: rcbPlayers[0]._id,
      players: rcbPlayers.map(p => p._id)
    });

    console.log('Updated teams with captains and player references');

    // ========================================
    // CREATE TOURNAMENTS
    // ========================================

    const tournament1 = await Tournament.create({
      name: 'Premier Cricket League 2024',
      organizer: 'BCCI',
      startDate: new Date('2024-04-15'),
      endDate: new Date('2024-06-30'),
      location: 'Mumbai, India',
      locationType: 'Stadium',
      type: 'League',
      teams: [team1._id, team2._id, team3._id, team4._id],
      matches: [],
      status: 'Upcoming',
      createdBy: admin._id
    });

    const tournament2 = await Tournament.create({
      name: 'Summer T20 Championship',
      organizer: 'IPL Board',
      startDate: new Date('2024-07-01'),
      endDate: new Date('2024-08-15'),
      location: 'Delhi, India',
      locationType: 'Stadium',
      type: 'Knockout',
      teams: [team1._id, team2._id],
      matches: [],
      status: 'Upcoming',
      createdBy: organizer._id
    });

    const tournament3 = await Tournament.create({
      name: 'Winter Cup 2023',
      organizer: 'Cricket Association',
      startDate: new Date('2023-11-01'),
      endDate: new Date('2023-12-15'),
      location: 'Chennai, India',
      locationType: 'Outdoor',
      type: 'Round Robin',
      teams: [team3._id, team4._id, team1._id],
      matches: [],
      status: 'Completed',
      createdBy: admin._id
    });

    console.log('Created 3 tournaments');

    // ========================================
    // CREATE MATCHES
    // ========================================

    const match1 = await Match.create({
      tournamentId: tournament1._id,
      matchName: 'Opening Match',
      teamA: team1._id,
      teamB: team2._id,
      venue: 'Wankhede Stadium, Mumbai',
      matchDate: new Date('2024-04-15T14:00:00'),
      format: 'T20',
      maxOvers: 20,
      playersPerSide: 11,
      customRules: {
        overTheFenceOut: false,
        lastManStanding: false
      },
      toss: {
        decision: 'Pending'
      },
      currentInnings: 1,
      status: 'Scheduled',
      createdBy: admin._id
    });

    const match2 = await Match.create({
      tournamentId: tournament1._id,
      matchName: 'Match 2',
      teamA: team3._id,
      teamB: team4._id,
      venue: 'M.A. Chidambaram Stadium, Chennai',
      matchDate: new Date('2024-04-16T14:00:00'),
      format: 'T20',
      maxOvers: 20,
      playersPerSide: 11,
      customRules: {
        overTheFenceOut: false,
        lastManStanding: false
      },
      toss: {
        winner: team3._id,
        decision: 'Bat'
      },
      currentInnings: 1,
      status: 'Toss Completed',
      createdBy: admin._id
    });

    const match3 = await Match.create({
      tournamentId: tournament1._id,
      matchName: 'Match 3',
      teamA: team1._id,
      teamB: team3._id,
      venue: ' Brabourne Stadium, Mumbai',
      matchDate: new Date('2024-04-17T14:00:00'),
      format: 'T20',
      maxOvers: 20,
      playersPerSide: 11,
      customRules: {
        overTheFenceOut: false,
        lastManStanding: false
      },
      toss: {
        decision: 'Pending'
      },
      currentInnings: 1,
      status: 'Scheduled',
      createdBy: organizer._id
    });

    const match4 = await Match.create({
      tournamentId: tournament1._id,
      matchName: 'Match 4',
      teamA: team2._id,
      teamB: team4._id,
      venue: 'Arun Jaitley Stadium, Delhi',
      matchDate: new Date('2024-04-18T14:00:00'),
      format: 'T20',
      maxOvers: 20,
      playersPerSide: 11,
      customRules: {
        overTheFenceOut: false,
        lastManStanding: false
      },
      toss: {
        decision: 'Pending'
      },
      currentInnings: 1,
      status: 'Scheduled',
      createdBy: organizer._id
    });

    const match5 = await Match.create({
      tournamentId: tournament3._id,
      matchName: 'Final',
      teamA: team3._id,
      teamB: team4._id,
      venue: 'M.A. Chidambaram Stadium, Chennai',
      matchDate: new Date('2023-12-15T14:00:00'),
      format: 'T20',
      maxOvers: 20,
      playersPerSide: 11,
      customRules: {
        overTheFenceOut: false,
        lastManStanding: false
      },
      toss: {
        winner: team3._id,
        decision: 'Bat'
      },
      currentInnings: 2,
      firstInnings: {
        battingTeam: team4._id,
        bowlingTeam: team3._id,
        totalRuns: 165,
        totalWickets: 7,
        totalOversBowled: 20,
        extrasTotal: 8,
        ballByBall: []
      },
      secondInnings: {
        battingTeam: team3._id,
        bowlingTeam: team4._id,
        totalRuns: 168,
        totalWickets: 4,
        totalOversBowled: 18.5,
        extrasTotal: 5,
        ballByBall: []
      },
      status: 'Completed',
      result: {
        winner: team3._id,
        margin: 'Chennai Super Kings won by 6 wickets',
        isDraw: false
      },
      createdBy: admin._id
    });

    // Update tournaments with matches
    await Tournament.findByIdAndUpdate(tournament1._id, {
      matches: [match1._id, match2._id, match3._id, match4._id]
    });

    await Tournament.findByIdAndUpdate(tournament3._id, {
      matches: [match5._id]
    });

    console.log('Created 5 matches');

    // ========================================
    // CREATE FRIENDS
    // ========================================

    const friendsData = [
      {
        from: admin._id,
        to: organizer._id,
        status: 'accepted'
      },
      {
        from: organizer._id,
        to: viewer._id,
        status: 'accepted'
      },
      {
        from: admin._id,
        to: user1._id,
        status: 'accepted'
      },
      {
        from: user1._id,
        to: user2._id,
        status: 'pending'
      },
      {
        from: user2._id,
        to: user3._id,
        status: 'accepted'
      }
    ];

    await Friend.insertMany(friendsData);

    // Update user friends arrays
    await User.findByIdAndUpdate(admin._id, {
      friends: [organizer._id, user1._id]
    });
    await User.findByIdAndUpdate(organizer._id, {
      friends: [admin._id, viewer._id]
    });
    await User.findByIdAndUpdate(viewer._id, {
      friends: [organizer._id]
    });
    await User.findByIdAndUpdate(user2._id, {
      friends: [user3._id]
    });
    await User.findByIdAndUpdate(user3._id, {
      friends: [user2._id]
    });

    console.log('Created 5 friend relationships');

    // ========================================
    // CREATE CLUBS
    // ========================================

    const clubsData = [
      {
        name: 'Cricket Enthusiasts Club',
        description: 'A club for cricket lovers and tournament organizers',
        members: [admin._id, organizer._id, user1._id],
        createdBy: admin._id
      },
      {
        name: 'Tournament Managers',
        description: 'Professional tournament management and organization',
        members: [organizer._id, user1._id],
        createdBy: organizer._id
      },
      {
        name: 'Mumbai Fans Association',
        description: 'Supporting Mumbai Thunder through thick and thin',
        members: [admin._id, user2._id, user3._id],
        createdBy: admin._id
      },
      {
        name: 'Cricket Analytics Group',
        description: 'Data-driven insights and match analysis',
        members: [user1._id, user4._id, user5._id],
        createdBy: user1._id
      }
    ];

    await Club.insertMany(clubsData);

    console.log('Created 4 clubs');

    // ========================================
    // SUMMARY
    // ========================================

    console.log('\n===========================================');
    console.log('Database seeded successfully!');
    console.log('===========================================');
    console.log('\nUsers (7 total):');
    console.log('- Admin: admin@example.com / admin123');
    console.log('- Organizer: organizer@example.com / organizer123');
    console.log('- Viewer: viewer@example.com / viewer123');
    console.log('- Suraj: surajsharma424255@gmail.com / user123');
    console.log('- Player1: player1@example.com / player123');
    console.log('- Player2: player2@example.com / player234');
    console.log('- Player3: player3@example.com / player345');
    console.log('\nTeams (4):');
    console.log('- Mumbai Thunder (captain: Rohit Sharma)');
    console.log('- Delhi Capitals (captain: Rishabh Pant)');
    console.log('- Chennai Super Kings (captain: MS Dhoni)');
    console.log('- Royal Challengers Bangalore (captain: Virat Kohli)');
    console.log('\nTournaments (3):');
    console.log('- Premier Cricket League 2024 (League, Upcoming)');
    console.log('- Summer T20 Championship (Knockout, Upcoming)');
    console.log('- Winter Cup 2023 (Round Robin, Completed)');
    console.log('\nMatches (5):');
    console.log('- Opening Match: Mumbai Thunder vs Delhi Capitals');
    console.log('- Match 2: Chennai Super Kings vs RCB');
    console.log('- Match 3: Mumbai Thunder vs Chennai Super Kings');
    console.log('- Match 4: Delhi Capitals vs RCB');
    console.log('- Final: Chennai Super Kings vs RCB (Completed)');
    console.log('\nPlayers (44): 11 for each team');
    console.log('Clubs (4)');
    console.log('===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedData();

