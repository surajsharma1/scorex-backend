import express from 'express';
import {
  createClub,
  getClubs,
  getClub,
  joinClub,
  leaveClub,
  updateClub,
  deleteClub,
  addMember,
  removeMember
} from '../controllers/clubController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes - anyone can view clubs
router.get('/', getClubs);
router.get('/:clubId', getClub);

// Protected routes - require authentication
router.post('/', protect as any, createClub);
router.post('/:clubId/join', protect as any, joinClub);
router.post('/:clubId/leave', protect as any, leaveClub);
router.put('/:clubId', protect as any, updateClub);
router.delete('/:clubId', protect as any, deleteClub);
router.post('/:clubId/members', protect as any, addMember);
router.delete('/:clubId/members/:userId', protect as any, removeMember);

export default router;
