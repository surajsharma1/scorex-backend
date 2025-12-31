"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const bracketController_1 = require("../controllers/bracketController");
const router = express_1.default.Router();
router.route('/')
    .get(auth_1.protect, bracketController_1.getBrackets)
    .post(auth_1.protect, bracketController_1.createBracket);
router.route('/:id')
    .put(auth_1.protect, bracketController_1.updateBracket)
    .delete(auth_1.protect, bracketController_1.deleteBracket);
router.post('/:id/generate', auth_1.protect, bracketController_1.generateBracket);
exports.default = router;
//# sourceMappingURL=brackets.js.map