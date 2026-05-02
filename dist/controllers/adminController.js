"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSavedNotificationsToUser = exports.deleteSavedNotification = exports.createSavedNotification = exports.getSavedNotifications = exports.deleteNotification = exports.broadcastNotification = exports.getLogs = exports.getStats = exports.updateMembershipPrices = exports.getMembershipPrices = exports.SavedNotification = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
/**
 * Saved (persistent) notifications — sent to all existing users on create,
 * and automatically given to new users when they register.
 */
const mongoose_1 = __importDefault(require("mongoose"));
const SavedNotificationSchema = new mongoose_1.default.Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});
const SavedNotification = mongoose_1.default.models.SavedNotification ||
    mongoose_1.default.model('SavedNotification', SavedNotificationSchema);
exports.SavedNotification = SavedNotification;
const PRICES_FILE = path_1.default.join(process.cwd(), 'public', 'membership-prices.json');
const DEFAULT_MEMBERSHIP_PLANS = {
    1: {
        '1day': { price: 149, discount: 0 },
        '1week': { price: 499, discount: 0 },
        '1month': { price: 1499, discount: 0 },
        '3month': { price: 3999, discount: 0 },
        '6month': { price: 6999, discount: 0 },
        '1year': { price: 11999, discount: 0 },
    },
    2: {
        '1day': { price: 249, discount: 0 },
        '1week': { price: 999, discount: 0 },
        '1month': { price: 2499, discount: 0 },
        '3month': { price: 6999, discount: 0 },
        '6month': { price: 11999, discount: 0 },
        '1year': { price: 19999, discount: 0 },
    },
};
async function loadPrices() {
    try {
        const data = await promises_1.default.readFile(PRICES_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch {
        await promises_1.default.writeFile(PRICES_FILE, JSON.stringify(DEFAULT_MEMBERSHIP_PLANS, null, 2));
        return DEFAULT_MEMBERSHIP_PLANS;
    }
}
async function savePrices(plans) {
    await promises_1.default.writeFile(PRICES_FILE, JSON.stringify(plans, null, 2));
}
/**
 * GET /api/v1/admin/membership-prices
 */
const getMembershipPrices = async (req, res, next) => {
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
    }
    catch (error) {
        next(error);
    }
};
exports.getMembershipPrices = getMembershipPrices;
/**
 * POST /api/v1/admin/membership-prices
 */
const updateMembershipPrices = async (req, res, next) => {
    try {
        const { prices } = req.body;
        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid prices data' });
        }
        await savePrices(prices);
        res.json({ success: true, message: 'Membership prices updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMembershipPrices = updateMembershipPrices;
// --- FIX: ADDED MISSING DASHBOARD STATS LOGIC ---
const getStats = async (req, res, next) => {
    try {
        const users = await User_1.default.countDocuments();
        const premiumUsers = await User_1.default.countDocuments({ membershipLevel: { $gt: 0 } });
        const enterpriseUsers = await User_1.default.countDocuments({ membershipLevel: 2 });
        const tournaments = await Tournament_1.default.countDocuments();
        const activeTournaments = await Tournament_1.default.countDocuments({ status: 'ongoing' });
        const matches = await Match_1.default.countDocuments();
        const liveMatches = await Match_1.default.countDocuments({ status: 'live' });
        let revenue = 0;
        const usersWithHistory = await User_1.default.find({ paymentHistory: { $exists: true, $not: { $size: 0 } } });
        usersWithHistory.forEach(u => {
            u.paymentHistory?.forEach((p) => {
                if (p.status === 'completed')
                    revenue += p.amount;
            });
        });
        res.json({ users, premiumUsers, enterpriseUsers, tournaments, activeTournaments, matches, liveMatches, revenue });
    }
    catch (error) {
        next(error);
    }
};
exports.getStats = getStats;
// --- FIX: ADDED MISSING LOGS LOGIC (Resolves 500 Error) ---
const getLogs = async (req, res, next) => {
    try {
        const logDir = path_1.default.join(process.cwd(), 'logs');
        let logs = [];
        try {
            const files = await promises_1.default.readdir(logDir);
            for (const file of files) {
                const stats = await promises_1.default.stat(path_1.default.join(logDir, file));
                logs.push({ name: file, size: stats.size, mtime: stats.mtime });
            }
        }
        catch {
            // Fallback if directory doesn't exist
            logs = [{ name: 'System logs are routed to Render dashboard.', size: 0, mtime: new Date().toISOString() }];
        }
        res.json({ success: true, data: logs });
    }
    catch (error) {
        next(error);
    }
};
exports.getLogs = getLogs;
/**
 * POST /api/v1/admin/notifications/broadcast
 * Admin sends a notification to ALL users
 */
const broadcastNotification = async (req, res, next) => {
    try {
        const { title, message, link, audience } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        const Notification = (await Promise.resolve().then(() => __importStar(require('../models/Notification')))).default;
        let userQuery = {};
        if (audience === 'active') {
            // Users who logged in within last 30 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            userQuery = { lastLogin: { $gte: cutoff } };
        }
        else if (audience === 'new') {
            // Users registered in last 7 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 7);
            userQuery = { createdAt: { $gte: cutoff } };
        }
        const users = await User_1.default.find(userQuery, '_id');
        const docs = users.map(u => ({
            user: u._id,
            type: 'system',
            title,
            message,
            link: link || undefined,
            isRead: false,
        }));
        if (docs.length > 0)
            await Notification.insertMany(docs);
        const audienceLabel = audience === 'new' ? 'new users (last 7d)' : audience === 'active' ? 'active users (last 30d)' : 'all users';
        res.json({ success: true, message: `Notification sent to ${docs.length} ${audienceLabel}` });
    }
    catch (error) {
        next(error);
    }
};
exports.broadcastNotification = broadcastNotification;
/**
 * DELETE /api/v1/admin/notifications/:id
 * Admin deletes a broadcast notification from all users
 */
const deleteNotification = async (req, res, next) => {
    try {
        const Notification = (await Promise.resolve().then(() => __importStar(require('../models/Notification')))).default;
        await Notification.deleteMany({ _id: req.params.id });
        res.json({ success: true, message: 'Notification deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteNotification = deleteNotification;
/**
 * GET /api/v1/admin/notifications/saved
 * List all saved (persistent) notifications
 */
const getSavedNotifications = async (req, res, next) => {
    try {
        const list = await SavedNotification.find().sort({ createdAt: -1 });
        res.json({ success: true, data: list });
    }
    catch (error) {
        next(error);
    }
};
exports.getSavedNotifications = getSavedNotifications;
/**
 * POST /api/v1/admin/notifications/saved
 * Create a saved notification — immediately sends to ALL current users
 * AND will be sent automatically to every new user on registration.
 */
const createSavedNotification = async (req, res, next) => {
    try {
        const { title, message, link } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message required' });
        }
        // 1. Persist it
        const saved = await SavedNotification.create({ title, message, link: link || undefined });
        // 2. Broadcast to all current users
        const Notification = (await Promise.resolve().then(() => __importStar(require('../models/Notification')))).default;
        const users = await User_1.default.find({}, '_id');
        if (users.length > 0) {
            await Notification.insertMany(users.map(u => ({
                user: u._id, type: 'system', title, message, link: link || undefined, isRead: false,
            })));
        }
        res.json({ success: true, message: `Saved & sent to ${users.length} users`, data: saved });
    }
    catch (error) {
        next(error);
    }
};
exports.createSavedNotification = createSavedNotification;
/**
 * DELETE /api/v1/admin/notifications/saved/:id
 * Delete a saved notification (stops it being sent to future new users)
 */
const deleteSavedNotification = async (req, res, next) => {
    try {
        await SavedNotification.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Saved notification deleted' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSavedNotification = deleteSavedNotification;
/**
 * Utility — call this inside register to send all active saved notifications to a new user
 */
const sendSavedNotificationsToUser = async (userId) => {
    try {
        const Notification = (await Promise.resolve().then(() => __importStar(require('../models/Notification')))).default;
        const saved = await SavedNotification.find({ active: true });
        if (saved.length === 0)
            return;
        await Notification.insertMany(saved.map(s => ({
            user: userId, type: 'system',
            title: s.title, message: s.message, link: s.link, isRead: false,
        })));
    }
    catch { /* silent — don't block registration */ }
};
exports.sendSavedNotificationsToUser = sendSavedNotificationsToUser;
exports.default = { getMembershipPrices: exports.getMembershipPrices, updateMembershipPrices: exports.updateMembershipPrices, getStats: exports.getStats, getLogs: exports.getLogs, broadcastNotification: exports.broadcastNotification, deleteNotification: exports.deleteNotification, getSavedNotifications: exports.getSavedNotifications, createSavedNotification: exports.createSavedNotification, deleteSavedNotification: exports.deleteSavedNotification, sendSavedNotificationsToUser: exports.sendSavedNotificationsToUser };
