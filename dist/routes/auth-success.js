"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
router.get('/google/success', async (req, res) => {
    // Use session user from passport - populate full user
    if (!req.user || !req.user._id) {
        console.error('[OAuth Success] No user:', req.user);
        return res.redirect('/login?error=no-user');
    }
    const userId = req.user._id;
    const user = await User_1.default.findById(userId).populate('membership');
    if (!user) {
        console.error('[OAuth Success] User not found:', userId);
        return res.redirect('/login?error=user-missing');
    }
    const token = jsonwebtoken_1.default.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    // Frontend redirect with token hash
    const frontendUrl = process.env.FRONTEND_URL || req.query.state || 'https://scorex-live.vercel.app';
    const fragment = `token=${token}&user=${encodeURIComponent(JSON.stringify(user.toObject()))}`;
    const redirectUrl = `${frontendUrl}/oauth/callback#${fragment}`;
    console.log('[OAuth Success] Redirect:', redirectUrl);
    res.redirect(redirectUrl);
});
exports.default = router;
