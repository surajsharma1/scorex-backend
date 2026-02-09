"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClub = exports.updateClub = exports.leaveClub = exports.joinClub = exports.getClub = exports.getClubs = exports.createClub = void 0;
const Club_1 = __importDefault(require("../models/Club"));
const logger_1 = __importDefault(require("../utils/logger"));
const createClub = async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId = req.user?._id;
        if (!name) {
            return res.status(400).json({ message: 'Club name is required' });
        }
        const club = new Club_1.default({
            name,
            description,
            members: [userId],
            createdBy: userId
        });
        await club.save();
        logger_1.default.info(`Club created: ${name} by ${userId}`);
        res.status(201).json({ message: 'Club created successfully', club });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Club name already exists' });
        }
        logger_1.default.error('Error creating club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.createClub = createClub;
const getClubs = async (req, res) => {
    try {
        const clubs = await Club_1.default.find()
            .populate('members', 'username profilePicture')
            .populate('createdBy', 'username');
        res.json(clubs);
    }
    catch (error) {
        logger_1.default.error('Error getting clubs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getClubs = getClubs;
const getClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const club = await Club_1.default.findById(clubId)
            .populate('members', 'username profilePicture bio')
            .populate('createdBy', 'username');
        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }
        res.json({ club });
    }
    catch (error) {
        logger_1.default.error('Error getting club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getClub = getClub;
const joinClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const userId = req.user?._id;
        const club = await Club_1.default.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }
        if (club.members.includes(userId)) {
            return res.status(400).json({ message: 'Already a member of this club' });
        }
        club.members.push(userId);
        await club.save();
        logger_1.default.info(`User ${userId} joined club ${clubId}`);
        res.json({ message: 'Joined club successfully', club });
    }
    catch (error) {
        logger_1.default.error('Error joining club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.joinClub = joinClub;
const leaveClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const userId = req.user?._id;
        const club = await Club_1.default.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }
        if (!club.members.includes(userId)) {
            return res.status(400).json({ message: 'Not a member of this club' });
        }
        if (club.createdBy.toString() === userId) {
            return res.status(400).json({ message: 'Club creator cannot leave the club' });
        }
        club.members = club.members.filter(member => member.toString() !== userId);
        await club.save();
        logger_1.default.info(`User ${userId} left club ${clubId}`);
        res.json({ message: 'Left club successfully' });
    }
    catch (error) {
        logger_1.default.error('Error leaving club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.leaveClub = leaveClub;
const updateClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const { name, description } = req.body;
        const userId = req.user?._id;
        const club = await Club_1.default.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }
        if (club.createdBy.toString() !== userId?.toString()) {
            return res.status(403).json({ message: 'Only club creator can update the club' });
        }
        if (name)
            club.name = name;
        if (description !== undefined)
            club.description = description;
        await club.save();
        logger_1.default.info(`Club updated: ${clubId}`);
        res.json({ message: 'Club updated successfully', club });
    }
    catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Club name already exists' });
        }
        logger_1.default.error('Error updating club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.updateClub = updateClub;
const deleteClub = async (req, res) => {
    try {
        const { clubId } = req.params;
        const userId = req.user?.id;
        const club = await Club_1.default.findById(clubId);
        if (!club) {
            return res.status(404).json({ message: 'Club not found' });
        }
        if (club.createdBy.toString() !== userId) {
            return res.status(403).json({ message: 'Only club creator can delete the club' });
        }
        await Club_1.default.findByIdAndDelete(clubId);
        logger_1.default.info(`Club deleted: ${clubId}`);
        res.json({ message: 'Club deleted successfully' });
    }
    catch (error) {
        logger_1.default.error('Error deleting club:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.deleteClub = deleteClub;
//# sourceMappingURL=clubController.js.map