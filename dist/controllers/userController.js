"use strict";
/**
 * User Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. All handlers used (req as any).user._id — auth middleware sets req.user.id
 * 2. searchUsers used req.user?._id — same fix
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.updateProfile = exports.getProfile = exports.updateNotificationPreferences = exports.getNotificationPreferences = exports.updateUserRole = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const getUsers = async (req, res) => {
    try {
        const { limit = 50, page = 1, search } = req.query;
        const query = { deleted: { $ne: true } };
        if (search)
            query.$or = [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
        const users = await User_1.default.find(query).select('-password').limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
        const total = await User_1.default.countDocuments(query);
        res.json({ success: true, data: users, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getUsers = getUsers;
const updateUserRole = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateUserRole = updateUserRole;
const getNotificationPreferences = async (req, res) => {
    try {
        // FIX: was (req as any).user._id
        const user = await User_1.default.findById(req.user?.id).select('notificationPreferences');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user.notificationPreferences });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getNotificationPreferences = getNotificationPreferences;
const updateNotificationPreferences = async (req, res) => {
    try {
        // FIX: was (req as any).user._id
        const user = await User_1.default.findByIdAndUpdate(req.user?.id, { notificationPreferences: req.body }, { new: true }).select('notificationPreferences');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user.notificationPreferences });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateNotificationPreferences = updateNotificationPreferences;
const getProfile = async (req, res) => {
    try {
        // FIX: was (req as any).user._id
        const user = await User_1.default.findById(req.user?.id).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { username, profilePicture, bio, fullName, dob } = req.body;
        const updateData = {};
        if (username)
            updateData.username = username;
        if (profilePicture)
            updateData.profilePicture = profilePicture;
        if (bio !== undefined)
            updateData.bio = bio;
        if (fullName)
            updateData.fullName = fullName;
        if (dob)
            updateData.dob = new Date(dob);
        // FIX: was (req as any).user._id
        const user = await User_1.default.findByIdAndUpdate(req.user?.id, updateData, { new: true, runValidators: true }).select('-password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        // FIX: was req.user?._id
        const currentUserId = req.user?.id;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ success: false, message: 'Query parameter is required' });
            return;
        }
        const users = await User_1.default.find({
            $or: [{ username: { $regex: query, $options: 'i' } }, { fullName: { $regex: query, $options: 'i' } }],
            deleted: { $ne: true },
            _id: { $ne: currentUserId }
        }).select('username email profilePicture bio fullName').limit(20);
        res.json({ success: true, data: users });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.searchUsers = searchUsers;
//# sourceMappingURL=userController.js.map