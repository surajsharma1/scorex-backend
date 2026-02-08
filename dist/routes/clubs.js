"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All club routes require authentication
router.use(auth_1.protect);
// Get all clubs
router.get('/', clubController_1.getClubs);
// Get specific club
router.get('/:clubId', clubController_1.getClub);
// Create club
router.post('/', clubController_1.createClub);
// Join club
router.post('/:clubId/join', clubController_1.joinClub);
// Leave club
router.post('/:clubId/leave', clubController_1.leaveClub);
// Update club (creator only)
router.put('/:clubId', clubController_1.updateClub);
// Delete club (creator only)
router.delete('/:clubId', clubController_1.deleteClub);
exports.default = router;
//# sourceMappingURL=clubs.js.map