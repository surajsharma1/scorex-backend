import mongoose, { Document } from 'mongoose';
export interface IMatch extends Document {
    tournament: mongoose.Types.ObjectId;
    team1: mongoose.Types.ObjectId;
    team2: mongoose.Types.ObjectId;
    date: Date;
    venue?: string;
    status: 'scheduled' | 'ongoing' | 'completed';
    score1?: number;
    score2?: number;
    wickets1?: number;
    wickets2?: number;
    overs1?: number;
    overs2?: number;
    winner?: mongoose.Types.ObjectId;
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<IMatch, {}, {}, {}, mongoose.Document<unknown, {}, IMatch> & IMatch & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Match.d.ts.map