"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middleware/auth");
const upload_1 = __importDefault(require("../middleware/upload"));
const validation_1 = require("../utils/validation");
const rateLimiters_1 = require("../utils/rateLimiters");
const router = express_1.default.Router();
// Public routes - anyone can view teams
router.get('/', teamController_1.getTeams);
router.get('/search', teamController_1.searchTeams);
router.get('/user/:userId', teamController_1.getUserTeams);
router.get('/:id', teamController_1.getTeam);
router.get('/:id/players', teamController_1.getTeamPlayers);
// Protected routes - require authentication
router.post('/', auth_1.protect, rateLimiters_1.createLimiter, upload_1.default.single('logo'), (0, validation_1.validateRequest)(validation_1.createTeamSchema), teamController_1.createTeam);
router.put('/:id', auth_1.protect, upload_1.default.single('logo'), (0, validation_1.validateRequest)(validation_1.updateTeamSchema), teamController_1.updateTeam);
router.delete('/:id', auth_1.protect, teamController_1.deleteTeam);
router.post('/:id/players', auth_1.protect, upload_1.default.single('image'), (0, validation_1.validateRequest)(validation_1.addPlayerSchema), teamController_1.addPlayer);
router.delete('/:id/players/:playerId', auth_1.protect, teamController_1.removePlayer);
exports.default = router;
//# sourceMappingURL=teams.js.map