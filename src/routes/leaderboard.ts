import express from 'express';
import { getPlayerLeaderboard, getTeamLeaderboard, getBattingLeaderboard, getBowlingLeaderboard } from '../controllers/leaderboardController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All leaderboard routes require authentication
router.use(protect as any);

// Get player leaderboard
router.get('/players', getPlayerLeaderboard as any);

// Get team leaderboard
router.get('/teams', getTeamLeaderboard as any);

// Get batting leaderboard
router.get('/batting', getBattingLeaderboard as any);

// Get bowling leaderboard
router.get('/bowling', getBowlingLeaderboard as any);

export default router;
