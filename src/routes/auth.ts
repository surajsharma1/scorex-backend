import express from 'express';
import { register, login } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { forgotPassword, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;