import express from 'express';
import Tournament from '../models/Tournament';
import User from '../models/User';

const router = express.Router();

// Get tournament stats
router.get('/tournaments', async (req, res) => {
  try {
    const totalTournaments = await Tournament.countDocuments();
    const activeTournaments = await Tournament.countDocuments({ status: 'active' });
    const completedTournaments = await Tournament.countDocuments({ status: 'completed' });
    res.json({ totalTournaments, activeTournaments, completedTournaments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user stats
router.get('/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const organizerUsers = await User.countDocuments({ role: 'organizer' });
    res.json({ totalUsers, adminUsers, organizerUsers });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;