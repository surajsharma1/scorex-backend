"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get('/', auth_1.protect, matchController_1.getMatches);
router.post('/', auth_1.protect, matchController_1.createMatch);
router.put('/:id', auth_1.protect, matchController_1.updateMatch);
router.put('/:id/score', auth_1.protect, matchController_1.updateMatchScore);
router.post('/:id/commentary', auth_1.protect, matchController_1.addCommentary);
router.get('/:id/commentary', auth_1.protect, matchController_1.getCommentary);
router.delete('/:id', auth_1.protect, matchController_1.deleteMatch);
exports.default = router;
//# sourceMappingURL=matches.js.map