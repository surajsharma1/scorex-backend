"use strict";
/**
 * Notification Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. Used (req as any).user._id — auth middleware sets req.user.id
 * 2. Was concatenated with clubController.ts in original file
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsRead = exports.markAsRead = exports.getNotifications = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const getNotifications = async (req, res) => {
    try {
        // FIX: was (req as any).user._id
        const notifications = await Notification_1.default.find({ user: req.user?.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ success: true, data: notifications });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getNotifications = getNotifications;
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification_1.default.findOneAndUpdate({ _id: req.params.id, user: req.user?.id }, // FIX: scope to owner
        { isRead: true }, { new: true });
        if (!notification) {
            res.status(404).json({ success: false, message: 'Notification not found' });
            return;
        }
        res.json({ success: true, data: notification });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.markAsRead = markAsRead;
const markAllAsRead = async (req, res) => {
    try {
        await Notification_1.default.updateMany({ user: req.user?.id, isRead: false }, { isRead: true });
        res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.markAllAsRead = markAllAsRead;
