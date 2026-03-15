import express from 'express';
import { protect } from '../middleware/auth';
import { isAdmin } from '../middleware/auth';
import * as userController from '../controllers/userController';

const router = express.Router();

router.get('/search', userController.searchUsers);
router.get('/', isAdmin, userController.getUsers);
router.get('/:id', userController.getUser);
router.put('/:id/role', isAdmin, userController.updateRole);
router.put('/:id/membership', isAdmin, userController.updateMembership);

// Protected profile routes
router.use(protect);
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);

export default router;

