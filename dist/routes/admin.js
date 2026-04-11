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
// import { isAdmin } from '../middleware/auth';
const adminController = __importStar(require("../controllers/adminController"));
const userController = __importStar(require("../controllers/userController"));
const tournamentController = __importStar(require("../controllers/tournamentController"));
const matchController = __importStar(require("../controllers/matchController"));
const dataExport_1 = require("../utils/dataExport");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("../models/User"));
const router = express_1.default.Router();
router.get('/membership-prices', adminController.getMembershipPrices);
router.post('/membership-prices', auth_1.protect, auth_1.isAdmin, adminController.updateMembershipPrices);
router.get('/users', auth_1.protect, auth_1.isAdmin, userController.getUsers);
router.patch('/users/:id/role', auth_1.protect, auth_1.isAdmin, userController.updateRole);
router.get('/export/users', auth_1.protect, auth_1.isAdmin, (req, res) => dataExport_1.DataExportService.exportUsers(res, 'csv'));
// User management
router.post('/users/:id/ban', auth_1.protect, auth_1.isAdmin, userController.banUser);
router.post('/users/:id/unban', auth_1.protect, auth_1.isAdmin, userController.unbanUser);
// Membership assign
router.patch('/users/:id/membership', auth_1.protect, auth_1.isAdmin, userController.updateMembership);
// Tournament/Match admin delete
router.delete('/tournaments/:id', auth_1.protect, auth_1.isAdmin, tournamentController.deleteTournament);
router.delete('/matches/:id', auth_1.protect, auth_1.isAdmin, matchController.deleteMatch);
// Payments CSV export
router.get('/export/payments', auth_1.protect, auth_1.isAdmin, (req, res) => dataExport_1.DataExportService.exportPayments(res, 'csv'));
// Logs
router.get('/logs', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const logsPath = path_1.default.join(process.cwd(), 'logs');
        const logFiles = await promises_1.default.readdir(logsPath);
        res.json({ success: true, data: logFiles.slice(-20) }); // Last 20 logs
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Log download
router.get('/logs/:filename', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const filename = req.params.filename;
        const logsPath = path_1.default.join(process.cwd(), 'logs', filename);
        // Security: validate filename
        if (!filename.match(/^[a-zA-Z0-9\-_.]+\.log$/)) {
            return res.status(400).json({ message: 'Invalid filename' });
        }
        const data = await promises_1.default.readFile(logsPath, 'utf8');
        res.set({
            'Content-Type': 'text/plain',
            'Content-Disposition': `attachment; filename="scorex-${filename}"`,
            'Content-Length': data.length
        });
        res.status(200).send(data);
    }
    catch (error) {
        console.error('Log download error:', error);
        res.status(404).json({ message: 'Log file not found' });
    }
});
// Payments report
router.get('/payments', auth_1.protect, auth_1.isAdmin, async (req, res) => {
    try {
        const payments = await User_1.default.aggregate([
            { $unwind: '$paymentHistory' },
            { $sort: { 'paymentHistory.date': -1 } },
            { $limit: 200 },
            { $project: {
                    userId: '$_id',
                    username: 1,
                    email: 1,
                    amount: '$paymentHistory.amount',
                    currency: { $ifNull: ['$paymentHistory.currency', 'INR'] },
                    plan: { $ifNull: ['$paymentHistory.plan', '$paymentHistory.level', 'Premium'] },
                    level: '$paymentHistory.level',
                    duration: '$paymentHistory.duration',
                    date: '$paymentHistory.date',
                    status: '$paymentHistory.status',
                    razorpay_order_id: '$paymentHistory.razorpay_order_id',
                    razorpay_payment_id: '$paymentHistory.razorpay_payment_id',
                } }
        ]);
        res.json({ success: true, data: payments });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
