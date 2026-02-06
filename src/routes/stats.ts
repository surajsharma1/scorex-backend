import express from 'express';
import Tournament from '../models/Tournament';
import User from '../models/User';

const router = express.Router();

router.get('/tournaments', async (req, res) => {
  try {
    const stats = await Tournament.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      totalTournaments: stats.reduce((sum, stat) => sum + stat.count, 0),
      activeTournaments: stats.find(stat => stat._id === 'active')?.count || 0,
      completedTournaments: stats.find(stat => stat._id === 'completed')?.count || 0,
      upcomingTournaments: stats.find(stat => stat._id === 'upcoming')?.count || 0,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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