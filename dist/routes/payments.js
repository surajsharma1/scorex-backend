"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
// Public routes
router.get('/plans', paymentController_1.getPlans);
// Protected routes
router.get('/membership', auth_1.protect, paymentController_1.getMembership);
router.post('/subscribe', auth_1.protect, paymentController_1.purchaseMembership);
router.post('/extend', auth_1.protect, paymentController_1.extendMembership);
router.post('/cancel', auth_1.protect, paymentController_1.cancelMembership);
router.get('/history', auth_1.protect, paymentController_1.getPaymentHistory);
exports.default = router;
//# sourceMappingURL=payments.js.map