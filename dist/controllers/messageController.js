"use strict";
/**
 * Message Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Entire persistence was in-memory Map — all messages lost on server restart
 *    — Now uses the Message mongoose model that already exists in the codebase
 * 2. Used (req as any).user._id — auth middleware sets req.user.id (string), not ._id
 * 3. Response format was inconsistent with rest of API (no success wrapper)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.markAsRead = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
// GET /messages/conversations
const getConversations = async (req, res, next) => {
    try {
        const userId = req.user?.id; // FIX: was req.user._id
        // Find all messages where user is sender or recipient
        const msgs = await Message_1.default.find({
            $or: [{ sender: userId }, { recipient: userId }]
        }).sort({ createdAt: -1 });
        // Group by conversation partner
        const partnerMap = new Map();
        for (const msg of msgs) {
            const partnerId = msg.sender.toString() === userId
                ? msg.recipient?.toString()
                : msg.sender.toString();
            if (!partnerId || partnerMap.has(partnerId))
                continue;
            const unreadCount = await Message_1.default.countDocuments({
                sender: partnerId, recipient: userId, isRead: false
            });
            partnerMap.set(partnerId, { lastMessage: msg, unreadCount, partnerId });
        }
        // Populate partner user details
        const conversations = await Promise.all(Array.from(partnerMap.values()).map(async ({ lastMessage, unreadCount, partnerId }) => {
            const partner = await User_1.default.findById(partnerId).select('username fullName profilePicture isOnline');
            if (!partner)
                return null;
            return { user: partner, lastMessage, unreadCount };
        }));
        res.json({ success: true, data: conversations.filter(Boolean) });
    }
    catch (error) {
        next(error);
    }
};
exports.getConversations = getConversations;
// GET /messages/:userId
const getMessages = async (req, res, next) => {
    try {
        const userId = req.user?.id; // FIX: was req.user._id
        const targetUserId = req.params.userId;
        if (!targetUserId)
            return res.status(400).json({ success: false, message: 'Target user ID required' });
        // FIX: query from database, not in-memory Map
        const messages = await Message_1.default.find({
            $or: [
                { sender: userId, recipient: targetUserId },
                { sender: targetUserId, recipient: userId }
            ]
        })
            .populate('sender', 'username fullName profilePicture')
            .sort({ createdAt: 1 });
        res.json({ success: true, data: messages });
    }
    catch (error) {
        next(error);
    }
};
exports.getMessages = getMessages;
// POST /messages
const sendMessage = async (req, res, next) => {
    try {
        const userId = req.user?.id; // FIX: was req.user._id
        const { toUserId, content } = req.body;
        if (!toUserId || !content?.trim())
            return res.status(400).json({ success: false, message: 'Recipient and content required' });
        const recipient = await User_1.default.findById(toUserId);
        if (!recipient)
            return res.status(404).json({ success: false, message: 'Recipient not found' });
        // FIX: persist to MongoDB, not in-memory Map
        const message = await Message_1.default.create({ sender: userId, recipient: toUserId, content: content.trim(), isRead: false });
        await message.populate('sender', 'username fullName profilePicture');
        // Emit real-time event
        const io = req.app.get('io');
        if (io) {
            io.to(`user:${toUserId}`).emit('newMessage', message.toObject());
        }
        res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        next(error);
    }
};
exports.sendMessage = sendMessage;
// PUT /messages/:conversationId/read
const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user?.id; // FIX: was req.user._id
        const senderId = req.params.conversationId;
        // FIX: update in database, not in-memory Map
        const result = await Message_1.default.updateMany({ sender: senderId, recipient: userId, isRead: false }, { $set: { isRead: true } });
        res.json({ success: true, updatedCount: result.modifiedCount });
    }
    catch (error) {
        next(error);
    }
};
exports.markAsRead = markAsRead;
// DELETE /messages/:messageId
const deleteMessage = async (req, res, next) => {
    try {
        const userId = req.user?.id; // FIX: was req.user._id
        const message = await Message_1.default.findById(req.params.messageId);
        if (!message)
            return res.status(404).json({ success: false, message: 'Message not found' });
        if (message.sender.toString() !== userId)
            return res.status(403).json({ success: false, message: 'Not authorized' });
        // FIX: delete from database, not filter from Map
        await message.deleteOne();
        res.json({ success: true });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMessage = deleteMessage;
exports.default = { getConversations: exports.getConversations, getMessages: exports.getMessages, sendMessage: exports.sendMessage, markAsRead: exports.markAsRead, deleteMessage: exports.deleteMessage };
