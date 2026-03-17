"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const clubController_1 = require("../controllers/clubController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public routes - anyone can view clubs
router.get('/', clubController_1.getClubs);
router.get('/:clubId', clubController_1.getClub);
router.get('/my', auth_1.protect, clubController_1.getMyClubs);
// Protected routes - require authentication
router.post('/', auth_1.protect, clubController_1.createClub);
router.post('/:clubId/join', auth_1.protect, clubController_1.joinClub);
router.post('/:clubId/leave', auth_1.protect, clubController_1.leaveClub);
router.put('/:clubId', auth_1.protect, clubController_1.updateClub);
router.delete('/:clubId', auth_1.protect, clubController_1.deleteClub);
exports.default = router;
