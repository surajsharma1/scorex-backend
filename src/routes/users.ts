import express from 'express';
import { getUsers, updateUserRole } from '../controllers/userController';
import { protect, protectAdmin } from '../middleware/auth';
import { AuthRequest } from '../middleware/auth';

const router = express.Router();

// router.get('/', protectAdmin, getUsers);
// router.put('/:id', protectAdmin, updateUserRole);

export default router;