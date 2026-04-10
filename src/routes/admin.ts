import express from 'express';
import { isAdmin, protect } from '../middleware/auth';
import * as adminController from '../controllers/adminController';
import * as userController from '../controllers/userController';
import * as tournamentController from '../controllers/tournamentController';
import * as matchController from '../controllers/matchController';
import { DataExportService } from '../utils/dataExport';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import User from '../models/User';

const router = express.Router();

// ── Membership prices — GET is public (used on Membership page without auth) ──
router.get('/membership-prices', adminController.getMembershipPrices);
router.post('/membership-prices', protect, isAdmin, adminController.updateMembershipPrices);

// ── User management ──────────────────────────────────────────────────────────
router.get('/users', protect, isAdmin, userController.getUsers);
router.patch('/users/:id/role', protect, isAdmin, userController.updateRole);
router.post('/users/:id/ban', protect, isAdmin, userController.banUser);
router.post('/users/:id/unban', protect, isAdmin, userController.unbanUser);
router.patch('/users/:id/membership', protect, isAdmin, userController.updateMembership);

// ── CSV exports ──────────────────────────────────────────────────────────────
router.get('/export/users', protect, isAdmin, (req, res) => DataExportService.exportUsers(res, 'csv'));
router.get('/export/payments', protect, isAdmin, (req, res) => DataExportService.exportPayments(res, 'csv'));
router.get('/export/tournaments', protect, isAdmin, async (req, res) => {
  try { await DataExportService.exportTournaments(res, 'csv'); }
  catch { res.status(500).json({ message: 'Export failed' }); }
});

// ── Tournament/Match admin delete (bypasses organizer check) ─────────────────
router.delete('/tournaments/:id', protect, isAdmin, tournamentController.deleteTournament);
router.delete('/matches/:id', protect, isAdmin, matchController.deleteMatch);

// ── Payments report ──────────────────────────────────────────────────────────
router.get('/payments', protect, isAdmin, async (req, res) => {
  try {
    const payments = await User.aggregate([
      { $unwind: '$paymentHistory' },
      { $sort: { 'paymentHistory.date': -1 } },
      { $limit: 100 },
      {
        $project: {
          userId: '$_id',
          username: 1,
          email: 1,
          amount: '$paymentHistory.amount',
          currency: '$paymentHistory.currency',
          level: '$paymentHistory.level',
          date: '$paymentHistory.date',
          status: '$paymentHistory.status',
        },
      },
    ]);
    res.json({ success: true, data: payments });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Logs list — returns {name, size, mtime} objects ─────────────────────────
router.get('/logs', protect, isAdmin, async (req, res) => {
  try {
    const logsPath = path.join(process.cwd(), 'logs');

    // Create logs dir if it doesn't exist
    try { await fs.mkdir(logsPath, { recursive: true }); } catch {}

    let entries: string[] = [];
    try { entries = await fs.readdir(logsPath); }
    catch { entries = []; }

    const logFiles = entries.filter(f => f.endsWith('.log') || f.endsWith('.txt'));
    const statResults = await Promise.all(
      logFiles.slice(-20).map(async name => {
        try {
          const stat = await fs.stat(path.join(logsPath, name));
          return { name, size: stat.size, mtime: stat.mtime.toISOString() };
        } catch {
          return { name, size: 0, mtime: '' };
        }
      })
    );

    res.json({ success: true, data: statResults });
  } catch (error) {
    console.error('Logs list error:', error);
    res.status(500).json({ success: false, message: 'Failed to list logs', data: [] });
  }
});

// ── Log download ──────────────────────────────────────────────────────────────
router.get('/logs/:filename', protect, isAdmin, async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!filename.match(/^[a-zA-Z0-9\-_.]+\.(log|txt)$/)) {
      return res.status(400).json({ message: 'Invalid filename' });
    }
    const logsPath = path.join(process.cwd(), 'logs', filename);
    if (!fsSync.existsSync(logsPath)) {
      return res.status(404).json({ message: 'Log file not found' });
    }
    const data = await fs.readFile(logsPath, 'utf8');
    res.set({
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="scorex-${filename}"`,
    });
    res.send(data);
  } catch (error) {
    console.error('Log download error:', error);
    res.status(404).json({ message: 'Log file not found' });
  }
});

export default router;
