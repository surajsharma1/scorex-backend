import express from 'express';
import {
  getTeams,
  getTeam,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayer,
  removePlayer,
  getTeamPlayers,
  getUserTeams,
  searchTeams,
} from '../controllers/teamController';
import { protect } from '../middleware/auth';
import upload from '../middleware/upload';
import { validateRequest, createTeamSchema, updateTeamSchema, addPlayerSchema } from '../utils/validation';
import { createLimiter } from '../utils/rateLimiters';

const router = express.Router();

// Public routes - anyone can view teams
router.get('/', getTeams);
router.get('/search', searchTeams);
router.get('/user/:userId', getUserTeams);
router.get('/:id', getTeam);
router.get('/:id/players', getTeamPlayers);

// Protected routes - require authentication
router.post('/', protect as any, createLimiter, upload.single('logo'), validateRequest(createTeamSchema), createTeam);
router.put('/:id', protect as any, upload.single('logo'), validateRequest(updateTeamSchema), updateTeam);
router.delete('/:id', protect as any, deleteTeam);
router.post('/:id/players', protect as any, upload.single('image'), validateRequest(addPlayerSchema), addPlayer);
router.delete('/:id/players/:playerId', protect as any, removePlayer);

export default router;