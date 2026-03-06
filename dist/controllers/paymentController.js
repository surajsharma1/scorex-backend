"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.confirmPayment = exports.processPayment = exports.createSubscription = exports.createPaymentIntent = void 0;
const stripe_1 = __importDefault(require("stripe"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe = null;
try {
    if (stripeSecretKey) {
        stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2026-02-25.clover',
        });
    }
}
catch (error) {
    console.warn('Stripe not configured:', error);
}
const createPaymentIntent = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Payment service not configured' });
        }
        const { amount, level, duration } = req.body;
        // Convert amount to cents for Stripe
        const amountInCents = Math.round(amount * 100);
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            payment_method_types: ['card', 'upi'],
            metadata: {
                level,
                duration,
                userId: req.user?._id || 'unknown'
            }
        });
        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    }
    catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};
exports.createPaymentIntent = createPaymentIntent;
// Helper to convert membershipLevel to string for token
const getMembershipString = (level) => {
    switch (level) {
        case 1: return 'basic';
        case 2: return 'premium';
        default: return 'free';
    }
};
// Helper to generate JWT Token
const signToken = (user) => {
    return jsonwebtoken_1.default.sign({
        id: user._id,
        role: user.role,
        membership: getMembershipString(user.membershipLevel || 0),
        membershipExpiresAt: user.membershipExpiresAt ? user.membershipExpiresAt.toISOString() : null
    }, process.env.JWT_SECRET, { expiresIn: '30d' });
};
const createSubscription = async (req, res) => {
    const { planId, cardNumber } = req.body;
    const user = req.user;
    try {
        // Check for test cards: ADMINFREEPASS or 8871474139
        if (cardNumber === 'ADMINFREEPASS' || cardNumber === '8871474139') {
            let expiryDays = 0;
            let membershipLevel = 1;
            // Parse planId from frontend format: premium-lv1-1-day, premium-lv2-1-week, etc.
            // Also handle legacy formats: 1-day, 1-week, premium-level1, premium-level2
            if (planId.includes('lv1') || planId === 'premium-level1') {
                membershipLevel = 1;
            }
            else if (planId.includes('lv2') || planId === 'premium-level2') {
                membershipLevel = 2;
            }
            if (planId.includes('1-day') || planId === '1-day') {
                expiryDays = 1;
            }
            else if (planId.includes('1-week') || planId === '1-week') {
                expiryDays = 7;
            }
            else if (planId.includes('1-month') || planId === '1-month' || planId === 'premium-level1') {
                expiryDays = 30;
            }
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiryDays);
            // Save to database - update both old and new membership fields
            user.membership = membershipLevel === 1 ? 'premium-level1' : 'premium-level2';
            user.membershipLevel = membershipLevel;
            user.membershipExpiresAt = expiryDate;
            user.isPremium = true;
            user.premiumExpiry = expiryDate;
            await user.save();
            // Generate new JWT token with updated membership
            const newToken = signToken(user);
            return res.status(200).json({
                success: true,
                message: 'Test card applied! Membership activated.',
                membership: user.membership,
                membershipLevel: membershipLevel,
                membershipExpiresAt: user.membershipExpiresAt,
                token: newToken // Return new token with updated membership
            });
        }
        // ... 2. Run Standard Stripe / Payment Gateway Logic Here ...
    }
    catch (error) {
        res.status(500).json({ message: 'Payment initiation failed', error });
    }
};
exports.createSubscription = createSubscription;
// scorex-backend/src/controllers/paymentController.ts
const processPayment = async (req, res) => {
    const { planId, cardNumber, duration } = req.body;
    const user = req.user;
    try {
        // Admin Override Card
        if (cardNumber === 'ADMIN-FREE-PASS-2026') {
            let expiryDays = 0;
            if (duration === '1_day')
                expiryDays = 1;
            else if (duration === '1_week')
                expiryDays = 7;
            else if (duration === '1_month')
                expiryDays = 30;
            else if (duration === '1_year')
                expiryDays = 365;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + expiryDays);
            // Grant premium automatically
            user.isPremium = true;
            user.premiumExpiry = expiryDate;
            await user.save();
            return res.status(200).json({ message: 'Admin pass accepted. Premium granted!', success: true });
        }
        // ... Handle your normal Stripe / Payment gateway logic here ...
    }
    catch (error) {
        res.status(500).json({ message: 'Payment failed', error });
    }
};
exports.processPayment = processPayment;
const confirmPayment = async (req, res) => {
    try {
        if (!stripe) {
            return res.status(500).json({ error: 'Payment service not configured' });
        }
        const { paymentIntentId, level, duration } = req.body;
        const userId = req.user?._id;
        // Retrieve the payment intent to confirm it's succeeded
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'succeeded') {
            // Calculate membership expiry date based on duration
            const now = new Date();
            let expiryDate = new Date();
            switch (duration) {
                case '1day':
                    expiryDate.setDate(now.getDate() + 1);
                    break;
                case '1week':
                    expiryDate.setDate(now.getDate() + 7);
                    break;
                case '1month':
                    expiryDate.setMonth(now.getMonth() + 1);
                    break;
                default:
                    expiryDate.setDate(now.getDate() + 7); // Default to 1 week
            }
            // Convert level string to number
            const membershipLevelNum = level === 'premium' ? 2 : level === 'basic' ? 1 : 0;
            // Update user membership in database
            const updatedUser = await User_1.default.findByIdAndUpdate(userId, {
                membershipLevel: membershipLevelNum,
                membershipExpiresAt: expiryDate,
                $push: {
                    paymentHistory: {
                        amount: paymentIntent.amount / 100, // Convert from cents
                        currency: paymentIntent.currency,
                        level: level,
                        duration: duration,
                        paymentIntentId: paymentIntentId,
                        status: 'completed',
                        date: new Date()
                    }
                }
            }, { new: true });
            if (!updatedUser) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Generate new JWT token with updated membership and expiry
            const newToken = jsonwebtoken_1.default.sign({
                id: updatedUser._id,
                role: updatedUser.role,
                membership: getMembershipString(updatedUser.membershipLevel || 0),
                membershipExpiresAt: updatedUser.membershipExpiresAt ? updatedUser.membershipExpiresAt.toISOString() : null
            }, process.env.JWT_SECRET, { expiresIn: '30d' });
            res.json({
                success: true,
                message: 'Payment confirmed successfully',
                membership: getMembershipString(membershipLevelNum),
                membershipExpiry: expiryDate,
                duration,
                token: newToken // Return new token with updated membership
            });
        }
        else {
            res.status(400).json({
                success: false,
                message: 'Payment not completed'
            });
        }
    }
    catch (error) {
        console.error('Error confirming payment:', error);
        res.status(500).json({ error: 'Failed to confirm payment' });
    }
};
exports.confirmPayment = confirmPayment;
const getPaymentHistory = async (req, res) => {
    try {
        // This would typically fetch payment history from database
        // For now, return empty array
        res.json({
            payments: []
        });
    }
    catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
};
exports.getPaymentHistory = getPaymentHistory;
//# sourceMappingURL=paymentController.js.map