"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const adminController = __importStar(require("../controllers/adminController"));
const userController = __importStar(require("../controllers/userController"));
const tournamentController = __importStar(require("../controllers/tournamentController"));
const matchController = __importStar(require("../controllers/matchController"));
const dataExport_1 = require("../utils/dataExport");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
// ── Membership prices — GET is public (used on Membership page without auth) ──
router.get('/membership-prices', adminController.getMembershipPrices);
router.post('/membership-prices', auth_1.protect, auth_1.isAdmin, adminController.updateMembershipPrices);
// ── User management ──────────────────────────────────────────────────────────
router.get('/users', auth_1.protect, auth_1.isAdmin, userController.getUsers);
router.patch('/users/:id/role', auth_1.protect, auth_1.isAdmin, userController.updateRole);
router.post('/users/:id/ban', auth_1.protect, auth_1.isAdmin, userController.banUser);
router.post('/users/:id/unban', auth_1.protect, auth_1.isAdmin, userController.unbanUser);
router.patch('/users/:id/membership', auth_1.protect, auth_1.isAdmin, userController.updateMembership);
// ── CSV exports ──────────────────────────────────────────────────────────────
router.get('/export/users', auth_1.protect, auth_1.isAdmin, (req, res) => dataExport_1.DataExportService.exportUsers(res, 'csv'));
router.get('/export/payments', auth_1.protect, auth_1.isAdmin, (req, res) => dataExport_1.DataExportService.exportPayments(res, 'csv'));
router.get('/export/tournaments', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        await dataExport_1.DataExportService.exportTournaments(res, 'csv');
    }
    catch {
        res.status(500).json({ message: 'Export failed' });
    }
});
// ── Tournament/Match admin delete (bypasses organizer check) ─────────────────
router.delete('/tournaments/:id', auth_1.protect, auth_1.isAdmin, tournamentController.deleteTournament);
router.delete('/matches/:id', auth_1.protect, auth_1.isAdmin, matchController.deleteMatch);
// ── Payments report ──────────────────────────────────────────────────────────
router.get('/payments', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const payments = await User_1.default.aggregate([
            { $unwind: '$paymentHistory' },
            { $sort: { 'paymentHistory.date': -1 } },
            { $limit: 100 },
            {
                $project: {
                    userId: '$_id',
                    username: 1,
                    email: 1,
                    amount: '$paymentHistory.amount',
                    currency: '$paymentHistory.currency',
                    level: '$paymentHistory.level',
                    date: '$paymentHistory.date',
                    status: '$paymentHistory.status',
                },
            },
        ]);
        res.json({ success: true, data: payments });
    }
    catch {
        res.status(500).json({ message: 'Server error' });
    }
});
// ── Logs list — returns {name, size, mtime} objects ─────────────────────────
router.get('/logs', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const logsPath = path_1.default.join(process.cwd(), 'logs');
        // Create logs dir if it doesn't exist
        try {
            await promises_1.default.mkdir(logsPath, { recursive: true });
        }
        catch { }
        let entries = [];
        try {
            entries = await promises_1.default.readdir(logsPath);
        }
        catch {
            entries = [];
        }
        const logFiles = entries.filter(f => f.endsWith('.log') || f.endsWith('.txt'));
        const statResults = await Promise.all(logFiles.slice(-20).map(async (name) => {
            try {
                const stat = await promises_1.default.stat(path_1.default.join(logsPath, name));
                return { name, size: stat.size, mtime: stat.mtime.toISOString() };
            }
            catch {
                return { name, size: 0, mtime: '' };
            }
        }));
        res.json({ success: true, data: statResults });
    }
    catch (error) {
        console.error('Logs list error:', error);
        res.status(500).json({ success: false, message: 'Failed to list logs', data: [] });
    }
});
// ── Log download ──────────────────────────────────────────────────────────────
router.get('/logs/:filename', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const filename = req.params.filename;
        if (!filename.match(/^[a-zA-Z0-9\-_.]+\.(log|txt)$/)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const logsPath = path_1.default.join(process.cwd(), 'logs', filename);
        if (!fs_1.default.existsSync(logsPath)) {
            return res.status(404).json({ message: 'Log file not found' });
        }
        const data = await promises_1.default.readFile(logsPath, 'utf8');
        res.set({
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="scorex-${filename}"`,
        });
        res.send(data);
    }
    catch (error) {
        console.error('Log download error:', error);
        res.status(404).json({ message: 'Log file not found' });
    }
});
exports.default = router;
