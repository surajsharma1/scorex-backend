import express from 'express';
import { register, login } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);

export default router;

router.get('/test', (req, res) => {
  res.json({ message: 'API is working!', timestamp: new Date().toISOString() });
});