import Notification from '../models/Notification';
import User from '../models/User';

export interface CreateNotificationOptions {
  userId: string;
  type: 'tournament' | 'match' | 'system' | 'membership';
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

