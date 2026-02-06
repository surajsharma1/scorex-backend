"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const paymentController_1 = require("../controllers/paymentController");
const router = express_1.default.Router();
// Protected routes
router.post('/create-payment-intent', auth_1.protect, paymentController_1.createPaymentIntent);
router.post('/confirm', auth_1.protect, paymentController_1.confirmPayment);
router.get('/history', auth_1.protect, paymentController_1.getPaymentHistory);
exports.default = router;
//# sourceMappingURL=payments.js.map