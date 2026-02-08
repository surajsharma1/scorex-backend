import mongoose, { Document } from 'mongoose';
export interface IClub extends Document {
    name: string;
    description?: string;
    members: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IClub, {}, {}, {}, mongoose.Document<unknown, {}, IClub> & IClub & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Club.d.ts.map