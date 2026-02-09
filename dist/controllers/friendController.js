"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeFriend = exports.getFriendRequests = exports.getFriends = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Friend_1 = __importDefault(require("../models/Friend"));
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
const sendFriendRequest = async (req, res) => {
    try {
        const { toUserId } = req.body;
        const fromUserId = req.user._id;
        if (!toUserId) {
            return res.status(400).json({ message: 'Recipient user ID is required' });
        }
        if (toUserId === fromUserId) {
            return res.status(400).json({ message: 'Cannot send friend request to yourself' });
        }
        // Check if users exist
        const [fromUser, toUser] = await Promise.all([
            User_1.default.findById(fromUserId),
            User_1.default.findById(toUserId)
        ]);
        if (!fromUser || !toUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if request already exists
        const existingRequest = await Friend_1.default.findOne({
            $or: [
                { from: fromUserId, to: toUserId },
                { from: toUserId, to: fromUserId }
            ]
        });
        if (existingRequest) {
            return res.status(400).json({ message: 'Friend request already exists' });
        }
        const friendRequest = new Friend_1.default({ from: fromUserId, to: toUserId });
        await friendRequest.save();
        logger_1.default.info(`Friend request sent from ${fromUserId} to ${toUserId}`);
        res.status(201).json({ message: 'Friend request sent', friendRequest });
    }
    catch (error) {
        logger_1.default.error('Error sending friend request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.sendFriendRequest = sendFriendRequest;
const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user?._id;
        const friendRequest = await Friend_1.default.findById(requestId);
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
            User_1.default.findByIdAndUpdate(friendRequest.from, { $addToSet: { friends: friendRequest.to } }),
            User_1.default.findByIdAndUpdate(friendRequest.to, { $addToSet: { friends: friendRequest.from } })
        ]);
        logger_1.default.info(`Friend request accepted: ${requestId}`);
        res.json({ message: 'Friend request accepted', friendRequest });
    }
    catch (error) {
        logger_1.default.error('Error accepting friend request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.acceptFriendRequest = acceptFriendRequest;
const rejectFriendRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id.toString();
        const friendRequest = await Friend_1.default.findById(requestId);
        if (!friendRequest) {
            return res.status(404).json({ message: 'Friend request not found' });
        }
        if (friendRequest.to.toString() !== userId) {
            return res.status(403).json({ message: 'Not authorized to reject this request' });
        }
        await Friend_1.default.findByIdAndDelete(requestId);
        logger_1.default.info(`Friend request rejected: ${requestId}`);
        res.json({ message: 'Friend request rejected' });
    }
    catch (error) {
        logger_1.default.error('Error rejecting friend request:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.rejectFriendRequest = rejectFriendRequest;
const getFriends = async (req, res) => {
    try {
        const userId = req.user?._id;
        logger_1.default.info(`Getting friends for user: ${userId}`);
        if (!userId) {
            logger_1.default.warn('User not authenticated in getFriends');
            return res.status(401).json({ message: 'User not authenticated' });
        }
        // Check database connection
        if (mongoose_1.default.connection.readyState !== 1) {
            logger_1.default.error('Database not connected - readyState:', mongoose_1.default.connection.readyState);
            return res.status(500).json({ message: 'Database connection error' });
        }
        // First, get the user without populate to check if they exist
        const user = await User_1.default.findById(userId);
        if (!user) {
            logger_1.default.warn(`User not found: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }
        logger_1.default.info(`User found, friends array length: ${user.friends?.length || 0}`);
        // Now populate the friends
        const populatedUser = await User_1.default.findById(userId).populate('friends', 'username profilePicture bio');
        if (!populatedUser) {
            logger_1.default.warn(`User not found after populate: ${userId}`);
            return res.status(404).json({ message: 'User not found' });
        }
        logger_1.default.info(`Found ${populatedUser.friends.length} friends for user: ${userId}`);
        const friends = Array.isArray(populatedUser.friends) ? populatedUser.friends : [];
        res.json({ friends });
    }
    catch (error) {
        logger_1.default.error('Error getting friends:', error);
        // More detailed error response for debugging
        res.status(500).json({
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.getFriends = getFriends;
const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user?._id;
        const requests = await Friend_1.default.find({ to: userId, status: 'pending' })
            .populate('from', 'username profilePicture bio');
        res.json({ requests });
    }
    catch (error) {
        logger_1.default.error('Error getting friend requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getFriendRequests = getFriendRequests;
const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user?._id;
        // Remove from both users' friends arrays
        await Promise.all([
            User_1.default.findByIdAndUpdate(userId, { $pull: { friends: friendId } }),
            User_1.default.findByIdAndUpdate(friendId, { $pull: { friends: userId } })
        ]);
        // Delete any friend requests between them
        await Friend_1.default.deleteMany({
            $or: [
                { from: userId, to: friendId },
                { from: friendId, to: userId }
            ]
        });
        logger_1.default.info(`Friend removed: ${userId} removed ${friendId}`);
        res.json({ message: 'Friend removed' });
    }
    catch (error) {
        logger_1.default.error('Error removing friend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.removeFriend = removeFriend;
//# sourceMappingURL=friendController.js.map