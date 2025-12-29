"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tournamentController_1 = require("../controllers/tournamentController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.route('/')
    .get(auth_1.protect, tournamentController_1.getTournaments)
    .post(auth_1.protect, tournamentController_1.createTournament);
router.route('/:id')
    .get(auth_1.protect, tournamentController_1.getTournament)
    .put(auth_1.protect, tournamentController_1.updateTournament)
    .delete(auth_1.protect, tournamentController_1.deleteTournament);
router.post('/:id/live', auth_1.protect, tournamentController_1.goLive);
router.put('/:id/scores', auth_1.protect, tournamentController_1.updateLiveScores);
exports.default = router;
//# sourceMappingURL=tournaments.js.map