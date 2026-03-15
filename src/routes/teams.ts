import express from 'express';
import { protect } from '../middleware/auth';
import * as teamController from '../controllers/teamController';

const router = express.Router();

router.get('/', teamController.getTeams);
router.get('/:id', teamController.getTeam);
router.post('/', protect, teamController.createTeam);
router.put('/:id', protect, teamController.updateTeam);
router.delete('/:id', protect, teamController.deleteTeam);
router.post('/:id/players', protect, teamController.addPlayer);
router.delete('/:id/players/:playerId', protect, teamController.removePlayer);

export default router;

