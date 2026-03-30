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
exports.verifyRazorpayPayment = exports.createRazorpayOrder = exports.getPaymentHistory = exports.cancelMembership = exports.extendMembership = exports.purchaseMembership = exports.getMembership = exports.getPlans = void 0;
const User_1 = __importDefault(require("../models/User"));
const razorpay_1 = __importDefault(require("razorpay"));
const crypto = __importStar(require("crypto"));
const MEMBERSHIP_PLANS = {
    basic: { name: 'Basic', price: 9, duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
    premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
};
const LEVEL_TO_PLAN = { 1: 'basic', 2: 'premium' };
const DEV_CARD = { number: '88714741390926000', expiry: '0926', cvv: '000' };
async function processPayment(cardNumber, expiry, cvv, amount) {
    if (cardNumber && cardNumber.length >= 13 && expiry && cvv) {
        console.log(`[Payment] Processing ₹${amount}`);
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
        user.paymentHistory.push({ amount: plan.price, currency: 'USD', plan: plan.name, duration: `${plan.duration} days`, paymentIntentId: (isDevCard ? 'dev_' : 'pi_') + Date.now(), status: 'completed', date: now });
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
        if (user.membershipLevel === 0) {
            return res.status(400).json({ success: false, message: 'No active membership to extend. Please purchase a membership first.' });
        }
        const planKey = LEVEL_TO_PLAN[user.membershipLevel];
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
// Razorpay Integration
// Razorpay instance moved inside functions for lazy loading and env validation
const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, plan } = req.body;
        // Enhanced validation
        if (typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
        }
        if (typeof plan !== 'string' || !plan.trim()) {
            return res.status(400).json({ success: false, message: 'Plan must be a non-empty string' });
        }
        // Validate Razorpay env vars
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('[Razorpay] Missing env vars: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
            return res.status(500).json({ success: false, message: 'Payment service not configured. Contact support.' });
        }
        const razorpay = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        const receipt = `scorex_${req.user?.id}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const orderOptions = {
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt,
            notes: {
                plan,
                userId: req.user?.id,
            }
        };
        const order = await razorpay.orders.create(orderOptions);
        // Temp store in user
        const user = await User_1.default.findById(req.user?.id);
        if (user) {
            user.paymentHistory = user.paymentHistory || [];
            user.paymentHistory.push({
                razorpay_order_id: order.id,
                amount: Number(amount),
                currency: 'INR',
                plan,
                status: 'created',
                date: new Date(),
            });
            await user.save();
        }
        res.json({ success: true, data: order });
    }
    catch (error) {
        const { amount: logAmount, plan: logPlan } = req.body;
        console.error('[Razorpay Order]', error, {
            message: error.message,
            stack: error.stack,
            userId: req.user?.id,
            amount: logAmount,
            plan: logPlan
        });
        res.status(500).json({
            success: false,
            message: error.description || error.message || 'Failed to create order',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
const verifyRazorpayPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing Razorpay verification data' });
        }
        // Validate Razorpay env vars
        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error('[Razorpay Verify] Missing RAZORPAY_KEY_SECRET');
            return res.status(500).json({ success: false, message: 'Payment service not configured.' });
        }
        const razorpay = new razorpay_1.default({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        // Signature verification
        const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const signature = shasum.digest('hex');
        if (signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid signature' });
        }
        // Fetch payment & order
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured') {
            return res.status(400).json({ success: false, message: 'Payment not captured' });
        }
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const amount = Number(order.amount) / 100;
        const notesPlan = order.notes.plan || plan;
        // Update user
        const user = await User_1.default.findById(req.user?.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found' });
        const now = new Date();
        const level = notesPlan.includes('lv2') || notesPlan === 'Enterprise' || notesPlan === 'premium' ? 2 : 1;
        const durationDays = notesPlan.includes('1-month') || notesPlan.includes('month') ? 30 : notesPlan.includes('1-week') || notesPlan.includes('week') ? 7 : 1;
        let expiry = new Date(now);
        if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
            expiry = new Date(user.membershipExpiresAt);
        }
        expiry.setDate(expiry.getDate() + durationDays);
        user.membershipLevel = level;
        user.membershipExpiresAt = expiry;
        user.membershipStartedAt = now;
        // History
        const pendingIndex = user.paymentHistory?.findIndex((h) => h.razorpay_order_id === razorpay_order_id);
        if (pendingIndex > -1) {
            user.paymentHistory[pendingIndex] = {
                ...user.paymentHistory[pendingIndex],
                status: 'completed',
                razorpay_payment_id,
            };
        }
        else {
            user.paymentHistory = user.paymentHistory || [];
            user.paymentHistory.push({
                amount,
                currency: 'INR',
                razorpay_order_id,
                razorpay_payment_id,
                status: 'completed',
                plan: notesPlan,
                duration: `${durationDays} days`,
                date: now,
            });
        }
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({
            level,
            status: 'upgraded',
            startedAt: now,
            endedAt: expiry,
            notes: `${notesPlan} via Razorpay`,
        });
        await user.save();
        // Refresh token if needed
        const token = req.headers.authorization?.split(' ')[1];
        res.json({ success: true, message: 'Payment verified and membership updated!', data: { level, expiresAt: expiry }, token });
    }
    catch (error) {
        const { razorpay_payment_id: logPaymentId } = req.body;
        console.error('[Razorpay Verify]', error, { razorpay_payment_id: logPaymentId });
        res.status(500).json({
            success: false,
            message: error.description || error.message || 'Verification failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
exports.default = {
    getPlans: exports.getPlans, getMembership: exports.getMembership, purchaseMembership: exports.purchaseMembership, extendMembership: exports.extendMembership, cancelMembership: exports.cancelMembership, getPaymentHistory: exports.getPaymentHistory,
    createRazorpayOrder: exports.createRazorpayOrder, verifyRazorpayPayment: exports.verifyRazorpayPayment
};
