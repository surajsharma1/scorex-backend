import express from 'express';
import { protect } from '../middleware/auth';
import * as matchController from '../controllers/matchController';
import { addBallSchema, createMatchSchema } from '../utils/validation';
import { validateRequest } from '../utils/validation';

const router = express.Router();

router.get('/', matchController.getMatches);
router.get('/:id', matchController.getMatch);
router.get('/live', matchController.getLiveMatches);
router.post('/', protect, validateRequest(createMatchSchema), matchController.createMatch);
router.put('/:id', protect, matchController.updateMatch);
router.delete('/:id', protect, matchController.deleteMatch);

router.post('/:id/start', protect, matchController.startMatch);
router.post('/:id/score', protect, validateRequest(addBallSchema), matchController.addBall);
router.post('/:id/end-innings', protect, matchController.endInnings);
router.post('/:id/end', protect, matchController.endMatch);

export default router;

