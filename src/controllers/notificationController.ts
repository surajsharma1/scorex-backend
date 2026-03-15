/**
 * Notification Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Used (req as any).user._id — auth middleware sets req.user.id
 * 2. Was concatenated with clubController.ts in original file
 */

import { Request, Response } from 'express';
import Notification from '../models/Notification';

interface AuthRequest extends Request { user?: any; }

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // FIX: was (req as any).user._id
    const notifications = await Notification.find({ user: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user?.id }, // FIX: scope to owner
      { isRead: true },
      { new: true }
    );
    if (!notification) { res.status(404).json({ success: false, message: 'Notification not found' }); return; }
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany({ user: req.user?.id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
