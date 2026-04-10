"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdminOrOrganizer = exports.isAdmin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.user = await User_1.default.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        if (req.user.isBanned && req.user.isBanned()) {
            const until = req.user.banned?.until;
            const reason = req.user.banned?.reason || 'No reason provided';
            const untilStr = until ? new Date(until).toISOString().split('T')[0] : 'indefinitely';
            return res.status(403).json({
                success: false,
                message: `Account suspended until ${untilStr}. Reason: ${reason}`,
            });
        }
        next();
    }
    catch {
        return res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};
exports.protect = protect;
const isAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};
exports.isAdmin = isAdmin;
const isAdminOrOrganizer = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'organizer') {
        return res.status(403).json({ success: false, message: 'Organizer or admin access required' });
    }
    next();
};
exports.isAdminOrOrganizer = isAdminOrOrganizer;
