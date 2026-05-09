/**
 * Friend Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. rejectFriendRequest set status to 'blocked' instead of 'rejected'
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Friend from '../models/Friend';
import User from '../models/User';


export const getFriends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const friendships = await Friend.find({
      $or: [{ requester: userId, status: 'accepted' }, { recipient: userId, status: 'accepted' }]
    })
      .populate('requester', 'username email fullName profilePicture isOnline lastSeen')
      .populate('recipient', 'username email fullName profilePicture isOnline lastSeen')
      .sort({ createdAt: -1 });

    const friends = friendships.map((f) => {
      const friend = (f.requester as any)._id.toString() === userId ? f.recipient : f.requester;
      return { _id: f._id, friend, since: f.createdAt };
    });

    res.json({ success: true, data: friends });
  } catch (error) { next(error); }
};

export const getFriendRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const [incoming, outgoing] = await Promise.all([
      Friend.find({ recipient: userId, status: 'pending' }).populate('requester', 'username email fullName profilePicture').sort({ createdAt: -1 }),
      Friend.find({ requester: userId, status: 'pending' }).populate('recipient', 'username email fullName profilePicture').sort({ createdAt: -1 }),
    ]);

    res.json({
      success: true,
      data: {
        incoming: incoming.map((r: any) => ({ _id: r._id, user: r.requester, sentAt: r.createdAt })),
        outgoing: outgoing.map((r: any) => ({ _id: r._id, user: r.recipient, sentAt: r.createdAt })),
      }
    });
  } catch (error) { next(error); }
};

export const sendFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
  const { userId } = req.params;
    const requesterId = req.user?.id;

    if (userId === requesterId) return res.status(400).json({ success: false, message: 'Cannot send friend request to yourself' });

    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const existing = await Friend.findOne({
      $or: [{ requester: requesterId, recipient: userId }, { requester: userId, recipient: requesterId }]
    });

    if (existing) {
      const msg = existing.status === 'accepted' ? 'Already friends'
        : existing.status === 'pending' ? 'Friend request already pending'
        : 'Friend request was previously processed';
      return res.status(400).json({ success: false, message: msg });
    }

    const friendship = await Friend.create({ requester: requesterId, recipient: userId, status: 'pending' });
    await friendship.populate('requester', 'username email fullName');

    const io = req.app.get('io');
    if (io) io.to(`user:${userId}`).emit('notification', {
      type: 'friend_request',
      message: `${(friendship.requester as any).username} sent you a friend request`,
      from: requesterId
    });

    res.status(201).json({ success: true, message: 'Friend request sent', data: friendship });
  } catch (error) { next(error); }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const friendship = await Friend.findById(req.params.id);
    if (!friendship) return res.status(404).json({ success: false, message: 'Friend request not found' });
    if (friendship.recipient.toString() !== req.user?.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (friendship.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    friendship.status = 'accepted';
    await friendship.save();
    await friendship.populate('requester', 'username email fullName');

    const io = req.app.get('io');
    if (io) io.to(`user:${(friendship.requester as any)._id}`).emit('notification', { type: 'friend_accepted', message: 'Your friend request was accepted' });

    res.json({ success: true, message: 'Friend request accepted', data: friendship });
  } catch (error) { next(error); }
};

// FIX #1: was setting status to 'blocked' — should be 'rejected'
export const rejectFriendRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const friendship = await Friend.findById(req.params.id);
    if (!friendship) return res.status(404).json({ success: false, message: 'Friend request not found' });
    if (friendship.recipient.toString() !== req.user?.id) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (friendship.status !== 'pending') return res.status(400).json({ success: false, message: 'Request already processed' });

    friendship.status = 'rejected';  // FIX: was 'blocked' which is wrong and a TypeScript cast hack
    await friendship.save();

    res.json({ success: true, message: 'Friend request rejected' });
  } catch (error) { next(error); }
};

export const removeFriend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const friendship = await Friend.findById(req.params.id);
    if (!friendship) return res.status(404).json({ success: false, message: 'Friendship not found' });
    const isParticipant = friendship.requester.toString() === req.user?.id || friendship.recipient.toString() === req.user?.id;
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Not authorized' });
    await friendship.deleteOne();
    res.json({ success: true, message: 'Friend removed' });
  } catch (error) { next(error); }
};

export const searchUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const userId = req.user?.id;
    if (!q) return res.status(400).json({ success: false, message: 'Search query required' });

    const users = await User.find({
      _id: { $ne: userId },
      $or: [{ username: { $regex: q, $options: 'i' } }, { fullName: { $regex: q, $options: 'i' } }]
    }).select('username email fullName profilePicture').limit(20);

    const friendships = await Friend.find({ $or: [{ requester: userId }, { recipient: userId }] });
    const friendUserIds = new Set(friendships.flatMap(f => [f.requester.toString(), f.recipient.toString()]));
    const results = users.filter(u => !friendUserIds.has(u._id.toString()));

    res.json({ success: true, data: results });
  } catch (error) { next(error); }
};

export const getOnlineFriends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const friendships = await Friend.find({ $or: [{ requester: userId, status: 'accepted' }, { recipient: userId, status: 'accepted' }] });
    const friendIds = friendships.flatMap(f => [f.requester.toString(), f.recipient.toString()]).filter(id => id !== userId);
    const onlineFriends = await User.find({ _id: { $in: friendIds }, isOnline: true }).select('username email fullName profilePicture');
    res.json({ success: true, data: onlineFriends });
  } catch (error) { next(error); }
};

export default { getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, searchUsers, getOnlineFriends };
