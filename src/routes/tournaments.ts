import { Router, RequestHandler } from 'express';
import { 
  createTournament, 
  getTournaments, 
  getTournamentById, 
  addTeamToTournament, 
  generateFixtures,
  deleteTournament,
  getTournamentMatches
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth'; 
import { validateRequest, createTournamentSchema } from '../utils/validation';

const router = Router();

// Public Routes
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.get('/:id/matches', getTournamentMatches);

// Protected Routes
router.post('/', protect as RequestHandler, validateRequest(createTournamentSchema), createTournament);
router.delete('/:id', protect as RequestHandler, deleteTournament);
router.post('/:id/teams', protect as RequestHandler, addTeamToTournament);
router.post('/:id/fixtures', protect as RequestHandler, generateFixtures);

export default router;

