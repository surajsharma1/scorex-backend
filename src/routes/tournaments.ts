import { Router, RequestHandler } from 'express';
import { 
  createTournament, 
  getTournaments, 
  getTournament, 
  addTeam, 
  generateBracket,
  deleteTournament,
  getTournamentStats
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth'; 
import { validateRequest, createTournamentSchema } from '../utils/validation';

const router = Router();

// Public Routes
router.get('/', getTournaments);
router.get('/upcoming', getTournaments);
router.get('/ongoing', getTournaments);
router.get('/featured', getTournaments);
router.get('/:id', getTournament);
router.get('/:id/stats', getTournamentStats);

// Protected Routes
router.post('/', protect as RequestHandler, validateRequest(createTournamentSchema), createTournament);
router.delete('/:id', protect as RequestHandler, deleteTournament);
router.post('/:id/teams', protect as RequestHandler, addTeam);
router.post('/:id/bracket', protect as RequestHandler, generateBracket);

export default router;

