import express from 'express';
import { getGlobalLeaderboard, getTournamentLeaderboard, getMatchLeaderboard, getOrangeCap, getPurpleCap } from '../controllers/leaderboardController';

const router = express.Router();

// Public routes - leaderboard is public
router.get('/', getGlobalLeaderboard);
router.get('/global', getGlobalLeaderboard);
router.get('/tournament/:id', getTournamentLeaderboard);
router.get('/match/:id', getMatchLeaderboard);
router.get('/orange-cap', getOrangeCap);
router.get('/purple-cap', getPurpleCap);

export default router;
