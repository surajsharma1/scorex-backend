import { Request, Response } from 'express';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

try {
  if (stripeSecretKey) {
    stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
    });
  }
} catch (error) {
  console.warn('Stripe not configured:', error);
}

// Helper to convert membershipLevel to string
const getMembershipString = (level: number): string => {
  switch (level) {
    case 1: return 'basic';
    case 2: return 'premium';
    default: return 'free';
  }
};

export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    const { amount, level, duration } = req.body;

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      payment_method_types: ['card', 'upi'],
      metadata: {
        level,
        duration,
        userId: (req.user as any)?._id || 'unknown'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  const { planId, cardNumber } = req.body;
  const user = (req as any).user;

  try {
    // 1. Process ADMIN FREE PASS
    if (cardNumber === 'ADMINFREEPASS') {
      let expiryDays = 0;
      
      // Calculate how long to give them based on the planId chosen
      if (planId === '1-day') expiryDays = 1;
      else if (planId === '1-week') expiryDays = 7;
      else if (planId === 'premium-level1') expiryDays = 30; // 1 month
      else if (planId === 'premium-level2') expiryDays = 365; // 1 year

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Save to database
      user.membership = planId;
      user.membershipExpiresAt = expiryDate;
      await user.save();

      return res.status(200).json({ 
        success: true, 
        message: 'Admin pass successfully applied!',
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt 
      });
    }

    // ... 2. Run Standard Stripe / Payment Gateway Logic Here ...

  } catch (error) {
    res.status(500).json({ message: 'Payment initiation failed', error });
  }
};

// scorex-backend/src/controllers/paymentController.ts

export const processPayment = async (req: Request, res: Response) => {
  const { planId, cardNumber, duration } = req.body;
  const user = (req as any).user;

  try {
    // Admin Override Card
    if (cardNumber === 'ADMIN-FREE-PASS-2026') {
      let expiryDays = 0;
      if (duration === '1_day') expiryDays = 1;
      else if (duration === '1_week') expiryDays = 7;
      else if (duration === '1_month') expiryDays = 30;
      else if (duration === '1_year') expiryDays = 365;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      // Grant premium automatically
      user.isPremium = true;
      user.premiumExpiry = expiryDate;
      await user.save();

      return res.status(200).json({ message: 'Admin pass accepted. Premium granted!', success: true });
    }

    // ... Handle your normal Stripe / Payment gateway logic here ...
    
  } catch (error) {
    res.status(500).json({ message: 'Payment failed', error });
  }
};

export const confirmPayment = async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ error: 'Payment service not configured' });
    }

    const { paymentIntentId, level, duration } = req.body;
    const userId = (req.user as any)?._id;

    // Retrieve the payment intent to confirm it's succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Calculate membership expiry date based on duration
      const now = new Date();
      let expiryDate = new Date();
      
      switch (duration) {
        case '1day':
          expiryDate.setDate(now.getDate() + 1);
          break;
        case '1week':
          expiryDate.setDate(now.getDate() + 7);
          break;
        case '1month':
          expiryDate.setMonth(now.getMonth() + 1);
          break;
        default:
          expiryDate.setDate(now.getDate() + 7); // Default to 1 week
      }

      // Convert level string to number
      const membershipLevelNum = level === 'premium' ? 2 : level === 'basic' ? 1 : 0;

      // Update user membership in database
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          membershipLevel: membershipLevelNum,
          membershipExpiresAt: expiryDate,
          $push: {
            paymentHistory: {
              amount: paymentIntent.amount / 100, // Convert from cents
              currency: paymentIntent.currency,
              level: level,
              duration: duration,
              paymentIntentId: paymentIntentId,
              status: 'completed',
              date: new Date()
            }
          }
        },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Generate new JWT token with updated membership and expiry
      const newToken = jwt.sign(
        { 
          id: updatedUser._id, 
          role: updatedUser.role, 
          membership: getMembershipString(updatedUser.membershipLevel || 0),
          membershipExpiresAt: updatedUser.membershipExpiresAt ? updatedUser.membershipExpiresAt.toISOString() : null
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        membership: getMembershipString(membershipLevelNum),
        membershipExpiry: expiryDate,
        duration,
        token: newToken // Return new token with updated membership
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};


export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    // This would typically fetch payment history from database
    // For now, return empty array
    res.json({
      payments: []
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};
