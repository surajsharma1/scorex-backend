/**
 * Message Model
 * Chat messages
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface IMessage extends Document {
    sender: mongoose.Types.ObjectId;
    recipient?: mongoose.Types.ObjectId;
    roomId?: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
}
declare const _default: mongoose.Model<IMessage, {}, {}, {}, mongoose.Document<unknown, {}, IMessage> & IMessage & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Message.d.ts.map