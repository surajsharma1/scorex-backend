"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bracketController_1 = require("../controllers/bracketController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Public route - anyone can view brackets
router.get('/', bracketController_1.getBrackets);
// Protected routes - require authentication
router.post('/', auth_1.protect, bracketController_1.createBracket);
router.post('/:id/generate', auth_1.protect, bracketController_1.generateBracket);
router.put('/:id', auth_1.protect, bracketController_1.updateBracket);
router.delete('/:id', auth_1.protect, bracketController_1.deleteBracket);
exports.default = router;
