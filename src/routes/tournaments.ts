import express from 'express';
import { protect } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import * as tournamentController from '../controllers/tournamentController';
import { createTournamentSchema } from '../utils/validation';

const router = express.Router();

router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById);
router.post('/', protect, validateRequest(createTournamentSchema), tournamentController.createTournament);
router.put('/:id', protect, tournamentController.updateTournament);
router.delete('/:id', protect, tournamentController.deleteTournament);
router.post('/:id/bracket', protect, tournamentController.generateBracket);
router.post('/:id/start', protect, tournamentController.startTournament);

export default router;

