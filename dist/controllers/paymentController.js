"use strict";
/**
 * Payment Controller
 * Membership & payment processing
 * Following PROJECT_ALGORITHM.md specifications
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.cancelMembership = exports.extendMembership = exports.purchaseMembership = exports.getMembership = exports.getPlans = void 0;
const User_1 = __importDefault(require("../models/User"));
// Membership plans
const MEMBERSHIP_PLANS = {
    basic: {
        name: 'Basic',
        price: 9,
        duration: 30, // days
        level: 1,
        features: ['Basic overlays', 'Standard support']
    },
    premium: {
        name: 'Premium',
        price: 19,
        duration: 30, // days
        level: 2,
        features: ['All overlays', 'Priority support', 'Advanced analytics']
    }
};
// Dev override card (for testing)
const DEV_CARD = {
    number: '88714741390926000',
    expiry: '0926',
    cvv: '000'
};
// @desc    Get membership plans
// @route   GET /api/v1/payments/plans
// @access  Public
const getPlans = async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => ({
                id: key,
                ...plan
            }))
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPlans = getPlans;
// @desc    Get current membership
// @route   GET /api/v1/payments/membership
// @access  Private
const getMembership = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id)
            .select('membershipLevel membershipExpiresAt membershipStartedAt membershipTimeline');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const isActive = user.membershipExpiresAt ?
            new Date(user.membershipExpiresAt) > new Date() : false;
        res.json({
            success: true,
            data: {
                level: user.membershipLevel,
                status: isActive ? 'active' : 'expired',
                startedAt: user.membershipStartedAt,
                expiresAt: user.membershipExpiresAt,
                timeline: user.membershipTimeline
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMembership = getMembership;
// @desc    Purchase membership
// @route   POST /api/v1/payments/membership
// @access  Private
const purchaseMembership = async (req, res, next) => {
    try {
        const { planId, cardNumber, expiry, cvv } = req.body;
        // Validate plan
        const plan = MEMBERSHIP_PLANS[planId];
        if (!plan) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan selected'
            });
        }
        // Check for dev override card
        const isDevCard = cardNumber === DEV_CARD.number &&
            expiry === DEV_CARD.expiry &&
            cvv === DEV_CARD.cvv;
        let paymentSuccess = false;
        if (isDevCard) {
            // Skip payment, approve immediately
            paymentSuccess = true;
            console.log('[Payment] Dev card used - payment skipped');
        }
        else {
            // Process payment (simulated - replace with actual payment gateway)
            paymentSuccess = await processPayment(cardNumber, expiry, cvv, plan.price);
        }
        if (!paymentSuccess) {
            return res.status(400).json({
                success: false,
                message: 'Payment failed'
            });
        }
        // Update user membership
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        // Calculate new expiry date
        const now = new Date();
        let newExpiry;
        if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
            // Extend existing membership
            newExpiry = new Date(user.membershipExpiresAt);
            newExpiry.setDate(newExpiry.getDate() + plan.duration);
        }
        else {
            // Start new membership
            newExpiry = new Date(now);
            newExpiry.setDate(newExpiry.getDate() + plan.duration);
        }
        // Determine status change
        let statusChange = 'active';
        if (plan.level > user.membershipLevel) {
            statusChange = 'upgraded';
        }
        else if (plan.level < user.membershipLevel) {
            statusChange = 'downgraded';
        }
        // Update membership
        user.membershipLevel = plan.level;
        user.membershipStartedAt = now;
        user.membershipExpiresAt = newExpiry;
        // Add to timeline
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({
            level: plan.level,
            status: statusChange,
            startedAt: now,
            endedAt: newExpiry,
            notes: isDevCard ? 'Dev card used' : `Payment successful - ${plan.name}`
        });
        // Add to payment history
        user.paymentHistory = user.paymentHistory || [];
        user.paymentHistory.push({
            amount: plan.price,
            currency: 'USD',
            level: plan.name,
            duration: `${plan.duration} days`,
            paymentIntentId: isDevCard ? 'dev_payment_' + Date.now() : 'pi_' + Date.now(),
            status: 'completed',
            date: now
        });
        await user.save();
        res.json({
            success: true,
            message: 'Membership purchased successfully',
            data: {
                level: user.membershipLevel,
                status: 'active',
                startedAt: user.membershipStartedAt,
                expiresAt: user.membershipExpiresAt
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.purchaseMembership = purchaseMembership;
// @desc    Extend membership
// @route   POST /api/v1/payments/extend
// @access  Private
const extendMembership = async (req, res, next) => {
    try {
        const { months, cardNumber, expiry, cvv } = req.body;
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        const currentPlan = MEMBERSHIP_PLANS[user.membershipLevel === 1 ? 'basic' : 'premium'];
        if (!currentPlan) {
            return res.status(400).json({
                success: false,
                message: 'No active membership to extend'
            });
        }
        const price = (currentPlan.price / 30) * (months * 30);
        // Check for dev card
        const isDevCard = cardNumber === DEV_CARD.number &&
            expiry === DEV_CARD.expiry &&
            cvv === DEV_CARD.cvv;
        let paymentSuccess = false;
        if (isDevCard) {
            paymentSuccess = true;
        }
        else {
            paymentSuccess = await processPayment(cardNumber, expiry, cvv, price);
        }
        if (!paymentSuccess) {
            return res.status(400).json({
                success: false,
                message: 'Payment failed'
            });
        }
        // Extend membership
        const now = new Date();
        let currentExpiry = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) : now;
        if (currentExpiry <= now) {
            currentExpiry = now;
        }
        currentExpiry.setMonth(currentExpiry.getMonth() + months);
        user.membershipExpiresAt = currentExpiry;
        // Update timeline
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({
            level: user.membershipLevel,
            status: 'active',
            startedAt: now,
            endedAt: currentExpiry,
            notes: `Extended by ${months} month(s)`
        });
        await user.save();
        res.json({
            success: true,
            message: `Membership extended by ${months} month(s)`,
            data: {
                expiresAt: user.membershipExpiresAt
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.extendMembership = extendMembership;
// @desc    Cancel membership
// @route   POST /api/v1/payments/cancel
// @access  Private
const cancelMembership = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (user.membershipLevel === 0) {
            return res.status(400).json({
                success: false,
                message: 'No active membership to cancel'
            });
        }
        // Add to timeline
        user.membershipTimeline = user.membershipTimeline || [];
        user.membershipTimeline.push({
            level: user.membershipLevel,
            status: 'cancelled',
            startedAt: user.membershipStartedAt || new Date(),
            endedAt: new Date(),
            notes: 'Membership cancelled by user'
        });
        // Downgrade to free
        user.membershipLevel = 0;
        await user.save();
        res.json({
            success: true,
            message: 'Membership cancelled'
        });
    }
    catch (error) {
        next(error);
    }
};
exports.cancelMembership = cancelMembership;
// @desc    Get payment history
// @route   GET /api/v1/payments/history
// @access  Private
const getPaymentHistory = async (req, res, next) => {
    try {
        const user = await User_1.default.findById(req.user?.id)
            .select('paymentHistory');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({
            success: true,
            data: user.paymentHistory || []
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPaymentHistory = getPaymentHistory;
// Helper function to process payment
async function processPayment(cardNumber, expiry, cvv, amount) {
    // This is a placeholder - in production, integrate with Stripe, PayPal, etc.
    // For now, simulate successful payment for valid-looking cards
    if (cardNumber && cardNumber.length >= 13 && expiry && cvv) {
        console.log(`[Payment] Processing payment of $${amount}`);
        return true;
    }
    return false;
}
exports.default = {
    getPlans: exports.getPlans,
    getMembership: exports.getMembership,
    purchaseMembership: exports.purchaseMembership,
    extendMembership: exports.extendMembership,
    cancelMembership: exports.cancelMembership,
    getPaymentHistory: exports.getPaymentHistory
};
//# sourceMappingURL=paymentController.js.map