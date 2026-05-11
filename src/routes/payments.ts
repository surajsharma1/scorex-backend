import { validatePromoCode } from '../controllers/promoController';
import express from 'express';
import { protect } from '../middleware/auth';
import paymentController from '../controllers/paymentController';

const router = express.Router();

// Public routes
router.get('/plans', paymentController.getPlans);

// Protected routes
router.get('/membership', protect as any, paymentController.getMembership);
router.post('/subscribe', protect, paymentController.purchaseMembership);
router.post('/extend', protect as any, paymentController.extendMembership);
router.post('/cancel', protect as any, paymentController.cancelMembership);
router.post('/razorpay-order', protect, paymentController.createRazorpayOrder);
router.post('/verify-razorpay-payment', protect, paymentController.verifyRazorpayPayment);
router.get('/history', protect as any, paymentController.getPaymentHistory);


// ── Promo code validation ─────────────────────────────────────────────────────
router.post('/validate-promo', protect, validatePromoCode);

export default router;
