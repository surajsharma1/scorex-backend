"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Public Routes
router.get('/', tournamentController_1.getTournaments);
router.get('/upcoming', tournamentController_1.getTournaments);
router.get('/ongoing', tournamentController_1.getTournaments);
router.get('/featured', tournamentController_1.getTournaments);
router.get('/:id', tournamentController_1.getTournament);
router.get('/:id/stats', tournamentController_1.getTournamentStats);
router.get('/:id/matches', tournamentController_1.getTournamentMatches);
// Protected Routes
router.post('/', auth_1.protect, (0, validation_1.validateRequest)(validation_1.createTournamentSchema), tournamentController_1.createTournament);
router.delete('/:id', auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/teams', auth_1.protect, tournamentController_1.addTeam);
router.post('/:id/bracket', auth_1.protect, tournamentController_1.generateBracket);
exports.default = router;
//# sourceMappingURL=tournaments.js.map