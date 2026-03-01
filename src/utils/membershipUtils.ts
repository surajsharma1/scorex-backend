import mongoose from 'mongoose';
import User, { IUser } from '../models/User';

/**
 * Updates user membership with timeline tracking
 * Call this function whenever membership is purchased, upgraded, downgraded, or expires
 */
export const updateUserMembership = async (
  userId: string | mongoose.Types.ObjectId,
  newLevel: number,
  options: {
    expiresAt?: Date;
    paymentId?: string;
    notes?: string;
  } = {}
): Promise<IUser | null> => {
  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const currentLevel = user.membershipLevel || 0;
    const now = new Date();

    // If user had a previous membership, close that timeline entry
    if (user.membershipTimeline && user.membershipTimeline.length > 0) {
      const lastEntry = user.membershipTimeline[user.membershipTimeline.length - 1];
      if (lastEntry && lastEntry.status === 'active') {
        lastEntry.endedAt = now;
        
        // Determine status based on change
        if (newLevel === 0) {
          lastEntry.status = 'expired';
        } else if (newLevel < currentLevel) {
          lastEntry.status = 'downgraded';
        } else if (newLevel > currentLevel) {
          lastEntry.status = 'upgraded';
        } else {
          lastEntry.status = 'active'; // renewed
        }
      }
    }

    // Determine the status of the new entry
    let newStatus: 'active' | 'expired' = 'active';
    if (newLevel === 0) {
      newStatus = 'expired';
    }

    // Add new timeline entry
    const timelineEntry = {
      level: newLevel,
      status: newStatus,
      startedAt: now,
      endedAt: options.expiresAt || undefined,
      paymentId: options.paymentId || undefined,
      notes: options.notes || undefined
    };

    // Update user fields
    user.membershipLevel = newLevel as 0 | 1 | 2;
    user.membershipStartedAt = now;
    user.membershipExpiresAt = options.expiresAt || undefined;
    
    if (!user.membershipTimeline) {
      user.membershipTimeline = [];
    }
    user.membershipTimeline.push(timelineEntry);

    await user.save();
    return user;
  } catch (error) {
    console.error('Error updating user membership:', error);
    return null;
  }
};

/**
 * Checks if membership is still valid and updates status if expired
 * Should be called periodically or on login
 */
export const checkAndUpdateExpiredMembership = async (userId: string | mongoose.Types.ObjectId): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user) return false;

    // If no expiration date, membership doesn't expire
    if (!user.membershipExpiresAt) return true;

    // Check if expired
    if (new Date() > user.membershipExpiresAt && user.membershipLevel > 0) {
      // Update timeline
      await updateUserMembership(userId, 0, { notes: 'Auto-expired due to expiration date' });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking membership expiration:', error);
    return false;
  }
};

/**
 * Get membership history for display
 */
export const getMembershipHistory = async (userId: string | mongoose.Types.ObjectId): Promise<any[]> => {
  try {
    const user = await User.findById(userId).select('membershipTimeline membershipLevel membershipExpiresAt');
    if (!user) return [];

    return user.membershipTimeline || [];
  } catch (error) {
    console.error('Error getting membership history:', error);
    return [];
  }
};
