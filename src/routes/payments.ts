import express from 'express';
import { protect } from '../middleware/auth';
import { createPaymentIntent, confirmPayment, getPaymentHistory, createSubscription } from '../controllers/paymentController';

const router = express.Router();

// Protected routes
router.post('/create-payment-intent', protect as any, createPaymentIntent);
router.post('/create-intent', protect as any, createPaymentIntent); // Alias for frontend compatibility
router.post('/confirm', protect as any, confirmPayment);
router.get('/history', protect as any, getPaymentHistory);

// Subscription route - for test card payments
router.post('/subscribe', protect as any, createSubscription as any);

export default router;
