import express from 'express';
import { protect } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';
import * as adminController from '../controllers/adminController';
import * as userController from '../controllers/userController';
import * as tournamentController from '../controllers/tournamentController';
import * as matchController from '../controllers/matchController';
import { DataExportService } from '../utils/dataExport';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/User';

const router = express.Router();

router.get('/membership-prices', protect, isAdmin, adminController.getMembershipPrices);
router.post('/membership-prices', protect, isAdmin, adminController.updateMembershipPrices);

router.get('/users', protect, isAdmin, userController.getUsers);
router.patch('/users/:id/role', protect, isAdmin, userController.updateRole);
router.get('/export/users', protect, isAdmin, (req, res) => DataExportService.exportUsers(res, 'csv'));

// User management
router.post('/users/:id/ban', protect, isAdmin, userController.banUser);
router.post('/users/:id/unban', protect, isAdmin, userController.unbanUser);

// Membership assign
router.patch('/users/:id/membership', protect, isAdmin, userController.updateMembership);

// Tournament/Match admin delete
router.delete('/tournaments/:id', protect, isAdmin, tournamentController.deleteTournament);
router.delete('/matches/:id', protect, isAdmin, matchController.deleteMatch);

// Payments CSV export
router.get('/export/payments', protect, isAdmin, (req, res) => DataExportService.exportPayments(res, 'csv'));

// Logs
router.get('/logs', protect, isAdmin, async (req, res) => {
  try {
    const logsPath = path.join(process.cwd(), 'logs');
    const logFiles = await fs.readdir(logsPath);
    res.json({ success: true, data: logFiles.slice(-20) }); // Last 20 logs
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Log download
router.get('/logs/:filename', protect, isAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    const logsPath = path.join(process.cwd(), 'logs', filename);
    
    // Security: validate filename
    if (!filename.match(/^[a-zA-Z0-9\-_.]+\.log$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    
    const data = await fs.readFile(logsPath, 'utf8');
    
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="scorex-${filename}"`,
      'Content-Length': data.length
    });
    res.status(200).send(data);
  } catch (error) {
    console.error('Log download error:', error);
    res.status(404).json({ message: 'Log file not found' });
  }
});

// Payments report
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

