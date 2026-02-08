import mongoose, { Document } from 'mongoose';
export interface IBracket extends Document {
    tournament: mongoose.Types.ObjectId;
    type: string;
    numberOfTeams: number;
    rounds: any[];
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IBracket, {}, {}, {}, mongoose.Document<unknown, {}, IBracket> & IBracket & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Bracket.d.ts.map