import express from 'express';
import { protect } from '../middleware/auth';
import { validateRequest } from '../utils/validation';
import * as tournamentController from '../controllers/tournamentController';
import { createTournamentSchema } from '../utils/validation';

const router = express.Router();

router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById || ((req, res) => res.status(501).json({success:false, message: 'TODO' })));
router.post('/', protect, validateRequest(createTournamentSchema), tournamentController.createTournament);
router.put('/:id', protect, tournamentController.updateTournament || ((req, res) => res.status(501).json({success:false, message: 'TODO' })));
router.delete('/:id', protect, tournamentController.deleteTournament || ((req, res) => res.status(501).json({success:false, message: 'TODO' })));
router.post('/:id/bracket', protect, tournamentController.generateBracket);
router.post('/:id/start', protect, tournamentController.startTournament);

export default router;

