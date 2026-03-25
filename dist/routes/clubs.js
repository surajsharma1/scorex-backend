"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// IMPORTANT: /my must come BEFORE /:id so Express doesn't treat "my" as an id
router.get('/my', auth_1.protect, clubController_1.getMyClubs);
// Public routes
router.get('/', clubController_1.getClubs);
router.get('/:id', clubController_1.getClub);
// Protected routes
router.post('/', auth_1.protect, clubController_1.createClub);
router.put('/:id', auth_1.protect, clubController_1.updateClub);
router.delete('/:id', auth_1.protect, clubController_1.deleteClub);
router.post('/:id/join', auth_1.protect, clubController_1.joinClub);
router.post('/:id/leave', auth_1.protect, clubController_1.leaveClub);
router.post('/:id/approve/:userId', auth_1.protect, clubController_1.approveJoinRequest);
router.post('/:id/vice-leader/:userId', auth_1.protect, clubController_1.addViceLeader);
router.delete('/:id/members/:userId', auth_1.protect, clubController_1.removeMember);
// Image upload routes
const clubImageController_1 = require("../controllers/clubImageController");
router.post('/:id/upload-logo', auth_1.protect, clubImageController_1.uploadLogo);
router.post('/:id/upload-banner', auth_1.protect, clubImageController_1.uploadBanner);
exports.default = router;
