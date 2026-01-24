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

const router = express.Router();

router.get('/', protect, getTeams);
router.post('/', protect, upload.single('logo'), createTeam);
router.put('/:id', protect, upload.single('logo'), updateTeam);
router.delete('/:id', protect, deleteTeam);
router.post('/:teamId/players', protect, upload.single('image'), addPlayer);

export default router;