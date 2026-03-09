/**
 * Friend Model
 * Friends system
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface IFriend extends Document {
    user: mongoose.Types.ObjectId;
    friend: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFriend, {}, {}, {}, mongoose.Document<unknown, {}, IFriend> & IFriend & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Friend.d.ts.map