"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const teamController_1 = require("../controllers/teamController");
const auth_1 = require("../middleware/auth");
const upload_1 = __importDefault(require("../middleware/upload"));
const server_1 = require("../server");
const router = express_1.default.Router();
router.get('/', auth_1.protect, teamController_1.getTeams);
router.post('/', auth_1.protect, server_1.createLimiter, upload_1.default.single('logo'), teamController_1.createTeam);
router.put('/:id', auth_1.protect, upload_1.default.single('logo'), teamController_1.updateTeam);
router.delete('/:id', auth_1.protect, teamController_1.deleteTeam);
router.post('/:teamId/players', auth_1.protect, upload_1.default.single('image'), teamController_1.addPlayer);
exports.default = router;
//# sourceMappingURL=teams.js.map