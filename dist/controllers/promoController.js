"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markPromoUsed = exports.validatePromoCode = exports.deletePromoCode = exports.listPromoCodes = exports.createPromoCode = void 0;
const PromoCode_1 = __importDefault(require("../models/PromoCode"));
// ── Admin: create promo code ──────────────────────────────────────────────────
const createPromoCode = async (req, res) => {
    try {
        const { code, discount, expiresAt, usageLimit } = req.body;
        if (!code || !discount || !expiresAt)
            return res.status(400).json({ success: false, message: 'code, discount, expiresAt required' });
        const promo = await PromoCode_1.default.create({
            code: code.trim().toUpperCase(),
            discount: Number(discount),
            expiresAt: new Date(expiresAt),
            usageLimit: usageLimit ? Number(usageLimit) : null,
        });
        res.status(201).json({ success: true, data: promo });
    }
    catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ success: false, message: 'Promo code already exists' });
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.createPromoCode = createPromoCode;
// ── Admin: list all promo codes ───────────────────────────────────────────────
const listPromoCodes = async (_req, res) => {
    try {
        const promos = await PromoCode_1.default.find().sort({ createdAt: -1 });
        res.json({ success: true, data: promos });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.listPromoCodes = listPromoCodes;
// ── Admin: delete promo code ──────────────────────────────────────────────────
const deletePromoCode = async (req, res) => {
    try {
        await PromoCode_1.default.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: 'Promo code deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deletePromoCode = deletePromoCode;
// ── Public: validate a promo code (called from Payment page) ─────────────────
const validatePromoCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = String(req.user?._id || '');
        const promo = await PromoCode_1.default.findOne({ code: code.trim().toUpperCase(), isActive: true });
        if (!promo)
            return res.status(404).json({ success: false, message: 'Invalid promo code' });
        if (new Date() > promo.expiresAt)
            return res.status(400).json({ success: false, message: 'Promo code has expired' });
        if (promo.usageLimit !== null && promo.usedBy.length >= promo.usageLimit)
            return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
        if (userId && promo.usedBy.includes(userId))
            return res.status(400).json({ success: false, message: 'You have already used this promo code' });
        res.json({ success: true, discount: promo.discount, promoId: promo._id });
    }
    catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.validatePromoCode = validatePromoCode;
// ── Internal: mark promo as used by user (called after successful payment) ───
const markPromoUsed = async (promoId, userId) => {
    try {
        await PromoCode_1.default.findByIdAndUpdate(promoId, { $addToSet: { usedBy: userId } });
    }
    catch { /* silent */ }
};
exports.markPromoUsed = markPromoUsed;
