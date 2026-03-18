"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRole = exports.unbanUser = exports.banUser = exports.getProfile = exports.updateMembership = exports.updateProfile = exports.getUser = exports.getUsers = exports.searchUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const searchUsers = async (req, res, next) => {
    try {
        const { q, limit = 10 } = req.query;
        const users = await User_1.default.find({
            $or: [
                { username: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } }
            ]
        }).select('-password').limit(Number(limit));
        res.json({ success: true, data: users });
    }
    catch (error) {
        next(error);
    }
};
exports.searchUsers = searchUsers;
const getUsers = async (req, res, next) => {
    try {
        const users = await User_1.default.find().select('-password');
        res.json({ success: true, data: users });
    }
    catch (error) {
        next(error);
    }
};
exports.getUsers = getUsers;
const getUser = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.getUser = getUser;
const updateProfile = async (req, res, next) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.user._id, req.body, { new: true, runValidators: true }).select('-password');
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateProfile = updateProfile;
const updateMembership = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.membershipLevel = req.body.level;
        user.membershipExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await user.save();
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMembership = updateMembership;
const getProfile = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?._id).select('-password');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
const banUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { duration, reason } = req.body;
        const adminId = req.user._id;
        const user = await User_1.default.findById(id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const durationMs = {
            '1day': 24 * 60 * 60 * 1000,
            '3day': 3 * 24 * 60 * 60 * 1000,
            '1week': 7 * 24 * 60 * 60 * 1000,
            '1month': 30 * 24 * 60 * 60 * 1000,
            '3month': 90 * 24 * 60 * 60 * 1000,
            'lifetime': 100 * 365 * 24 * 60 * 60 * 1000 // ~100 years
        }[duration];
        if (!durationMs)
            return res.status(400).json({ success: false, message: 'Invalid duration' });
        user.banned = {
            until: new Date(Date.now() + durationMs),
            reason: reason || 'No reason provided',
            bannedBy: adminId.toString(),
            duration
        };
        await user.save();
        res.json({ success: true, message: 'User banned successfully', data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.banUser = banUser;
const unbanUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User_1.default.findById(id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.banned = undefined;
        await user.save();
        res.json({ success: true, message: 'User unbanned successfully', data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.unbanUser = unbanUser;
const updateRole = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        user.role = req.body.role;
        await user.save();
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateRole = updateRole;
exports.default = {
    searchUsers: exports.searchUsers, getUsers: exports.getUsers, getUser: exports.getUser, getProfile: exports.getProfile,
    updateProfile: exports.updateProfile, updateRole: exports.updateRole, updateMembership: exports.updateMembership, banUser: exports.banUser, unbanUser: exports.unbanUser
};
