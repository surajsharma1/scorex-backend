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
const validation_1 = require("../utils/validation");
const tournamentController = __importStar(require("../controllers/tournamentController"));
const validation_2 = require("../utils/validation");
const router = express_1.default.Router();
router.get('/', tournamentController.getTournaments);
router.get('/:id', tournamentController.getTournamentById || ((req, res) => res.status(501).json({ success: false, message: 'TODO' })));
router.post('/', auth_1.protect, (0, validation_1.validateRequest)(validation_2.createTournamentSchema), tournamentController.createTournament);
router.put('/:id', auth_1.protect, tournamentController.updateTournament || ((req, res) => res.status(501).json({ success: false, message: 'TODO' })));
router.delete('/:id', auth_1.protect, tournamentController.deleteTournament || ((req, res) => res.status(501).json({ success: false, message: 'TODO' })));
router.post('/:id/bracket', auth_1.protect, tournamentController.generateBracket);
router.post('/:id/start', auth_1.protect, tournamentController.startTournament);
exports.default = router;
//# sourceMappingURL=tournaments.js.map