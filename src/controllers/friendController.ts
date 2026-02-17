import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Friend from '../models/Friend';
import User from '../models/User';
import logger from '../utils/logger';
import { AuthRequest } from '../middleware/auth';

export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = (req.user as any)._id;

    if (!toUserId) {
      return res.status(400).json({ message: 'Recipient user ID is required' });
    }

    if (toUserId === fromUserId) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }

    // Check if users exist
    const [fromUser, toUser] = await Promise.all([
      User.findById(fromUserId),
      User.findById(toUserId)
    ]);

    if (!fromUser || !toUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if request already exists
    const existingRequest = await Friend.findOne({
      $or: [
        { from: fromUserId, to: toUserId },
        { from: toUserId, to: fromUserId }
      ]
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const friendRequest = new Friend({ from: fromUserId, to: toUserId });
    await friendRequest.save();

    logger.info(`Friend request sent from ${fromUserId} to ${toUserId}`);
    res.status(201).json({ message: 'Friend request sent', friendRequest });
  } catch (error) {
    logger.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = (req.user as any)?._id?.toString();

    const friendRequest = await Friend.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.to.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add to friends arrays
    await Promise.all([
      User.findByIdAndUpdate(friendRequest.from, { $addToSet: { friends: friendRequest.to } }),
      User.findByIdAndUpdate(friendRequest.to, { $addToSet: { friends: friendRequest.from } })
    ]);

    logger.info(`Friend request accepted: ${requestId}`);
    res.json({ message: 'Friend request accepted', friendRequest });
  } catch (error) {
    logger.error('Error accepting friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = (req.user as any)._id.toString();

    const friendRequest = await Friend.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.to.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }

    await Friend.findByIdAndDelete(requestId);

    logger.info(`Friend request rejected: ${requestId}`);
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    logger.error('Error rejecting friend request:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.user as any)?._id;

    logger.info(`Getting friends for user: ${userId}`);

    if (!userId) {
      logger.warn('User not authenticated in getFriends');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      logger.error('Database not connected - readyState:', mongoose.connection.readyState);
      return res.status(500).json({ message: 'Database connection error' });
    }

    // First, get the user without populate to check if they exist
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User not found: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`User found, friends array length: ${user.friends?.length || 0}`);

    // Now populate the friends
    const populatedUser = await User.findById(userId).populate('friends', 'username profilePicture bio');
    if (!populatedUser) {
      logger.warn(`User not found after populate: ${userId}`);
      return res.status(404).json({ message: 'User not found' });
    }

    logger.info(`Found ${populatedUser.friends.length} friends for user: ${userId}`);

    const friends = Array.isArray(populatedUser.friends) ? populatedUser.friends : [];
    res.json({ friends });
  } catch (error) {
    logger.error('Error getting friends:', error);
    // More detailed error response for debugging
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const getFriendRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const requests = await Friend.find({ to: userId, status: 'pending' })
      .populate('from', 'username profilePicture bio');

    res.json({ requests });
  } catch (error) {
    logger.error('Error getting friend requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const { friendId } = req.params;
    const userId = (req.user as any)?._id;

    // Remove from both users' friends arrays
    await Promise.all([
      User.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: userId } })
    ]);

    // Delete any friend requests between them
    await Friend.deleteMany({
      $or: [
        { from: userId, to: friendId },
        { from: friendId, to: userId }
      ]
    });

    logger.info(`Friend removed: ${userId} removed ${friendId}`);
    res.json({ message: 'Friend removed' });
  } catch (error) {
    logger.error('Error removing friend:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
