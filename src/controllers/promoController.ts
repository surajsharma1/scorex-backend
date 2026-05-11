import { Request, Response } from 'express';
import PromoCode from '../models/PromoCode';
import { AuthRequest } from '../middleware/auth';

// ── Admin: create promo code ──────────────────────────────────────────────────
export const createPromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code, discount, expiresAt, usageLimit } = req.body;
    if (!code || !discount || !expiresAt)
      return res.status(400).json({ success: false, message: 'code, discount, expiresAt required' });

    const promo = await PromoCode.create({
      code: code.trim().toUpperCase(),
      discount: Number(discount),
      expiresAt: new Date(expiresAt),
      usageLimit: usageLimit ? Number(usageLimit) : null,
    });
    res.status(201).json({ success: true, data: promo });
  } catch (err: any) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'Promo code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: list all promo codes ───────────────────────────────────────────────
export const listPromoCodes = async (_req: Request, res: Response) => {
  try {
    const promos = await PromoCode.find().sort({ createdAt: -1 });
    res.json({ success: true, data: promos });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin: delete promo code ──────────────────────────────────────────────────
export const deletePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    await PromoCode.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Promo code deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Public: validate a promo code (called from Payment page) ─────────────────
export const validatePromoCode = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = String((req as any).user?._id || '');

    const promo = await PromoCode.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!promo)
      return res.status(404).json({ success: false, message: 'Invalid promo code' });
    if (new Date() > promo.expiresAt)
      return res.status(400).json({ success: false, message: 'Promo code has expired' });
    if (promo.usageLimit !== null && promo.usedBy.length >= promo.usageLimit)
      return res.status(400).json({ success: false, message: 'Promo code usage limit reached' });
    if (userId && promo.usedBy.includes(userId))
      return res.status(400).json({ success: false, message: 'You have already used this promo code' });

    res.json({ success: true, discount: promo.discount, promoId: promo._id });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Internal: mark promo as used by user (called after successful payment) ───
export const markPromoUsed = async (promoId: string, userId: string) => {
  try {
    await PromoCode.findByIdAndUpdate(promoId, { $addToSet: { usedBy: userId } });
  } catch { /* silent */ }
};
