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

// IMPORTANT: /my must come BEFORE /:id so Express doesn't treat "my" as an id
router.get('/my', protect, getMyClubs);

// Public routes
router.get('/', getClubs);
router.get('/:id', getClub);

// Protected routes
router.post('/', protect, createClub);
router.put('/:id', protect, updateClub);
router.delete('/:id', protect, deleteClub);
router.post('/:id/join', protect, joinClub);
router.post('/:id/leave', protect, leaveClub);
router.post('/:id/approve/:userId', protect, approveJoinRequest);
router.post('/:id/vice-leader/:userId', protect, addViceLeader);
router.delete('/:id/members/:userId', protect, removeMember);

// Image upload routes
import { uploadLogo, uploadBanner } from '../controllers/clubImageController';
router.post('/:id/upload-logo', protect, uploadLogo);
router.post('/:id/upload-banner', protect, uploadBanner);

export default router;
