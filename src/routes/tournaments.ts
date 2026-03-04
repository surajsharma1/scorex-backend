import { Router, RequestHandler } from 'express';
import { 
  createTournament, 
  getTournaments, 
  getTournamentById, 
  addTeamToTournament, 
  generateFixtures 
} from '../controllers/tournamentController';
import { protect } from '../middleware/auth'; 
import { validateRequest, createTournamentSchema } from '../utils/validation';

const router = Router();

// Public Routes
router.get('/', getTournaments);
router.get('/:id', getTournamentById);

// Protected Routes - Cast to RequestHandler to satisfy TypeScript strict mode
router.use(protect as unknown as RequestHandler); 

router.post('/', validateRequest(createTournamentSchema), createTournament);
router.post('/:id/teams', addTeamToTournament);
router.post('/:id/fixtures', generateFixtures);

export default router;
