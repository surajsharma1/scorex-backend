"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public Routes
router.get('/', tournamentController_1.getTournaments);
router.get('/:id', tournamentController_1.getTournamentById);
// Protected Routes - Cast to RequestHandler to satisfy TypeScript strict mode
router.use(auth_1.protect);
router.post('/', tournamentController_1.createTournament);
router.post('/:id/teams', tournamentController_1.addTeamToTournament);
router.post('/:id/fixtures', tournamentController_1.generateFixtures);
exports.default = router;
//# sourceMappingURL=tournaments.js.map