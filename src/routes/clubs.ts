import express from 'express';
import {
  createClub,
  getClubs,
  getClub,
  getMyClubs,
  joinClub,
  leaveClub,
  updateClub,
  deleteClub
} from '../controllers/clubController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes - anyone can view clubs
router.get('/', getClubs);
router.get('/:clubId', getClub);
router.get('/my', protect as any, (req, res, next) => {
  console.log('📍 ROUTE: /clubs/my - POST-AUTH - User:', (req as any).user?._id, (req as any).user?.email);
  getMyClubs(req as any, res, next);
});



// Protected routes - require authentication
router.post('/', protect as any, createClub as any);
router.post('/:clubId/join', protect as any, joinClub as any);
router.post('/:clubId/leave', protect as any, leaveClub as any);
router.put('/:clubId', protect as any, updateClub as any);
router.delete('/:clubId', protect as any, deleteClub as any);

export default router;
