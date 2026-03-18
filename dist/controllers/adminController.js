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
    basic: { name: 'Basic', price: 9, duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
    premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
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
        const plans = await loadPrices();
        res.json({
            success: true,
            data: Object.entries(plans).map(([key, plan]) => ({
                id: key,
                ...plan
            }))
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
        const { plans } = req.body;
        if (!plans || typeof plans !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid plans data' });
        }
        await savePrices(plans);
        res.json({ success: true, message: 'Membership prices updated' });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMembershipPrices = updateMembershipPrices;
exports.default = { getMembershipPrices: exports.getMembershipPrices, updateMembershipPrices: exports.updateMembershipPrices };
