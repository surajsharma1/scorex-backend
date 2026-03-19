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
        const club = await Club_1.default.findById(clubId).populate('members', '_id');
        if (!club || !club.members)
            return;
        const memberIds = club.members
            .map((m) => m._id.toString())
            .filter(id => id !== excludeUserId);
        for (const userId of memberIds) {
            await (0, exports.createNotification)({
                userId,
                type: 'club',
                title,
                message,
                link: `/clubs/${clubId}`,
            });
        }
    }
    catch (error) {
        console.error('❌ Bulk club notification failed:', error);
    }
};
exports.notifyClubMembers = notifyClubMembers;
const notifyClubOwnerAndViceLeaders = async (clubId, title, message) => {
    try {
        const club = await Club_1.default.findById(clubId)
            .populate('owner', '_id')
            .populate('viceLeaders', '_id');
        if (!club)
            return;
        const adminIds = [club.owner._id];
        adminIds.push(...club.viceLeaders.map((vl) => vl._id));
        for (const userId of adminIds) {
            await (0, exports.createNotification)({
                userId: userId.toString(),
                type: 'club',
                title,
                message,
                link: `/clubs/${clubId}/manage`,
            });
        }
    }
    catch (error) {
        console.error('❌ Club admin notification failed:', error);
    }
};
exports.notifyClubOwnerAndViceLeaders = notifyClubOwnerAndViceLeaders;
