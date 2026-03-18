import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

const PRICES_FILE = path.join(process.cwd(), 'public', 'membership-prices.json');

const DEFAULT_MEMBERSHIP_PLANS = {
  1: { '1day': 149, '1week': 499, '1month': 1499 },
  2: { '1day': 249, '1week': 999, '1month': 2499 }
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
    const prices = await loadPrices();
    res.json({ 
      success: true, 
      prices
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
    const { prices } = req.body;
    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid prices data' });
    }
    await savePrices(prices);
    res.json({ success: true, message: 'Membership prices updated' });
  } catch (error) { 
    next(error); 
  }
};

export default { getMembershipPrices, updateMembershipPrices };

