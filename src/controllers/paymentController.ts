import { Request, Response } from 'express';
import Stripe from 'stripe';
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

      // Update user membership in database
      const membership = `premium-${level}`;
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        {
          membership: membership,
          membershipExpiry: expiryDate,
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

      res.json({
        success: true,
        message: 'Payment confirmed successfully',
        membership: membership,
        membershipExpiry: expiryDate,
        duration
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
