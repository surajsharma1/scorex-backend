import express from 'express';
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  addPlayer,
} from '../controllers/teamController';
import { protect } from '../middleware/auth';
import upload from '../middleware/upload';
import { AuthRequest } from '../middleware/auth';
import { validateRequest, createTeamSchema, updateTeamSchema, addPlayerSchema } from '../utils/validation';
import { createLimiter } from '../utils/rateLimiters';


const router = express.Router();

// Public routes - anyone can view teams
router.get('/', getTeams);

// Protected routes - require authentication
router.post('/', protect as any, createLimiter, upload.single('logo'), validateRequest(createTeamSchema), createTeam);
router.put('/:id', protect as any, upload.single('logo'), validateRequest(updateTeamSchema), updateTeam);
router.delete('/:id', protect as any , deleteTeam);
router.post('/:teamId/players', protect as any , upload.single('image'), validateRequest(addPlayerSchema), addPlayer);

export default router;