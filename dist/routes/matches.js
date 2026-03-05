"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public route to view all matches (supports filtering via query params)
router.get('/', matchController_1.getAllMatches);
// Public route to view live scores
router.get('/:id', matchController_1.getMatchById);
// Protected Routes
router.use(auth_1.protect);
// Match management
router.post('/', matchController_1.createMatch);
router.put('/:id/start', matchController_1.startMatch);
// Live Scoring Engine
router.post('/:id/score', matchController_1.scoreBall);
router.post('/:id/undo', matchController_1.undoLastBall);
exports.default = router;
//# sourceMappingURL=matches.js.map