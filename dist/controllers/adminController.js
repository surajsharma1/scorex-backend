"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMembershipPrices = exports.getMembershipPrices = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const PRICES_FILE = path_1.default.join(process.cwd(), 'public', 'membership-prices.json');
const DEFAULT_MEMBERSHIP_PLANS = {
    1: { '1day': 149, '1week': 499, '1month': 1499 },
    2: { '1day': 249, '1week': 999, '1month': 2499 }
};
async function loadPrices() {
    try {
        const data = await promises_1.default.readFile(PRICES_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch {
        await promises_1.default.writeFile(PRICES_FILE, JSON.stringify(DEFAULT_MEMBERSHIP_PLANS, null, 2));
        return DEFAULT_MEMBERSHIP_PLANS;
    }
}
async function savePrices(plans) {
    await promises_1.default.writeFile(PRICES_FILE, JSON.stringify(plans, null, 2));
}
/**
 * GET /api/v1/admin/membership-prices
 */
const getMembershipPrices = async (req, res, next) => {
    try {
        const prices = await loadPrices();
        res.json({
            success: true,
            prices
        });
        // Cache public prices for 1 hour
        res.set({
            'Cache-Control': 'public, max-age=3600, immutable',
            'Vary': 'Accept-Encoding'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMembershipPrices = getMembershipPrices;
/**
 * POST /api/v1/admin/membership-prices
 */
const updateMembershipPrices = async (req, res, next) => {
    try {
        const { prices } = req.body;
        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid prices data' });
        }
        await savePrices(prices);
        res.json({ success: true, message: 'Membership prices updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMembershipPrices = updateMembershipPrices;
exports.default = { getMembershipPrices: exports.getMembershipPrices, updateMembershipPrices: exports.updateMembershipPrices };
