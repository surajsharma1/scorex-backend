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
router.get('/', auth_1.protect, teamController_1.getTeams);
router.post('/', auth_1.protect, rateLimiters_1.createLimiter, upload_1.default.single('logo'), (0, validation_1.validateRequest)(validation_1.createTeamSchema), teamController_1.createTeam);
router.put('/:id', auth_1.protect, upload_1.default.single('logo'), (0, validation_1.validateRequest)(validation_1.updateTeamSchema), teamController_1.updateTeam);
router.delete('/:id', auth_1.protect, teamController_1.deleteTeam);
router.post('/:teamId/players', auth_1.protect, upload_1.default.single('image'), (0, validation_1.validateRequest)(validation_1.addPlayerSchema), teamController_1.addPlayer);
exports.default = router;
//# sourceMappingURL=teams.js.map