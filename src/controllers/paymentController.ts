/**
 * Payment Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. extendMembership: `membershipLevel === 1 ? 'basic' : 'premium'` returns 'premium'
 *    when level is 0 (free tier) — user with no membership gets premium plan price instead
 *    of a proper "no active membership" error.
 *    FIX: check for level === 0 explicitly before the ternary lookup.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import User from '../models/User';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';


const MEMBERSHIP_PLANS = {
  basic:   { name: 'Basic',   price: 9,  duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
  premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
};

const LEVEL_TO_PLAN: Record<number, keyof typeof MEMBERSHIP_PLANS> = { 1: 'basic', 2: 'premium' };

const DEV_CARD = { number: '88714741390926000', expiry: '0926', cvv: '000' };

async function processPayment(cardNumber: string, expiry: string, cvv: string, amount: number): Promise<boolean> {
  if (cardNumber && cardNumber.length >= 13 && expiry && cvv) {
    console.log(`[Payment] Processing ₹${amount}`);
    return true;
  }
  return false;
}

export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => ({ id: key, ...plan })) });
  } catch (error) { next(error); }
};

export const getMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('membershipLevel membershipExpiresAt membershipStartedAt membershipTimeline');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const isActive = user.membershipExpiresAt ? new Date(user.membershipExpiresAt) > new Date() : false;
    res.json({ success: true, data: { level: user.membershipLevel, status: isActive ? 'active' : 'expired', startedAt: user.membershipStartedAt, expiresAt: user.membershipExpiresAt, timeline: user.membershipTimeline } });
  } catch (error) { next(error); }
};

export const purchaseMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId, cardNumber, expiry, cvv } = req.body;
    const plan = MEMBERSHIP_PLANS[planId as keyof typeof MEMBERSHIP_PLANS];
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan selected' });

    const isDevCard = cardNumber === DEV_CARD.number && expiry === DEV_CARD.expiry && cvv === DEV_CARD.cvv;
    const paymentSuccess = isDevCard || await processPayment(cardNumber, expiry, cvv, plan.price);
    if (!paymentSuccess) return res.status(400).json({ success: false, message: 'Payment failed' });

    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    let newExpiry = new Date(now);
    if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
      newExpiry = new Date(user.membershipExpiresAt);
    }
    newExpiry.setDate(newExpiry.getDate() + plan.duration);

    const statusChange = plan.level > user.membershipLevel ? 'upgraded' : plan.level < user.membershipLevel ? 'downgraded' : 'active';
    user.membershipLevel = plan.level as 0 | 1 | 2;
    user.membershipStartedAt = now;
    user.membershipExpiresAt = newExpiry;
    user.membershipTimeline = user.membershipTimeline || [];
    user.membershipTimeline.push({ level: plan.level, status: statusChange, startedAt: now, endedAt: newExpiry, notes: isDevCard ? 'Dev card used' : `${plan.name} purchased` });
    user.paymentHistory = user.paymentHistory || [];
    user.paymentHistory.push({ amount: plan.price, currency: 'USD', plan: plan.name, duration: `${plan.duration} days`, paymentIntentId: (isDevCard ? 'dev_' : 'pi_') + Date.now(), status: 'completed', date: now });
    await user.save();

    res.json({ success: true, message: 'Membership purchased successfully', data: { level: user.membershipLevel, status: 'active', startedAt: user.membershipStartedAt, expiresAt: user.membershipExpiresAt } });
  } catch (error) { next(error); }
};

export const extendMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { months, cardNumber, expiry, cvv } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.membershipLevel === 0) {
      return res.status(400).json({ success: false, message: 'No active membership to extend. Please purchase a membership first.' });
    }
    const planKey = LEVEL_TO_PLAN[user.membershipLevel];
    const currentPlan = MEMBERSHIP_PLANS[planKey];

    const price = currentPlan.price * months;
    const isDevCard = cardNumber === DEV_CARD.number && expiry === DEV_CARD.expiry && cvv === DEV_CARD.cvv;
    const paymentSuccess = isDevCard || await processPayment(cardNumber, expiry, cvv, price);
    if (!paymentSuccess) return res.status(400).json({ success: false, message: 'Payment failed' });

    const now = new Date();
    let currentExpiry = user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now
      ? new Date(user.membershipExpiresAt) : now;
    currentExpiry.setMonth(currentExpiry.getMonth() + months);
    user.membershipExpiresAt = currentExpiry;
    user.membershipTimeline = user.membershipTimeline || [];
    user.membershipTimeline.push({ level: user.membershipLevel, status: 'active', startedAt: now, endedAt: currentExpiry, notes: `Extended by ${months} month(s)` });
    await user.save();

    res.json({ success: true, message: `Membership extended by ${months} month(s)`, data: { expiresAt: user.membershipExpiresAt } });
  } catch (error) { next(error); }
};

export const cancelMembership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.membershipLevel === 0) return res.status(400).json({ success: false, message: 'No active membership to cancel' });
    user.membershipTimeline = user.membershipTimeline || [];
    user.membershipTimeline.push({ level: user.membershipLevel, status: 'cancelled', startedAt: user.membershipStartedAt || new Date(), endedAt: new Date(), notes: 'Cancelled by user' });
    user.membershipLevel = 0;
    await user.save();
    res.json({ success: true, message: 'Membership cancelled' });
  } catch (error) { next(error); }
};

export const getPaymentHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?.id).select('paymentHistory');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user.paymentHistory || [] });
  } catch (error) { next(error); }
};

// Razorpay Integration
// Razorpay instance moved inside functions for lazy loading and env validation


export const createRazorpayOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { amount, plan } = req.body;

    console.log('[Razorpay Debug] Request:', { userId: req.user?.id, amount, plan });

    // Enhanced validation
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }
    if (typeof plan !== 'string' || !plan.trim()) {
      return res.status(400).json({ success: false, message: 'Plan must be a non-empty string' });
    }

    // Validate Razorpay env vars
    console.log('[Razorpay Debug] Env vars:', { hasKeyId: !!process.env.RAZORPAY_KEY_ID, hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('[Razorpay] Missing env vars: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
      return res.status(500).json({ success: false, message: 'Payment service not configured. Contact support.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `order_${(req.user?.id || 'anon').slice(-8)}_${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 10000).toString().padStart(4,'0')}`;
    console.log(`[Razorpay] Receipt generated: ${receipt} (length: ${receipt.length})`);

    const orderOptions = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR' as const,
      receipt,
      notes: {
        plan,
        userId: req.user?.id,
      }
    };

    const order = await razorpay.orders.create(orderOptions);

    // Temp store in user
    const user = await User.findById(req.user?.id);
    if (user) {
      user.paymentHistory = user.paymentHistory || [];
      user.paymentHistory.push({
        razorpay_order_id: order.id,
        amount: Number(amount),
        currency: 'INR',
        plan,
        status: 'created',
        date: new Date(),
      });
      await user.save();
    }

    res.json({ success: true, data: order });
  } catch (error: any) {
    const { amount: logAmount, plan: logPlan } = req.body;
    console.error('[Razorpay Order]', error, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      amount: logAmount,
      plan: logPlan
    });
    res.status(500).json({ 
      success: false, 
      message: error.description || error.message || 'Failed to create order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

};

export const verifyRazorpayPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing Razorpay verification data' });
    }

    // Validate Razorpay env vars
    if (!process.env.RAZORPAY_KEY_SECRET) {
      console.error('[Razorpay Verify] Missing RAZORPAY_KEY_SECRET');
      return res.status(500).json({ success: false, message: 'Payment service not configured.' });
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Signature verification
    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const signature = shasum.digest('hex');

    if (signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    // Fetch payment & order
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== 'captured') {
      return res.status(400).json({ success: false, message: 'Payment not captured' });
    }

    const order = await razorpay.orders.fetch(razorpay_order_id);
    const amount = Number(order.amount) / 100;
    const notesPlan = order.notes.plan || plan;

    // Update user
    const user = await User.findById(req.user?.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();

    // ── Determine membership level ─────────────────────────────────────────
    const level = (
      notesPlan.includes('lv2') || notesPlan === 'Enterprise' ||
      notesPlan.toLowerCase() === 'premium'
    ) ? 2 : 1;

    // ── Determine duration in days ─────────────────────────────────────────
    // FIX: Use the explicit 'duration' key from req.body FIRST (sent by frontend as
    //      '1day' | '1week' | '1month'). Fall back to plan-name string matching only
    //      as a last resort. Previously this always fell through to 1 day because
    //      plan.name is 'Premium'/'Enterprise' and never contains 'month'/'week'.
    const durationKey: string = req.body.duration || '';
    let durationDays: number;
    if (durationKey === '1month' || notesPlan.includes('1-month') || notesPlan.includes('month')) {
      durationDays = 30;
    } else if (durationKey === '1week' || notesPlan.includes('1-week') || notesPlan.includes('week')) {
      durationDays = 7;
    } else if (durationKey === '1day') {
      durationDays = 1;
    } else {
      durationDays = 30; // Safe default: assume monthly if ambiguous
    }

    let expiry = new Date(now);
    if (user.membershipExpiresAt && new Date(user.membershipExpiresAt) > now) {
      expiry = new Date(user.membershipExpiresAt);
    }
    expiry.setDate(expiry.getDate() + durationDays);

    user.membershipLevel = level;
    user.membershipExpiresAt = expiry;
    user.membershipStartedAt = now;

    // ── Update payment history ─────────────────────────────────────────────
    // FIX: Remove ALL stale 'created'/'pending' records for this order_id first,
    //      then push a single clean 'completed' record. Previously, findIndex only
    //      updated an existing record but a second push still left the old one.
    user.paymentHistory = (user.paymentHistory || []).filter(
      (h: any) => h.razorpay_order_id !== razorpay_order_id
    );
    user.paymentHistory.push({
      amount,
      currency: 'INR',
      razorpay_order_id,
      razorpay_payment_id,
      status: 'completed',
      plan: notesPlan,
      duration: `${durationDays} day${durationDays !== 1 ? 's' : ''}`,
      date: now,
    });

    user.membershipTimeline = user.membershipTimeline || [];
    user.membershipTimeline.push({
      level,
      status: 'upgraded',
      startedAt: now,
      endedAt: expiry,
      notes: `${notesPlan} via Razorpay`,
    });

    await user.save();

    // Refresh token if needed
    const token = req.headers.authorization?.split(' ')[1];

    res.json({ success: true, message: 'Payment verified and membership updated!', data: { level, expiresAt: expiry }, token });
  } catch (error: any) {
    const { razorpay_payment_id: logPaymentId } = req.body;
    console.error('[Razorpay Verify]', error, { razorpay_payment_id: logPaymentId });
    res.status(500).json({ 
      success: false, 
      message: error.description || error.message || 'Verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
};


export default { 
  getPlans, getMembership, purchaseMembership, extendMembership, cancelMembership, getPaymentHistory, 
  createRazorpayOrder, verifyRazorpayPayment 
};
