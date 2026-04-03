"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyClubOwnerAndViceLeaders = exports.notifyClubMembers = exports.createNotification = void 0;
const Notification_1 = __importDefault(require("../models/Notification"));
const Club_1 = __importDefault(require("../models/Club"));
const createNotification = async (options) => {
    try {
        const notification = await Notification_1.default.create({
            user: options.userId,
            type: options.type,
            title: options.title,
            message: options.message,
            link: options.link,
        });
        // Populate for completeness
        await notification.populate('user', 'username email');
        console.log('📢 Notification created:', notification);
    }
    catch (error) {
        console.error('❌ Notification creation failed:', error);
    }
};
exports.createNotification = createNotification;
const notifyClubMembers = async (clubId, title, message, excludeUserId) => {
    try {
        const club = await Club_1.default.findById(clubId).populate('members', 'id username');
        if (!club || !club.members || club.members.length === 0)
            return;
        const memberIds = club.members
            .filter((member) => member.id.toString() !== excludeUserId)
            .map((member) => member.id.toString());
        for (const userId of memberIds) {
            await (0, exports.createNotification)({
                userId,
                type: 'club',
                title,
                message,
            });
        }
    }
    catch (error) {
        console.error('❌ notifyClubMembers failed:', error);
    }
};
exports.notifyClubMembers = notifyClubMembers;
const notifyClubOwnerAndViceLeaders = async (clubId, title, message) => {
    try {
        const club = await Club_1.default.findById(clubId)
            .populate('owner', 'id username')
            .populate('viceLeaders', 'id username');
        if (!club)
            return;
        // Notify owner
        if (club.owner) {
            await (0, exports.createNotification)({
                userId: club.owner.id.toString(),
                type: 'club',
                title,
                message,
            });
        }
        // Notify vice leaders
        if (club.viceLeaders && club.viceLeaders.length > 0) {
            for (const viceLeader of club.viceLeaders) {
                await (0, exports.createNotification)({
                    userId: viceLeader.id.toString(),
                    type: 'club',
                    title,
                    message,
                });
            }
        }
    }
    catch (error) {
        console.error('❌ notifyClubOwnerAndViceLeaders failed:', error);
    }
};
exports.notifyClubOwnerAndViceLeaders = notifyClubOwnerAndViceLeaders;
