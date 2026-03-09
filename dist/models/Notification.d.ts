/**
 * Notification Model
 * User notifications
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    type: 'tournament' | 'match' | 'friend' | 'club' | 'system' | 'membership';
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification> & INotification & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Notification.d.ts.map