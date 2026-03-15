"use strict";
/**
 * Payment Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. extendMembership: `membershipLevel === 1 ? 'basic' : 'premium'` returns 'premium'
 *    when level is 0 (free tier) — user with no membership gets premium plan price instead
 *    of a proper "no active membership" error.
 *    FIX: check for level === 0 explicitly before the ternary lookup.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.cancelMembership = exports.extendMembership = exports.purchaseMembership = exports.getMembership = exports.getPlans = void 0;
const User_1 = __importDefault(require("../models/User"));
const MEMBERSHIP_PLANS = {
    basic: { name: 'Basic', price: 9, duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
    premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
};
const LEVEL_TO_PLAN = { 1: 'basic', 2: 'premium' };
const DEV_CARD = { number: '88714741390926000', expiry: '0926', cvv: '000' };
async function processPayment(cardNumber, expiry, cvv, amount) {
    if (cardNumber && cardNumber.length >= 13 && expiry && cvv) {
        console.log(`[Payment] Processing $${amount}`);
        return true;
    }
    return false;
}
const getPlans = async (req, res, next) => {
    try {
        res.json({ success: true, data: Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => ({ id: key, ...plan })) });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlans = getPlans;
const getMembership = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id).select('membershipLevel membershipExpiresAt membershipStartedAt membershipTimeline');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const isActive = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) > new Date() : false;
        res.json({ success: true, data: { level: user.membershipLevel, status: isActive ? 'active' : 'expired', startedAt: user.membershipStartedAt, expiresAt: user.membershipExpiresAt, timeline: user.membershipTimeline } });
    }
    catch (error) {
        next(error);
    }
};
exports.getMembership = getMembership;
const purchaseMembership = async (req, res, next) => {
    try {
        const { planId, cardNumber, expiry, cvv } = req.body;
        const plan = MEMBERSHIP_PLANS[planId];
        if (!plan)
            return res.status(400).json({ success: false, message: 'Invalid plan selected' });
        const isDevCard = cardNumber === DEV_CARD.number && expiry === DEV_CARD.expiry && cvv === DEV_CARD.cvv;
        const paymentSuccess = isDevCard || await processPayment(cardNumber, expiry, cvv, plan.price);
        if (!paymentSuccess)
            return res.status(400).json({ success: false, message: 'Payment failed' });
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const now = new Date();
        let newExpiry = new Date(now);
        if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
            newExpiry = new Date(user.membershipExpiresAt);
        }
        newExpiry.setDate(newExpiry.getDate() + plan.duration);
        const statusChange = plan.level > user.membershipLevel ? 'upgraded' : plan.level < user.membershipLevel ? 'downgraded' : 'active';
        user.membershipLevel = plan.level;
        user.membershipStartedAt = now;
        user.membershipExpiresAt = newExpiry;
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({ level: plan.level, status: statusChange, startedAt: now, endedAt: newExpiry, notes: isDevCard ? 'Dev card used' : `${plan.name} purchased` });
        user.paymentHistory = user.paymentHistory || [];
        user.paymentHistory.push({ amount: plan.price, currency: 'USD', level: plan.name, duration: `${plan.duration} days`, paymentIntentId: (isDevCard ? 'dev_' : 'pi_') + Date.now(), status: 'completed', date: now });
        await user.save();
        res.json({ success: true, message: 'Membership purchased successfully', data: { level: user.membershipLevel, status: 'active', startedAt: user.membershipStartedAt, expiresAt: user.membershipExpiresAt } });
    }
    catch (error) {
        next(error);
    }
};
exports.purchaseMembership = purchaseMembership;
const extendMembership = async (req, res, next) => {
    try {
        const { months, cardNumber, expiry, cvv } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        // FIX: original was `membershipLevel === 1 ? 'basic' : 'premium'`
        // — when level is 0 (no membership), this returned 'premium' plan instead of rejecting
        if (user.membershipLevel === 0) {
            return res.status(400).json({ success: false, message: 'No active membership to extend. Please purchase a membership first.' });
        }
        const planKey = LEVEL_TO_PLAN[user.membershipLevel]; // 1→'basic', 2→'premium'
        const currentPlan = MEMBERSHIP_PLANS[planKey];
        const price = currentPlan.price * months;
        const isDevCard = cardNumber === DEV_CARD.number && expiry === DEV_CARD.expiry && cvv === DEV_CARD.cvv;
        const paymentSuccess = isDevCard || await processPayment(cardNumber, expiry, cvv, price);
        if (!paymentSuccess)
            return res.status(400).json({ success: false, message: 'Payment failed' });
        const now = new Date();
        let currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
            ? new Date(user.membershipExpiresAt) : now;
        currentExpiry.setMonth(currentExpiry.getMonth() + months);
        user.membershipExpiresAt = currentExpiry;
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({ level: user.membershipLevel, status: 'active', startedAt: now, endedAt: currentExpiry, notes: `Extended by ${months} month(s)` });
        await user.save();
        res.json({ success: true, message: `Membership extended by ${months} month(s)`, data: { expiresAt: user.membershipExpiresAt } });
    }
    catch (error) {
        next(error);
    }
};
exports.extendMembership = extendMembership;
const cancelMembership = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        if (user.membershipLevel === 0)
            return res.status(400).json({ success: false, message: 'No active membership to cancel' });
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({ level: user.membershipLevel, status: 'cancelled', startedAt: user.membershipStartedAt || new Date(), endedAt: new Date(), notes: 'Cancelled by user' });
        user.membershipLevel = 0;
        await user.save();
        res.json({ success: true, message: 'Membership cancelled' });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelMembership = cancelMembership;
const getPaymentHistory = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id).select('paymentHistory');
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, data: user.paymentHistory || [] });
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
exports.default = { getPlans: exports.getPlans, getMembership: exports.getMembership, purchaseMembership: exports.purchaseMembership, extendMembership: exports.extendMembership, cancelMembership: exports.cancelMembership, getPaymentHistory: exports.getPaymentHistory };
//# sourceMappingURL=paymentController.js.map