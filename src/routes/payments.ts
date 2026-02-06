import express from 'express';
import { createPaymentIntent, confirmPayment, getPaymentHistory, handleWebhook } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected routes
router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.get('/history', protect, getPaymentHistory);

// Webhook route (no auth needed)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
