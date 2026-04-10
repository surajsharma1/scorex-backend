import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import path from 'path';

const PRICES_FILE = path.join(process.cwd(), 'public', 'membership-prices.json');

const DEFAULT_PRICES = {
  1: { '1day': 149, '1week': 499, '1month': 1499 },
  2: { '1day': 249, '1week': 999, '1month': 2499 },
};

async function loadPrices() {
  try {
    const data = await fs.readFile(PRICES_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    try {
      await fs.mkdir(path.dirname(PRICES_FILE), { recursive: true });
      await fs.writeFile(PRICES_FILE, JSON.stringify(DEFAULT_PRICES, null, 2));
    } catch {}
    return DEFAULT_PRICES;
  }
}

async function savePrices(plans: any) {
  try {
    await fs.mkdir(path.dirname(PRICES_FILE), { recursive: true });
    await fs.writeFile(PRICES_FILE, JSON.stringify(plans, null, 2));
  } catch (err) {
    throw new Error('Failed to write prices file');
  }
}

/**
 * GET /api/v1/admin/membership-prices
 * Public — no auth required (used by Membership page for price display)
 */
export const getMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prices = await loadPrices();
    // Set cache headers BEFORE sending response
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ success: true, prices });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/membership-prices
 * Admin only — updates and persists prices
 */
export const updateMembershipPrices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prices } = req.body;
    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid prices data' });
    }

    // Validate structure: must have keys 1 and 2 with duration sub-keys
    const validLevels = [1, 2];
    const validDurations = ['1day', '1week', '1month'];
    for (const level of validLevels) {
      if (!prices[level]) {
        return res.status(400).json({ success: false, message: `Missing pricing for level ${level}` });
      }
      for (const dur of validDurations) {
        const val = prices[level][dur];
        if (typeof val !== 'number' || val < 0) {
          return res.status(400).json({ success: false, message: `Invalid price for level ${level} / ${dur}` });
        }
      }
    }

    await savePrices(prices);
    res.json({ success: true, message: 'Membership prices updated successfully', prices });
  } catch (error) {
    next(error);
  }
};

export default { getMembershipPrices, updateMembershipPrices };
