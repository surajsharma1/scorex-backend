import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    user: mongoose.Types.ObjectId;
    message: string;
    type: 'info' | 'warning' | 'success';
    read: boolean;
}
declare const _default: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification> & INotification & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Notification.d.ts.map