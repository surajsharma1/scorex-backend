import { Router, RequestHandler } from 'express';
import { 
  createTournament, 
  getTournaments, 
  getTournament, 
  updateTournament,
  addTeam,
  removeTeam,
  generateBracket,
  deleteTournament,
  getTournamentStats,
  getTournamentMatches,
  startTournament,
  endTournament,
  getMyOrganizedTournaments,
  searchTournaments
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth'; 
import { validateRequest, createTournamentSchema, updateTournamentSchema } from '../utils/validation';

const router = Router();

// Specific named routes MUST come before /:id to avoid being swallowed
router.get('/search', searchTournaments);
router.get('/upcoming', getTournaments);
router.get('/ongoing', getTournaments);
router.get('/featured', getTournaments);
router.get('/my/organized', protect as RequestHandler, getMyOrganizedTournaments);

// Public parameterised routes
router.get('/', getTournaments);
router.get('/:id', getTournament);
router.get('/:id/stats', getTournamentStats);
router.get('/:id/matches', getTournamentMatches);

// Protected Routes
router.post('/', protect as RequestHandler, validateRequest(createTournamentSchema), createTournament);
router.put('/:id', protect as RequestHandler, validateRequest(updateTournamentSchema), updateTournament);
router.delete('/:id', protect as RequestHandler, deleteTournament);
router.post('/:id/teams', protect as RequestHandler, addTeam);
router.delete('/:id/teams/:teamId', protect as RequestHandler, removeTeam);
router.post('/:id/bracket', protect as RequestHandler, generateBracket);
router.post('/:id/start', protect as RequestHandler, startTournament);
router.post('/:id/end', protect as RequestHandler, endTournament);

export default router;