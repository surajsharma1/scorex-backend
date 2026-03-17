import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Tournament from '../models/Tournament';

/**
 * Admin Controller for ScoreX backend
 * Handles admin-specific endpoints for membership prices and stats
 */

const MEMBERSHIP_PLANS = {
  basic:   { name: 'Basic',   price: 9,  duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
  premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
};

/**
 * GET /api/v1/admin/membership-prices
 * Returns membership pricing plans for admin interface
 */
export const getMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ 
      success: true, 
      data: Object.entries(MEMBERSHIP_PLANS).map(([key, plan]) => ({ 
        id: key as keyof typeof MEMBERSHIP_PLANS, 
        ...plan 
      })) 
    });
  } catch (error) { 
    next(error); 
  }
};

export default { getMembershipPrices };

