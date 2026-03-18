"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const User_1 = __importDefault(require("../models/User"));
const Tournament_1 = __importDefault(require("../models/Tournament"));
const Team_1 = __importDefault(require("../models/Team"));
class DataExportService {
    static async exportUsers(res, format = 'json') {
        try {
            const users = await User_1.default.find({ deleted: { $ne: true } })
                .select('-password -__v')
                .lean();
            if (format === 'csv') {
                const csvData = this.convertToCSV(users, ['_id', 'username', 'email', 'role', 'createdAt']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
                res.send(csvData);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="users.json"');
                res.json(users);
            }
        }
        catch (error) {
            res.status(500).json({ message: 'Export failed' });
        }
    }
    static async exportTournaments(res, format = 'json') {
        try {
            const tournaments = await Tournament_1.default.find({ deleted: { $ne: true } })
                .populate('createdBy', 'username')
                .lean();
            if (format === 'csv') {
                const csvData = this.convertToCSV(tournaments, ['_id', 'name', 'status', 'startDate', 'registrationFee']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="tournaments.csv"');
                res.send(csvData);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="tournaments.json"');
                res.json(tournaments);
            }
        }
        catch (error) {
            res.status(500).json({ message: 'Export failed' });
        }
    }
    static async exportTeams(res, format = 'json') {
        try {
            const teams = await Team_1.default.find({ deleted: { $ne: true } })
                .populate('tournament', 'name')
                .populate('players', 'name')
                .lean();
            if (format === 'csv') {
                const csvData = this.convertToCSV(teams, ['_id', 'name', 'tournament', 'players']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="teams.csv"');
                res.send(csvData);
            }
            else {
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', 'attachment; filename="teams.json"');
                res.json(teams);
            }
        }
        catch (error) {
            res.status(500).json({ message: 'Export failed' });
        }
    }
    static async exportPayments(res, format = 'json') {
        try {
            const payments = await User_1.default.aggregate([
                { $unwind: { path: '$paymentHistory', preserveNullAndEmptyArrays: true } },
                { $match: { 'paymentHistory.status': 'completed' } },
                { $project: {
                        username: '$username',
                        email: '$email',
                        amount: '$paymentHistory.amount',
                        currency: '$paymentHistory.currency',
                        level: '$paymentHistory.level',
                        date: '$paymentHistory.date',
                        status: '$paymentHistory.status'
                    } }
            ]);
            if (format === 'csv') {
                const csvData = this.convertToCSV(payments, ['username', 'email', 'amount', 'currency', 'level', 'date', 'status']);
                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename="payments.csv"');
                res.send(csvData);
            }
            else {
                res.json(payments);
            }
        }
        catch (error) {
            res.status(500).json({ message: 'Export failed' });
        }
    }
    static convertToCSV(data, fields) {
        if (data.length === 0)
            return '';
        const headers = fields.join(',');
        const rows = data.map(item => fields.map(field => {
            const value = this.getNestedValue(item, field);
            return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(','));
        return [headers, ...rows].join('\\n');
    }
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
}
exports.DataExportService = DataExportService;
