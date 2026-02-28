import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './src/config/database';
import User from './src/models/User';

const addAdmin = async () => {
  try {
    await connectDB();

    // Find user by email and update to admin
    const email = 'surajsharma424255@gmail.com';
    const user = await User.findOne({ email });

    if (user) {
      user.role = 'admin';
      await user.save();
      console.log(`Updated user ${email} to admin role`);
    } else {
      // Create new admin user if doesn't exist
      const bcrypt = await import('bcryptjs');
      const password = await bcrypt.default.hash('suraj123', 10);
      
      await User.create({
        username: 'suraj',
        email: email,
        password: password,
        role: 'admin',
        profilePicture: 'https://via.placeholder.com/150/FF6600/FFFFFF?text=Suraj',
        bio: 'System administrator.',
        fullName: 'Suraj Sharma',
        dob: new Date('1990-01-15'),
      });
      console.log(`Created new admin user ${email}`);
    }

    console.log('\nAdmin account ready!');
    console.log('Email: surajsharma424255@gmail.com');
    console.log('Password: suraj123');
    console.log('\nPlease login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

addAdmin();
