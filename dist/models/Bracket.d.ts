import mongoose, { Document } from 'mongoose';
export interface IBracket extends Document {
    tournament: mongoose.Types.ObjectId;
    type: string;
    rounds: any[];
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IBracket, {}, {}, {}, mongoose.Document<unknown, {}, IBracket, {}, {}> & IBracket & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Bracket.d.ts.map