import Notification from '../models/Notification';
import User from '../models/User';
import Club from '../models/Club';

export interface CreateNotificationOptions {
  userId: string;
  type: 'tournament' | 'match' | 'system' | 'membership' | 'club';
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

export const notifyClubMembers = async (clubId: string, title: string, message: string, excludeUserId?: string): Promise<void> => {
  try {
    const club = await Club.findById(clubId).populate('members', 'id username');
    if (!club || !club.members || club.members.length === 0) return;

    const memberIds = club.members
      .filter((member: any) => member.id.toString() !== excludeUserId)
      .map((member: any) => member.id.toString());

    for (const userId of memberIds) {
      await createNotification({
        userId,
        type: 'club' as const,
        title,
        message,
      });
    }
  } catch (error) {
    console.error('❌ notifyClubMembers failed:', error);
  }
};

export const notifyClubOwnerAndViceLeaders = async (clubId: string, title: string, message: string): Promise<void> => {
  try {
    const club = await Club.findById(clubId)
      .populate('owner', 'id username')
      .populate('viceLeaders', 'id username');
    
    if (!club) return;

    // Notify owner
    if (club.owner) {
      await createNotification({
        userId: club.owner.id.toString(),
        type: 'club' as const,
        title,
        message,
      });
    }

    // Notify vice leaders
    if (club.viceLeaders && club.viceLeaders.length > 0) {
      for (const viceLeader of club.viceLeaders as any[]) {
        await createNotification({
          userId: viceLeader.id.toString(),
          type: 'club' as const,
          title,
          message,
        });
      }
    }
  } catch (error) {
    console.error('❌ notifyClubOwnerAndViceLeaders failed:', error);
  }
};
