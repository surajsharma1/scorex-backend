import mongoose from 'mongoose';
import { IUser } from '../models/User';
/**
 * Updates user membership with timeline tracking
 * Call this function whenever membership is purchased, upgraded, downgraded, or expires
 */
export declare const updateUserMembership: (userId: string | mongoose.Types.ObjectId, newLevel: number, options?: {
    expiresAt?: Date;
    paymentId?: string;
    notes?: string;
}) => Promise<IUser | null>;
/**
 * Checks if membership is still valid and updates status if expired
 * Should be called periodically or on login
 */
export declare const checkAndUpdateExpiredMembership: (userId: string | mongoose.Types.ObjectId) => Promise<boolean>;
/**
 * Get membership history for display
 */
export declare const getMembershipHistory: (userId: string | mongoose.Types.ObjectId) => Promise<any[]>;
//# sourceMappingURL=membershipUtils.d.ts.map