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

// All club routes require authentication
router.use(protect as any);

// Get all clubs
router.get('/', getClubs);

// Get specific club
router.get('/:clubId', getClub);

// Create club
router.post('/', createClub);

// Join club
router.post('/:clubId/join', joinClub);

// Leave club
router.post('/:clubId/leave', leaveClub);

// Update club (creator only)
router.put('/:clubId', updateClub);

// Delete club (creator only)
router.delete('/:clubId', deleteClub);

// Add member (creator only)
router.post('/:clubId/members', addMember);

// Remove member (creator only)
router.delete('/:clubId/members/:userId', removeMember);

export default router;
