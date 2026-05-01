import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';
import User from '../models/User';
import Tournament from '../models/Tournament';
import Match from '../models/Match';

const PRICES_FILE = path.join(process.cwd(), 'public', 'membership-prices.json');

const DEFAULT_MEMBERSHIP_PLANS = {
  1: {
    '1day':   { price: 149,   discount: 0 },
    '1week':  { price: 499,   discount: 0 },
    '1month': { price: 1499,  discount: 0 },
    '3month': { price: 3999,  discount: 0 },
    '6month': { price: 6999,  discount: 0 },
    '1year':  { price: 11999, discount: 0 },
  },
  2: {
    '1day':   { price: 249,   discount: 0 },
    '1week':  { price: 999,   discount: 0 },
    '1month': { price: 2499,  discount: 0 },
    '3month': { price: 6999,  discount: 0 },
    '6month': { price: 11999, discount: 0 },
    '1year':  { price: 19999, discount: 0 },
  },
};

async function loadPrices() {
  try {
    const data = await fs.readFile(PRICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    await fs.writeFile(PRICES_FILE, JSON.stringify(DEFAULT_MEMBERSHIP_PLANS, null, 2));
    return DEFAULT_MEMBERSHIP_PLANS;
  }
}

async function savePrices(plans: any) {
  await fs.writeFile(PRICES_FILE, JSON.stringify(plans, null, 2));
}

/**
 * GET /api/v1/admin/membership-prices
 */
export const getMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prices = await loadPrices();
    res.json({ 
      success: true, 
      prices
    });
    // Cache public prices for 1 hour
    res.set({
      'Cache-Control': 'public, max-age=3600, immutable',
      'Vary': 'Accept-Encoding'
    });

  } catch (error) { 
    next(error); 
  }
};

/**
 * POST /api/v1/admin/membership-prices
 */
export const updateMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prices } = req.body;
    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid prices data' });
    }
    await savePrices(prices);
    res.json({ success: true, message: 'Membership prices updated' });
  } catch (error) { 
    next(error); 
  }
};

// --- FIX: ADDED MISSING DASHBOARD STATS LOGIC ---
export const getStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await User.countDocuments();
    const premiumUsers = await User.countDocuments({ membershipLevel: { $gt: 0 } });
    const enterpriseUsers = await User.countDocuments({ membershipLevel: 2 });
    
    const tournaments = await Tournament.countDocuments();
    const activeTournaments = await Tournament.countDocuments({ status: 'ongoing' });
    
    const matches = await Match.countDocuments();
    const liveMatches = await Match.countDocuments({ status: 'live' });
    
    let revenue = 0;
    const usersWithHistory = await User.find({ paymentHistory: { $exists: true, $not: { $size: 0 } } });
    usersWithHistory.forEach(u => {
      u.paymentHistory?.forEach((p: any) => {
        if (p.status === 'completed') revenue += p.amount;
      });
    });

    res.json({ users, premiumUsers, enterpriseUsers, tournaments, activeTournaments, matches, liveMatches, revenue });
  } catch (error) { next(error); }
};

// --- FIX: ADDED MISSING LOGS LOGIC (Resolves 500 Error) ---
export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    let logs: any[] = [];
    try {
      const files = await fs.readdir(logDir);
      for (const file of files) {
        const stats = await fs.stat(path.join(logDir, file));
        logs.push({ name: file, size: stats.size, mtime: stats.mtime });
      }
    } catch {
      // Fallback if directory doesn't exist
      logs = [{ name: 'System logs are routed to Render dashboard.', size: 0, mtime: new Date().toISOString() }];
    }
    res.json({ success: true, data: logs });
  } catch (error) { next(error); }
};


/**
 * POST /api/v1/admin/notifications/broadcast
 * Admin sends a notification to ALL users
 */
export const broadcastNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, message, link } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }
    // Get all user IDs
    const users = await User.find({}, '_id');
    const Notification = (await import('../models/Notification')).default;
    const docs = users.map(u => ({
      user: u._id,
      type: 'system' as const,
      title,
      message,
      link: link || undefined,
      isRead: false,
    }));
    await Notification.insertMany(docs);
    res.json({ success: true, message: `Notification sent to ${docs.length} users` });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/notifications/:id
 * Admin deletes a broadcast notification from all users
 */
export const deleteNotification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Notification = (await import('../models/Notification')).default;
    await Notification.deleteMany({ _id: req.params.id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
};

export default { getMembershipPrices, updateMembershipPrices, getStats, getLogs, broadcastNotification, deleteNotification };

