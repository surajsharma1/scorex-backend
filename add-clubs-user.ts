import 'dotenv/config';
import connectDB from './src/config/database';
import User from './src/models/User';
import Club from './src/models/Club';

const addClubsUser = async () => {
  try {
    await connectDB();
    console.log('Connected to DB');

    // Create test user for clubs
    let user = await User.findOne({ email: 'clubtest@example.com' });
    if (!user) {
      user = await User.create({
        username: 'clubtest',
        email: 'clubtest@example.com',
        password: 'password123', // Will be hashed
        fullName: 'Club Test User',
        verified: true
      });
      console.log('✅ Created test user:', user.email);
    }

    // Create test club for user
    let club = await Club.findOne({ name: 'Test Cricket Club' });
    if (!club) {
      club = await Club.create({
        name: 'Test Cricket Club',
        description: 'Test club for ScoreX platform',
        type: 'public',
        owner: user._id,
        members: [user._id],
        isActive: true
      });
      console.log('✅ Created test club:', club.name);
    }

    console.log('✅ Setup complete!');
    console.log('User ID:', user._id);
    console.log('Club ID:', club._id);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
};

addClubsUser();

