"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes
router.get('/', clubController_1.getClubs);
router.get('/:clubId', clubController_1.getClub);
// Protected routes
router.get('/my', auth_1.protect, clubController_1.getMyClubs);
router.post('/', auth_1.protect, clubController_1.createClub);
router.put('/:clubId', auth_1.protect, clubController_1.updateClub);
router.delete('/:clubId', auth_1.protect, clubController_1.deleteClub);
router.post('/:clubId/join', auth_1.protect, clubController_1.joinClub);
router.post('/:clubId/leave', auth_1.protect, clubController_1.leaveClub);
router.post('/:clubId/approve/:userId', auth_1.protect, clubController_1.approveJoinRequest);
router.post('/:clubId/vice-leader/:userId', auth_1.protect, clubController_1.addViceLeader);
router.delete('/:clubId/members/:userId', auth_1.protect, clubController_1.removeMember);
exports.default = router;
