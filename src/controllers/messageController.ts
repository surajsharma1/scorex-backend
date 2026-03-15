/**
 * Message Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Entire persistence was in-memory Map — all messages lost on server restart
 *    — Now uses the Message mongoose model that already exists in the codebase
 * 2. Used (req as any).user._id — auth middleware sets req.user.id (string), not ._id
 * 3. Response format was inconsistent with rest of API (no success wrapper)
 */

import { Request, Response, NextFunction } from 'express';
import Message from '../models/Message';
import User from '../models/User';

interface AuthRequest extends Request { user?: any; }

// GET /messages/conversations
export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // FIX: was req.user._id

    // Find all messages where user is sender or recipient
    const msgs = await Message.find({
      $or: [{ sender: userId }, { recipient: userId }]
    }).sort({ createdAt: -1 });

    // Group by conversation partner
    const partnerMap = new Map<string, any>();
    for (const msg of msgs) {
      const partnerId = msg.sender.toString() === userId
        ? msg.recipient?.toString()
        : msg.sender.toString();

      if (!partnerId || partnerMap.has(partnerId)) continue;

      const unreadCount = await Message.countDocuments({
        sender: partnerId, recipient: userId, isRead: false
      });

      partnerMap.set(partnerId, { lastMessage: msg, unreadCount, partnerId });
    }

    // Populate partner user details
    const conversations = await Promise.all(
      Array.from(partnerMap.values()).map(async ({ lastMessage, unreadCount, partnerId }) => {
        const partner = await User.findById(partnerId).select('username fullName profilePicture isOnline');
        if (!partner) return null;
        return { user: partner, lastMessage, unreadCount };
      })
    );

    res.json({ success: true, data: conversations.filter(Boolean) });
  } catch (error) { next(error); }
};

// GET /messages/:userId
export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // FIX: was req.user._id
    const targetUserId = req.params.userId;
    if (!targetUserId) return res.status(400).json({ success: false, message: 'Target user ID required' });

    // FIX: query from database, not in-memory Map
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: targetUserId },
        { sender: targetUserId, recipient: userId }
      ]
    })
      .populate('sender', 'username fullName profilePicture')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: messages });
  } catch (error) { next(error); }
};

// POST /messages
export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // FIX: was req.user._id
    const { toUserId, content } = req.body;
    if (!toUserId || !content?.trim()) return res.status(400).json({ success: false, message: 'Recipient and content required' });

    const recipient = await User.findById(toUserId);
    if (!recipient) return res.status(404).json({ success: false, message: 'Recipient not found' });

    // FIX: persist to MongoDB, not in-memory Map
    const message = await Message.create({ sender: userId, recipient: toUserId, content: content.trim(), isRead: false });
    await message.populate('sender', 'username fullName profilePicture');

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${toUserId}`).emit('newMessage', message.toObject());
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) { next(error); }
};

// PUT /messages/:conversationId/read
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // FIX: was req.user._id
    const senderId = req.params.conversationId;

    // FIX: update in database, not in-memory Map
    const result = await Message.updateMany(
      { sender: senderId, recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) { next(error); }
};

// DELETE /messages/:messageId
export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id; // FIX: was req.user._id
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });
    if (message.sender.toString() !== userId) return res.status(403).json({ success: false, message: 'Not authorized' });

    // FIX: delete from database, not filter from Map
    await message.deleteOne();
    res.json({ success: true });
  } catch (error) { next(error); }
};

export default { getConversations, getMessages, sendMessage, markAsRead, deleteMessage };
