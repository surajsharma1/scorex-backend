"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBanner = exports.uploadLogo = void 0;
const Club_1 = __importDefault(require("../models/Club"));
const upload_1 = __importDefault(require("../middleware/upload"));
// @desc    Upload club logo
// @route   POST /api/v1/clubs/:clubId/upload-logo
// @access  Private (Owner/Vice-Leader)
exports.uploadLogo = [
    upload_1.default.single('logo'),
    async (req, res, next) => {
        try {
            const club = await Club_1.default.findById(req.params.clubId);
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
                    message: 'Not authorized to upload images'
                });
            }
            if (req.file) {
                club.logo = `/uploads/${req.file.filename}`;
                await club.save();
                res.json({
                    success: true,
                    message: 'Logo uploaded successfully',
                    data: { logo: club.logo }
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
];
// @desc    Upload club banner
// @route   POST /api/v1/clubs/:clubId/upload-banner
// @access  Private (Owner/Vice-Leader)
exports.uploadBanner = [
    upload_1.default.single('banner'),
    async (req, res, next) => {
        try {
            const club = await Club_1.default.findById(req.params.clubId);
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
                    message: 'Not authorized to upload images'
                });
            }
            if (req.file) {
                club.banner = `/uploads/${req.file.filename}`;
                await club.save();
                res.json({
                    success: true,
                    message: 'Banner uploaded successfully',
                    data: { banner: club.banner }
                });
            }
            else {
                res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }
        }
        catch (error) {
            next(error);
        }
    }
];
exports.default = {
    uploadLogo: exports.uploadLogo,
    uploadBanner: exports.uploadBanner
};
