import express from 'express';
import { protect } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';
import * as adminController from '../controllers/adminController';
import * as userController from '../controllers/userController';
import { DataExportService } from '../utils/dataExport';

const router = express.Router();

router.get('/membership-prices', protect, isAdmin, adminController.getMembershipPrices);
router.post('/membership-prices', protect, isAdmin, adminController.updateMembershipPrices);

router.get('/users', protect, isAdmin, userController.getUsers);
router.patch('/users/:id/role', protect, isAdmin, userController.updateRole);
router.get('/export/users', protect, isAdmin, (req, res) => DataExportService.exportUsers(res, 'csv'));

// Payments report - aggregate from users
import User from '../models/User';

router.get('/payments', protect, isAdmin, async (req, res) => {
  try {
    const payments = await User.aggregate([
      { $unwind: '$paymentHistory' },
      { $sort: { 'paymentHistory.date': -1 } },
      { $limit: 50 },
      { $project: {
        userId: '$_id',
        username: 1,
        email: 1,
        amount: '$paymentHistory.amount',
        currency: '$paymentHistory.currency',
        level: '$paymentHistory.level',
        date: '$paymentHistory.date',
        status: '$paymentHistory.status'
      }}
    ]);
    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

