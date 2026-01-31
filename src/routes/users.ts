import express from 'express';
import { getUsers, updateUserRole } from '../controllers/userController';
import { protectAdmin } from '../middleware/auth'; // Single import
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

router.get('/', protectAdmin as any, getUsers);
router.put('/:id', protectAdmin as any, updateUserRole);

export default router;