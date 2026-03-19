import Notification from '../models/Notification';
import Club from '../models/Club';
import User from '../models/User';

export interface CreateNotificationOptions {
  userId: string;
  type: 'tournament' | 'match' | 'friend' | 'club' | 'system' | 'membership';
  title: string;
  message: string;
  link?: string;
}

export const createNotification = async (options: CreateNotificationOptions): Promise<void> => {
  try {
    const notification = await Notification.create({
      user: options.userId,
      type: options.type,
      title: options.title,
      message: options.message,
      link: options.link,
    });
    
    // Populate for completeness
    await notification.populate('user', 'username email');
    console.log('📢 Notification created:', notification);
  } catch (error) {
    console.error('❌ Notification creation failed:', error);
  }
};

export const notifyClubMembers = async (
  clubId: string, 
  title: string, 
  message: string,
  excludeUserId?: string
): Promise<void> => {
  try {
    const club = await Club.findById(clubId).populate('members', '_id');
    if (!club || !club.members) return;
    
    const memberIds = club.members
      .map((m: any) => m._id.toString())
      .filter(id => id !== excludeUserId);
    
    for (const userId of memberIds) {
      await createNotification({
        userId,
        type: 'club',
        title,
        message,
        link: `/clubs/${clubId}`,
      });
    }
  } catch (error) {
    console.error('❌ Bulk club notification failed:', error);
  }
};

export const notifyClubOwnerAndViceLeaders = async (
  clubId: string, 
  title: string, 
  message: string
): Promise<void> => {
  try {
    const club = await Club.findById(clubId)
      .populate('owner', '_id')
      .populate('viceLeaders', '_id');
    
    if (!club) return;
    
    const adminIds = [club.owner._id];
    adminIds.push(...club.viceLeaders.map((vl: any) => vl._id));
    
    for (const userId of adminIds) {
      await createNotification({
        userId: userId.toString(),
        type: 'club',
        title,
        message,
        link: `/clubs/${clubId}/manage`,
      });
    }
  } catch (error) {
    console.error('❌ Club admin notification failed:', error);
  }
};

