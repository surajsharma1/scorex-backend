"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.get('/', matchController_1.getMatches);
router.get('/live', matchController_1.getLiveMatches);
router.get('/upcoming', matchController_1.getUpcomingMatches);
router.get('/:id', matchController_1.getMatch);
// Protected routes
router.post('/', auth_1.protect, matchController_1.createMatch);
router.put('/:id', auth_1.protect, matchController_1.updateMatch);
router.delete('/:id', auth_1.protect, matchController_1.deleteMatch);
// Match setup
router.put('/:id/start', auth_1.protect, matchController_1.startMatch);
router.put('/:id/toss', auth_1.protect, async (req, res, next) => {
    // Toss is handled in startMatch
    res.status(400).json({ message: 'Use /start endpoint for toss' });
});
// Scoring
router.post('/:id/score', auth_1.protect, matchController_1.addBall);
// Player management
router.put('/:id/striker', auth_1.protect, matchController_1.setStriker);
router.put('/:id/non-striker', auth_1.protect, matchController_1.setNonStriker);
router.put('/:id/bowler', auth_1.protect, matchController_1.setBowler);
// Match control
router.post('/:id/end-innings', auth_1.protect, matchController_1.endInnings);
router.post('/:id/end', auth_1.protect, matchController_1.endMatch);
router.put('/:id/status', auth_1.protect, matchController_1.updateMatchStatus);
// Overlay
router.put('/:id/overlay', auth_1.protect, matchController_1.setMatchOverlay);
exports.default = router;
//# sourceMappingURL=matches.js.map