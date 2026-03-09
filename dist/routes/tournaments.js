"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const router = (0, express_1.Router)();
// Public Routes
router.get('/', tournamentController_1.getTournaments);
router.get('/:id', tournamentController_1.getTournamentById);
router.get('/:id/matches', tournamentController_1.getTournamentMatches);
// Protected Routes
router.post('/', auth_1.protect, (0, validation_1.validateRequest)(validation_1.createTournamentSchema), tournamentController_1.createTournament);
router.delete('/:id', auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/teams', auth_1.protect, tournamentController_1.addTeamToTournament);
router.post('/:id/fixtures', auth_1.protect, tournamentController_1.generateFixtures);
exports.default = router;
//# sourceMappingURL=tournaments.js.map