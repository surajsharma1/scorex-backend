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
exports.deleteNotification = exports.broadcastNotification = exports.getLogs = exports.getStats = exports.updateMembershipPrices = exports.getMembershipPrices = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Match_1 = __importDefault(require("../models/Match"));
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
        const { title, message, link } = req.body;
        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }
        // Get all user IDs
        const users = await User_1.default.find({}, '_id');
        const Notification = (await Promise.resolve().then(() => __importStar(require('../models/Notification')))).default;
        const docs = users.map(u => ({
            user: u._id,
            type: 'system',
            title,
            message,
            link: link || undefined,
            isRead: false,
        }));
        await Notification.insertMany(docs);
        res.json({ success: true, message: `Notification sent to ${docs.length} users` });
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
exports.default = { getMembershipPrices: exports.getMembershipPrices, updateMembershipPrices: exports.updateMembershipPrices, getStats: exports.getStats, getLogs: exports.getLogs, broadcastNotification: exports.broadcastNotification, deleteNotification: exports.deleteNotification };
