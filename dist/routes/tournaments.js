"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tournamentController_1 = require("../controllers/tournamentController");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Specific named routes MUST come before /:id to avoid being swallowed
router.get('/search', tournamentController_1.searchTournaments);
router.get('/upcoming', tournamentController_1.getTournaments);
router.get('/ongoing', tournamentController_1.getTournaments);
router.get('/featured', tournamentController_1.getTournaments);
router.get('/my/organized', auth_1.protect, tournamentController_1.getMyOrganizedTournaments);
// Public parameterised routes
router.get('/', tournamentController_1.getTournaments);
router.get('/:id', tournamentController_1.getTournament);
router.get('/:id/stats', tournamentController_1.getTournamentStats);
router.get('/:id/matches', tournamentController_1.getTournamentMatches);
router.post('/:id/matches', auth_1.protect, matchController_1.createMatch);
// Protected Routes
router.post('/', auth_1.protect, (0, validation_1.validateRequest)(validation_1.createTournamentSchema), tournamentController_1.createTournament);
router.put('/:id', auth_1.protect, (0, validation_1.validateRequest)(validation_1.updateTournamentSchema), tournamentController_1.updateTournament);
router.delete('/:id', auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/teams', auth_1.protect, tournamentController_1.addTeam);
router.delete('/:id/teams/:teamId', auth_1.protect, tournamentController_1.removeTeam);
router.post('/:id/bracket', auth_1.protect, tournamentController_1.generateBracket);
router.post('/:id/start', auth_1.protect, tournamentController_1.startTournament);
router.post('/:id/end', auth_1.protect, tournamentController_1.endTournament);
exports.default = router;
//# sourceMappingURL=tournaments.js.map