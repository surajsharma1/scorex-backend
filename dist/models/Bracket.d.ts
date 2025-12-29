import mongoose, { Document } from 'mongoose';
export interface IBracket extends Document {
    tournament: mongoose.Types.ObjectId;
    type: 'single-elimination' | 'double-elimination' | 'round-robin' | 'group-knockout';
    rounds: {
        roundNumber: number;
        matches: {
            id: string;
            team1?: mongoose.Types.ObjectId;
            team2?: mongoose.Types.ObjectId;
            winner?: mongoose.Types.ObjectId;
            score1?: number;
            score2?: number;
            status: 'pending' | 'in-progress' | 'completed';
        }[];
    }[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IBracket, {}, {}, {}, mongoose.Document<unknown, {}, IBracket> & IBracket & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Bracket.d.ts.map