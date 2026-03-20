"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const mc = __importStar(require("../controllers/matchController"));
const router = express_1.default.Router();
router.get('/', mc.getMatches);
router.get('/live', mc.getLiveMatches);
router.get('/:id', mc.getMatch);
router.post('/', auth_1.protect, mc.createMatch);
router.put('/:id', auth_1.protect, mc.updateMatch);
router.delete('/:id', auth_1.protect, mc.deleteMatch);
const scorerAuth_1 = require("../middleware/scorerAuth");
router.post('/:id/start', auth_1.protect, scorerAuth_1.protectScorer, mc.startMatch);
router.post('/:id/select-players', auth_1.protect, scorerAuth_1.protectScorer, mc.selectPlayers);
router.post('/:id/score', auth_1.protect, scorerAuth_1.protectScorer, mc.addBall);
router.post('/:id/undo', auth_1.protect, scorerAuth_1.protectScorer, mc.undoLastBall);
router.post('/:id/end-innings', auth_1.protect, scorerAuth_1.protectScorer, mc.endInnings);
router.post('/:id/end', auth_1.protect, scorerAuth_1.protectScorer, mc.endMatch);
router.put('/:id/status', auth_1.protect, scorerAuth_1.protectScorer, mc.updateMatchStatus);
exports.default = router;
