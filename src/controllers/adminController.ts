import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

const PRICES_FILE = path.join(process.cwd(), 'public', 'membership-prices.json');

const DEFAULT_MEMBERSHIP_PLANS = {
  basic:   { name: 'Basic',   price: 9,  duration: 30, level: 1, features: ['Basic overlays', 'Standard support'] },
  premium: { name: 'Premium', price: 19, duration: 30, level: 2, features: ['All overlays', 'Priority support', 'Advanced analytics'] }
};

async function loadPrices() {
  try {
    const data = await fs.readFile(PRICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    await fs.writeFile(PRICES_FILE, JSON.stringify(DEFAULT_MEMBERSHIP_PLANS, null, 2));
    return DEFAULT_MEMBERSHIP_PLANS;
  }
}

async function savePrices(plans: any) {
  await fs.writeFile(PRICES_FILE, JSON.stringify(plans, null, 2));
}

/**
 * GET /api/v1/admin/membership-prices
 */
export const getMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await loadPrices();
    res.json({ 
      success: true, 
      data: Object.entries(plans).map(([key, plan]: [string, any]) => ({ 
        id: key, 
        ...plan 
      })) 
    });
  } catch (error) { 
    next(error); 
  }
};

/**
 * POST /api/v1/admin/membership-prices
 */
export const updateMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { plans } = req.body;
    if (!plans || typeof plans !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid plans data' });
    }
    await savePrices(plans);
    res.json({ success: true, message: 'Membership prices updated' });
  } catch (error) { 
    next(error); 
  }
};

export default { getMembershipPrices, updateMembershipPrices };

