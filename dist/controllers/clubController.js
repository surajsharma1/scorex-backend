"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyClubs = exports.removeMember = exports.addViceLeader = exports.approveJoinRequest = exports.leaveClub = exports.joinClub = exports.deleteClub = exports.updateClub = exports.createClub = exports.getClub = exports.getClubs = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Club_1 = __importDefault(require("../models/Club"));
const User_1 = __importDefault(require("../models/User"));
const notificationUtils_1 = require("../utils/notificationUtils");
// @desc    Get all clubs
// @route   GET /api/v1/clubs
// @access  Public
const getClubs = async (req, res, next) => {
    try {
        const { type, search, limit = 20, page = 1 } = req.query;
        const query = { isActive: true };
        if (type)
            query.type = type;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        const clubs = await Club_1.default.find(query)
            .populate('owner', 'username email fullName profilePicture')
            .populate('viceLeaders', 'username email fullName profilePicture')
            .populate('members', 'username email fullName profilePicture')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Club_1.default.countDocuments(query);
        res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.set('Expires', '0');
        res.set('Pragma', 'no-cache');
        res.json({
            success: true,
            data: clubs,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getClubs = getClubs;
// @desc    Get single club
// @route   GET /api/v1/clubs/:id
// @access  Public
const getClub = async (req, res, next) => {
    try {
        const club = await Club_1.default.findOne({ _id: req.params.id, isActive: true })
            .populate('owner', 'username email fullName profilePicture')
            .populate('viceLeaders', 'username email fullName profilePicture')
            .populate('members', 'username email fullName profilePicture')
            .populate('joinRequests', 'username email fullName profilePicture');
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }
        res.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.set('Expires', '0');
        res.set('Pragma', 'no-cache');
        res.json({
            success: true,
            data: club
        });
    }
    catch (error) {
        console.error('getClub error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};
exports.getClub = getClub;
// @desc    Create club
// @route   POST /api/v1/clubs
// @access  Private
const createClub = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const { name, description, logo, type, location, isPublic } = req.body;
        const club = await Club_1.default.create({
            name,
            description,
            logo,
            type: type || 'public',
            location,
            isPublic: isPublic !== false,
            owner: req.user.id,
            members: [req.user.id],
            viceLeaders: [],
            joinRequests: []
        });
        await club.populate('owner', 'username email fullName');
        res.status(201).json({
            success: true,
            message: 'Club created successfully',
            data: club
        });
    }
    catch (error) {
        console.error('createClub error:', error);
        res.status(500).json({ success: false, message: 'Failed to create club' });
    }
};
exports.createClub = createClub;
// @desc    Update club
// @route   PUT /api/v1/clubs/:id
// @access  Private (Owner/Vice-Leader)
const updateClub = async (req, res, next) => {
    try {
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.json({
                success: true,
                data: null,
                message: 'Club not found'
            });
        }
        const isOwner = club.owner.toString() === req.user?.id;
        const isViceLeader = club.viceLeaders.some((v) => v.toString() === req.user?.id);
        if (!isOwner && !isViceLeader && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this club'
            });
        }
        const { name, description, logo, type, location, isPublic } = req.body;
        if (name)
            club.name = name;
        if (description)
            club.description = description;
        if (logo)
            club.logo = logo;
        if (type)
            club.type = type;
        if (location)
            club.location = location;
        if (isPublic !== undefined)
            club.isPublic = isPublic;
        await club.save();
        res.json({
            success: true,
            message: 'Club updated',
            data: club
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateClub = updateClub;
// @desc    Delete club
// @route   DELETE /api/v1/clubs/:id
// @access  Private (Owner only)
const deleteClub = async (req, res, next) => {
    try {
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.json({
                success: true,
                data: null,
                message: 'Club not found'
            });
        }
        if (club.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only owner can delete club'
            });
        }
        club.isActive = false;
        await club.save();
        res.json({
            success: true,
            message: 'Club deleted'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteClub = deleteClub;
// @desc    Join club
// @route   POST /api/v1/clubs/:id/join
// @access  Private
const joinClub = async (req, res, next) => {
    try {
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.json({
                success: true,
                data: null,
                message: 'Club not found'
            });
        }
        if (club.members.some((m) => m.toString() === req.user?.id)) {
            return res.status(400).json({
                success: false,
                message: 'Already a member of this club'
            });
        }
        if (club.joinRequests.some((r) => r.toString() === req.user?.id)) {
            return res.status(400).json({
                success: false,
                message: 'Join request already pending'
            });
        }
        if (club.isPublic) {
            await club.addMember(new mongoose_1.default.Types.ObjectId(req.user.id));
            // Notify club admins
            await (0, notificationUtils_1.notifyClubOwnerAndViceLeaders)(club._id.toString(), 'New Member Joined', `${req.user.username || 'A member'} joined ${club.name}`);
            res.json({
                success: true,
                message: 'Joined club successfully'
            });
        }
        else {
            club.joinRequests.push(new mongoose_1.default.Types.ObjectId(req.user.id));
            await club.save();
            // Notify club admins about new request
            await (0, notificationUtils_1.notifyClubOwnerAndViceLeaders)(club._id.toString(), 'New Join Request', `${req.user.username || 'Someone'} requested to join ${club.name}`);
            res.json({
                success: true,
                message: 'Join request submitted'
            });
        }
    }
    catch (error) {
        next(error);
    }
};
exports.joinClub = joinClub;
// @desc    Leave club
// @route   POST /api/v1/clubs/:id/leave
// @access  Private
const leaveClub = async (req, res, next) => {
    try {
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }
        if (club.owner.toString() === req.user?.id) {
            return res.status(400).json({
                success: false,
                message: 'Owner cannot leave club'
            });
        }
        club.members = club.members.filter((m) => m.toString() !== req.user?.id);
        club.viceLeaders = club.viceLeaders.filter((v) => v.toString() !== req.user?.id);
        club.joinRequests = club.joinRequests.filter((r) => r.toString() !== req.user?.id);
        await club.save();
        res.json({
            success: true,
            message: 'Left club successfully'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.leaveClub = leaveClub;
// @desc    Approve join request
// @route   POST /api/v1/clubs/:id/approve/:userId
// @access  Private (Owner/Vice-Leader)
const approveJoinRequest = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }
        const isOwner = club.owner.toString() === req.user?.id;
        const isViceLeader = club.viceLeaders.some((v) => v.toString() === req.user?.id);
        if (!isOwner && !isViceLeader && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (!club.joinRequests.some((r) => r.toString() === userId)) {
            return res.status(400).json({
                success: false,
                message: 'No join request from this user'
            });
        }
        await club.approveJoinRequest(new mongoose_1.default.Types.ObjectId(userId));
        // Notify new member
        const newMember = await User_1.default.findById(userId);
        await (0, notificationUtils_1.createNotification)({
            userId,
            type: 'club',
            title: `Welcome to ${club.name}!`,
            message: `Your join request has been approved by ${req.user.username}.`,
            link: `/clubs/${club._id}`,
        });
        // Notify other members
        await (0, notificationUtils_1.notifyClubMembers)(club._id.toString(), `${newMember?.username || 'New member'} joined the club`, `${newMember?.username || 'A new member'} has joined ${club.name}`, req.user.id);
        res.json({
            success: true,
            message: 'Join request approved'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.approveJoinRequest = approveJoinRequest;
// @desc    Add vice leader
// @route   POST /api/v1/clubs/:id/vice-leader/:userId
// @access  Private (Owner only)
const addViceLeader = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }
        if (club.owner.toString() !== req.user?.id && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Only owner can add vice leaders'
            });
        }
        if (!club.members.some((m) => m.toString() === userId)) {
            return res.status(400).json({
                success: false,
                message: 'User must be a member first'
            });
        }
        club.viceLeaders.push(new mongoose_1.default.Types.ObjectId(userId));
        await club.save();
        await club.populate('viceLeaders', 'username email fullName profilePicture');
        res.json({
            success: true,
            message: 'Vice leader added'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addViceLeader = addViceLeader;
// @desc    Remove member
// @route   DELETE /api/v1/clubs/:id/members/:userId
// @access  Private (Owner/Vice-Leader)
const removeMember = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const club = await Club_1.default.findById(req.params.id);
        if (!club) {
            return res.status(404).json({
                success: false,
                message: 'Club not found'
            });
        }
        const isOwner = club.owner.toString() === req.user?.id;
        const isViceLeader = club.viceLeaders.some((v) => v.toString() === req.user?.id);
        if (!isOwner && !isViceLeader && req.user?.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }
        if (userId === club.owner.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot remove owner'
            });
        }
        club.members = club.members.filter((m) => m.toString() !== userId);
        club.viceLeaders = club.viceLeaders.filter((v) => v.toString() !== userId);
        await club.save();
        res.json({
            success: true,
            message: 'Member removed'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.removeMember = removeMember;
// @desc    Get user's clubs
// @route   GET /api/v1/clubs/my
// @access  Private
const getMyClubs = async (req, res, next) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }
        const userId = req.user.id;
        const { search, limit = 20, page = 1 } = req.query;
        const query = {
            $or: [
                { owner: userId },
                { members: userId }
            ],
            isActive: true
        };
        if (search) {
            query.$and = [
                query,
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { description: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }
        const clubs = await Club_1.default.find(query)
            .populate('owner', 'username email fullName profilePicture')
            .populate('viceLeaders', 'username email fullName profilePicture')
            .populate('members', 'username email fullName profilePicture')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));
        const total = await Club_1.default.countDocuments(query);
        res.json({
            success: true,
            data: clubs,
            pagination: {
                total,
                page: Number(page),
                pages: Math.ceil(total / Number(limit))
            },
            message: clubs.length > 0 ? `${clubs.length} clubs found` : 'No clubs yet. Create your first!'
        });
    }
    catch (error) {
        console.error('getMyClubs error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
exports.getMyClubs = getMyClubs;
exports.default = {
    getClubs: exports.getClubs,
    getClub: exports.getClub,
    createClub: exports.createClub,
    updateClub: exports.updateClub,
    deleteClub: exports.deleteClub,
    joinClub: exports.joinClub,
    leaveClub: exports.leaveClub,
    approveJoinRequest: exports.approveJoinRequest,
    addViceLeader: exports.addViceLeader,
    removeMember: exports.removeMember,
    getMyClubs: exports.getMyClubs
};
