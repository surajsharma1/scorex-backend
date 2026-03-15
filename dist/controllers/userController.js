"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMembership = exports.updateProfile = exports.getUser = exports.getUsers = exports.searchUsers = void 0;
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
        user.membership.level = req.body.level;
        user.membership.expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
        await user.save();
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMembership = updateMembership;
exports.default = { getUsers: exports.getUsers, getUser: exports.getUser, updateProfile: exports.updateProfile, updateMembership: exports.updateMembership };
//# sourceMappingURL=userController.js.map