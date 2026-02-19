"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMessage = exports.markAsRead = exports.sendMessage = exports.getMessages = exports.getConversations = void 0;
const User_1 = __importDefault(require("../models/User"));
// In-memory storage for demo (replace with database in production)
const messages = new Map();
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const userMessages = messages.get(userId) || [];
        // Get unique conversation partners
        const partnerIds = new Set();
        userMessages.forEach(msg => {
            partnerIds.add(msg.senderId);
            partnerIds.add(msg.receiverId);
        });
        partnerIds.delete(userId);
        // Build conversations with partner info
        const conversations = await Promise.all(Array.from(partnerIds).map(async (partnerId) => {
            const partner = await User_1.default.findById(partnerId).select('username email profilePicture');
            if (!partner)
                return null;
            const partnerMessages = messages.get(partnerId) || [];
            const conversation = [...userMessages, ...partnerMessages]
                .filter(m => (m.senderId === userId && m.receiverId === partnerId) ||
                (m.senderId === partnerId && m.receiverId === userId))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const unreadCount = userMessages.filter(m => m.senderId === partnerId && !m.read).length;
            return {
                user: partner,
                lastMessage: conversation[0] || null,
                unreadCount
            };
        }));
        res.json(conversations.filter(Boolean));
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getConversations = getConversations;
const getMessages = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const targetUserId = req.params.userId;
        if (!targetUserId) {
            return res.status(400).json({ message: 'Target user ID required' });
        }
        const userMessages = messages.get(userId) || [];
        const targetMessages = messages.get(targetUserId) || [];
        const allMessages = [...userMessages, ...targetMessages]
            .filter(m => (m.senderId === userId && m.receiverId === targetUserId) ||
            (m.senderId === targetUserId && m.receiverId === userId))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        res.json(allMessages);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getMessages = getMessages;
const sendMessage = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { toUserId, content } = req.body;
        if (!toUserId || !content) {
            return res.status(400).json({ message: 'Recipient and content required' });
        }
        const message = {
            id: Date.now().toString(),
            senderId: userId,
            receiverId: toUserId,
            content,
            timestamp: new Date(),
            read: false
        };
        // Add to sender's messages
        if (!messages.has(userId)) {
            messages.set(userId, []);
        }
        messages.get(userId).push(message);
        // Add to receiver's messages
        if (!messages.has(toUserId)) {
            messages.set(toUserId, []);
        }
        messages.get(toUserId).push(message);
        res.status(201).json(message);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.sendMessage = sendMessage;
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const conversationId = req.params.conversationId;
        const userMessages = messages.get(userId) || [];
        let updatedCount = 0;
        userMessages.forEach(msg => {
            if (msg.senderId === conversationId && !msg.read) {
                msg.read = true;
                updatedCount++;
            }
        });
        res.json({ success: true, updatedCount });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
const deleteMessage = async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const messageId = req.params.messageId;
        const userMessages = messages.get(userId) || [];
        const filtered = userMessages.filter(msg => msg.id !== messageId);
        messages.set(userId, filtered);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteMessage = deleteMessage;
//# sourceMappingURL=messageController.js.map