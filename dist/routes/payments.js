"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promoController_1 = require("../controllers/promoController");
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = __importDefault(require("../controllers/paymentController"));
const router = express_1.default.Router();
// Public routes
router.get('/plans', paymentController_1.default.getPlans);
// Protected routes
router.get('/membership', auth_1.protect, paymentController_1.default.getMembership);
router.post('/subscribe', auth_1.protect, paymentController_1.default.purchaseMembership);
router.post('/extend', auth_1.protect, paymentController_1.default.extendMembership);
router.post('/cancel', auth_1.protect, paymentController_1.default.cancelMembership);
router.post('/razorpay-order', auth_1.protect, paymentController_1.default.createRazorpayOrder);
router.post('/verify-razorpay-payment', auth_1.protect, paymentController_1.default.verifyRazorpayPayment);
router.get('/history', auth_1.protect, paymentController_1.default.getPaymentHistory);
// ── Promo code validation ─────────────────────────────────────────────────────
router.post('/validate-promo', auth_1.protect, promoController_1.validatePromoCode);
exports.default = router;
