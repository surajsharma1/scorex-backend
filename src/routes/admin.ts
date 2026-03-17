import express from 'express';
import { protect } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';
import * as adminController from '../controllers/adminController';

const router = express.Router();

router.get('/membership-prices', protect, isAdmin, adminController.getMembershipPrices);
router.post('/membership-prices', protect, isAdmin, adminController.updateMembershipPrices);

export default router;

