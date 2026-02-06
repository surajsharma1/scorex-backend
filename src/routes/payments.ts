import express from 'express';
import { protect } from '../middleware/auth';
import { createPaymentIntent, confirmPayment, getPaymentHistory } from '../controllers/paymentController';

const router = express.Router();

// Protected routes
router.post('/create-payment-intent', protect as any, createPaymentIntent);
router.post('/confirm', protect as any, confirmPayment);
router.get('/history', protect as any, getPaymentHistory);

export default router;
