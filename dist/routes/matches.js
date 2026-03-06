"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const auth_1 = require("../middleware/auth");
const mongoose_1 = __importDefault(require("mongoose"));
const router = (0, express_1.Router)();
// Middleware to validate MongoDB ObjectId
const validateMatchId = (req, res, next) => {
    const { id } = req.params;
    // Check if ID is undefined, null, or the string "undefined"
    if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({
            success: false,
            message: 'Match ID is required and cannot be undefined'
        });
    }
    // Check if ID is a valid MongoDB ObjectId format
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid Match ID format'
        });
    }
    next();
};
// Public route to view all matches (supports filtering via query params)
router.get('/', matchController_1.getAllMatches);
// Public route to view live scores - with ID validation
router.get('/:id', validateMatchId, matchController_1.getMatchById);
// Protected Routes
router.use(auth_1.protect);
// Match management
router.post('/', matchController_1.createMatch);
router.put('/:id/start', validateMatchId, matchController_1.startMatch);
// Live Scoring Engine - ball-by-ball scoring
router.post('/:id/score', validateMatchId, matchController_1.scoreBall);
router.post('/:id/undo', validateMatchId, matchController_1.undoLastBall);
exports.default = router;
//# sourceMappingURL=matches.js.map