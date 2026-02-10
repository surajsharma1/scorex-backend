"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.updateProfile = exports.getProfile = exports.updateNotificationPreferences = exports.getNotificationPreferences = exports.updateUserRole = exports.getUsers = void 0;
const User_1 = __importDefault(require("../models/User"));
const getUsers = async (req, res) => {
    try {
        const users = await User_1.default.find().select('-password');
        res.json(users);
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getUsers = getUsers;
const updateUserRole = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateUserRole = updateUserRole;
const getNotificationPreferences = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id).select('notificationPreferences');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user.notificationPreferences);
    }
    catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getNotificationPreferences = getNotificationPreferences;
const updateNotificationPreferences = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.user._id, { notificationPreferences: req.body }, { new: true }).select('notificationPreferences');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user.notificationPreferences);
    }
    catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateNotificationPreferences = updateNotificationPreferences;
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user._id).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const { username, email, profilePicture, bio, fullName, dob } = req.body;
        const updateData = { username, email, profilePicture, bio, fullName };
        if (dob) {
            updateData.dob = new Date(dob);
        }
        const user = await User_1.default.findByIdAndUpdate(req.user._id, updateData, { new: true }).select('-password');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateProfile = updateProfile;
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || typeof query !== 'string') {
            res.status(400).json({ message: 'Query parameter is required' });
            return;
        }
        const users = await User_1.default.find({
            username: { $regex: query, $options: 'i' },
            deleted: { $ne: true }
        }).select('username profilePicture bio').limit(10);
        res.json(users);
    }
    catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.searchUsers = searchUsers;
//# sourceMappingURL=userController.js.map