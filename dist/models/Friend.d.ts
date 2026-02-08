import mongoose, { Document } from 'mongoose';
export interface IFriend extends Document {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'blocked';
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFriend, {}, {}, {}, mongoose.Document<unknown, {}, IFriend> & IFriend & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Friend.d.ts.map