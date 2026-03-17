import express from 'express';
import {
  getClubs,
  getClub,
  getMyClubs,
  createClub,
  updateClub,
  deleteClub,
  joinClub,
  leaveClub,
  approveJoinRequest,
  addViceLeader,
  removeMember
} from '../controllers/clubController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getClubs);
router.get('/:clubId', getClub);

// Protected routes
router.get('/my', protect, getMyClubs);
router.post('/', protect, createClub);
router.put('/:clubId', protect, updateClub);
router.delete('/:clubId', protect, deleteClub);
router.post('/:clubId/join', protect, joinClub);
router.post('/:clubId/leave', protect, leaveClub);
router.post('/:clubId/approve/:userId', protect, approveJoinRequest);
router.post('/:clubId/vice-leader/:userId', protect, addViceLeader);
router.delete('/:clubId/members/:userId', protect, removeMember);

export default router;
