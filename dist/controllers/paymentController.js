"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.confirmPayment = exports.createPaymentIntent = void 0;
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2024-12-18.acacia',
});
const createPaymentIntent = async (req, res) => {
    try {
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
                userId: req.user?.id
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
const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId, level, duration } = req.body;
        // Retrieve the payment intent to confirm it's succeeded
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'succeeded') {
            // Update user membership in database
            // This would typically update the user's membership level and expiry date
            // For now, we'll just return success
            res.json({
                success: true,
                message: 'Payment confirmed successfully',
                membership: `premium-${level}`,
                duration
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