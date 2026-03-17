import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import Tournament from './src/models/Tournament';
import Team from './src/models/Team';
import Match from './src/models/Match';

const seedMatches = async () => {
  try {
    await connectDB();
    console.log('Seeding TEST MATCHES...');

    // Create test teams if missing
    let team1 = await Team.findOne({ shortName: 'CSK' });
    if (!team1) team1 = await Team.create({
      name: 'Chennai Super Kings',
      shortName: 'CSK',
      logo: 'https://via.placeholder.com/64x64/ff6b6b/ffffff?text=CSK'
    });
    
    let team2 = await Team.findOne({ shortName: 'MI' });
    if (!team2) team2 = await Team.create({
      name: 'Mumbai Indians',
      shortName: 'MI',
      logo: 'https://via.placeholder.com/64x64/4834d4/ffffff?text=MI'
    });

    let team3 = await Team.findOne({ shortName: 'RCB' });
    if (!team3) team3 = await Team.create({
      name: 'Royal Challengers Bangalore',
      shortName: 'RCB',
      logo: 'https://via.placeholder.com/64x64/e74c3c/ffffff?text=RCB'
    });

    // Create test tournament if missing
    let tournament = await Tournament.findOne({ shortName: 'TEST2024' });
    if (!tournament) tournament = await Tournament.create({
      name: 'Test Tournament 2024',
      shortName: 'TEST2024',
      organizer: 'Test Org',
      format: 'T20',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7*24*60*60*1000)
    });

    // Create LIVE test matches
    const testMatches = [
      {
        name: 'CSK vs MI - Qualifier 1',
        team1: team1._id,
        team2: team2._id,
        tournamentId: tournament._id,
        status: 'live',
        team1Score: 156,
        team1Wickets: 3,
        team1Overs: '15.2',
        team2Score: 89,
        team2Wickets: 4,
        team2Overs: '10.4',
        strikerName: 'Ruturaj Gaikwad',
        strikerRuns: 67,
        bowlerName: 'Jasprit Bumrah',
        bowlerWickets: 2
      },
      {
        name: 'MI vs RCB - Eliminator',
        team1: team2._id,
        team2: team3._id,
        tournamentId: tournament._id,
        status: 'upcoming',
        scheduledStart: new Date(Date.now() + 2*60*60*1000)
      }
    ];

    for (const matchData of testMatches) {
      const existing = await Match.findOne({ name: matchData.name });
      if (!existing) {
        await Match.create(matchData);
        console.log(`✅ Created match: ${matchData.name}`);
      } else {
        console.log(`⏭️  Skip existing: ${matchData.name}`);
      }
    }

    console.log('\n🎉 2 LIVE test matches seeded!');
    console.log('Live: CSK vs MI (Qualifier 1) | Upcoming: MI vs RCB');
    console.log('✅ Ready for overlay testing!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Seed matches error:', error);
    process.exit(1);
  }
};

seedMatches();

