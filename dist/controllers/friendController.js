"use strict";
/**
* Friend Controller
* Friends management system
* Following PROJECT_ALGORITHM.md specifications
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOnlineFriends = exports.searchUsers = exports.removeFriend = exports.rejectFriendRequest = exports.acceptFriendRequest = exports.sendFriendRequest = exports.getFriendRequests = exports.getFriends = void 0;
const Friend_1 = __importDefault(require("../models/Friend"));
const User_1 = __importDefault(require("../models/User"));
// @desc    Get friends list
// @route   GET /api/v1/friends
// @access  Private
const getFriends = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const friendships = await Friend_1.default.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        })
            .populate('requester', 'username email fullName profilePicture isOnline lastSeen')
            .populate('recipient', 'username email fullName profilePicture isOnline lastSeen')
            .sort({ createdAt: -1 });
        // Transform to get friend details
        const friends = friendships.map((f) => {
            const friend = f.requester._id.toString() === userId ? f.recipient : f.requester;
            return {
                _id: f._id,
                friend: {
                    _id: friend._id,
                    username: friend.username,
                    email: friend.email,
                    fullName: friend.fullName,
                    profilePicture: friend.profilePicture,
                    isOnline: friend.isOnline,
                    lastSeen: friend.lastSeen
                },
                since: f.createdAt
            };
        });
        res.json({
            success: true,
            data: friends
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFriends = getFriends;
// @desc    Get pending friend requests
// @route   GET /api/v1/friends/requests
// @access  Private
const getFriendRequests = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        // Get incoming requests
        const incoming = await Friend_1.default.find({ recipient: userId, status: 'pending' })
            .populate('requester', 'username email fullName profilePicture')
            .sort({ createdAt: -1 });
        // Get outgoing requests
        const outgoing = await Friend_1.default.find({ requester: userId, status: 'pending' })
            .populate('recipient', 'username email fullName profilePicture')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: {
                incoming: incoming.map((r) => ({
                    _id: r._id,
                    user: r.requester,
                    sentAt: r.createdAt
                })),
                outgoing: outgoing.map((r) => ({
                    _id: r._id,
                    user: r.recipient,
                    sentAt: r.createdAt
                }))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFriendRequests = getFriendRequests;
// @desc    Send friend request
// @route   POST /api/v1/friends
// @access  Private
const sendFriendRequest = async (req, res, next) => {
    try {
        const { userId } = req.body;
        const requesterId = req.user?.id;
        // Can't send request to self
        if (userId === requesterId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself'
            });
        }
        // Check if user exists
        const targetUser = await User_1.default.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Check if friendship already exists
        const existing = await Friend_1.default.findOne({
            $or: [
                { requester: requesterId, recipient: userId },
                { requester: userId, recipient: requesterId }
            ]
        });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.status === 'accepted'
                    ? 'Already friends'
                    : existing.status === 'pending'
                        ? 'Friend request already pending'
                        : 'Friend request rejected previously'
            });
        }
        // Create friend request
        const friendship = await Friend_1.default.create({
            requester: requesterId,
            recipient: userId,
            status: 'pending'
        });
        await friendship.populate('requester', 'username email fullName');
        await friendship.populate('recipient', 'username email fullName');
        // Emit notification via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${userId}`).emit('notification', {
                type: 'friend_request',
                message: `${friendship.requester.username} sent you a friend request`,
                from: requesterId
            });
        }
        res.status(201).json({
            success: true,
            message: 'Friend request sent',
            data: friendship
        });
    }
    catch (error) {
        next(error);
    }
};
exports.sendFriendRequest = sendFriendRequest;
// @desc    Accept friend request
// @route   PUT /api/v1/friends/:id/accept
// @access  Private
const acceptFriendRequest = async (req, res, next) => {
    try {
        const friendship = await Friend_1.default.findById(req.params.id);
        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }
        // Only recipient can accept
        if (friendship.recipient.toString() !== req.user?.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (friendship.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request already processed'
            });
        }
        friendship.status = 'accepted';
        await friendship.save();
        await friendship.populate('requester', 'username email fullName');
        await friendship.populate('recipient', 'username email fullName');
        // Notify requester
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${friendship.requester._id}`).emit('notification', {
                type: 'friend_accepted',
                message: 'Your friend request was accepted'
            });
        }
        res.json({
            success: true,
            message: 'Friend request accepted',
            data: friendship
        });
    }
    catch (error) {
        next(error);
    }
};
exports.acceptFriendRequest = acceptFriendRequest;
// @desc    Reject friend request
// @route   PUT /api/v1/friends/:id/reject
// @access  Private
const rejectFriendRequest = async (req, res, next) => {
    try {
        const friendship = await Friend_1.default.findById(req.params.id);
        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }
        if (friendship.recipient.toString() !== req.user?.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (friendship.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'Request already processed'
            });
        }
        friendship.status = 'rejected';
        await friendship.save();
        res.json({
            success: true,
            message: 'Friend request rejected'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.rejectFriendRequest = rejectFriendRequest;
// @desc    Remove friend
// @route   DELETE /api/v1/friends/:id
// @access  Private
const removeFriend = async (req, res, next) => {
    try {
        const friendship = await Friend_1.default.findById(req.params.id);
        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found'
            });
        }
        const isParticipant = friendship.requester.toString() === req.user?.id ||
            friendship.recipient.toString() === req.user?.id;
        if (!isParticipant) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        await friendship.deleteOne();
        res.json({
            success: true,
            message: 'Friend removed'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removeFriend = removeFriend;
// @desc    Search users to add as friends
// @route   GET /api/v1/friends/search
// @access  Private
const searchUsers = async (req, res, next) => {
    try {
        const { q } = req.query;
        const userId = req.user?.id;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query required'
            });
        }
        // Search by username or email
        const users = await User_1.default.find({
            _id: { $ne: userId },
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        })
            .select('username email fullName profilePicture')
            .limit(20);
        // Get existing friendships
        const friendships = await Friend_1.default.find({
            $or: [
                { requester: userId },
                { recipient: userId }
            ]
        });
        const friendUserIds = new Set(friendships.flatMap(f => [f.requester.toString(), f.recipient.toString()]));
        // Filter out existing friends
        const results = users.filter(u => !friendUserIds.has(u._id.toString()));
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        next(error);
    }
};
exports.searchUsers = searchUsers;
// @desc    Get online friends
// @route   GET /api/v1/friends/online
// @access  Private
const getOnlineFriends = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const friendships = await Friend_1.default.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        });
        const friendIds = friendships.flatMap(f => [
            f.requester.toString(),
            f.recipient.toString()
        ]).filter(id => id !== userId);
        const onlineFriends = await User_1.default.find({
            _id: { $in: friendIds },
            isOnline: true
        }).select('username email fullName profilePicture');
        res.json({
            success: true,
            data: onlineFriends
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOnlineFriends = getOnlineFriends;
exports.default = {
    getFriends: exports.getFriends,
    getFriendRequests: exports.getFriendRequests,
    sendFriendRequest: exports.sendFriendRequest,
    acceptFriendRequest: exports.acceptFriendRequest,
    rejectFriendRequest: exports.rejectFriendRequest,
    removeFriend: exports.removeFriend,
    searchUsers: exports.searchUsers,
    getOnlineFriends: exports.getOnlineFriends
};
//# sourceMappingURL=friendController.js.map