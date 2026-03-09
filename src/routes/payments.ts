import express from 'express';
import { protect } from '../middleware/auth';
import { getPlans, getMembership, purchaseMembership, extendMembership, cancelMembership, getPaymentHistory } from '../controllers/paymentController';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);

// Protected routes
router.get('/membership', protect as any, getMembership);
router.post('/purchase', protect as any, purchaseMembership);
router.post('/extend', protect as any, extendMembership);
router.post('/cancel', protect as any, cancelMembership);
router.get('/history', protect as any, getPaymentHistory);

export default router;
