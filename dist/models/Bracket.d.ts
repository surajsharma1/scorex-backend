/**
 * Bracket Model
 * Tournament bracket system
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface IBracket extends Document {
    tournament: mongoose.Types.ObjectId;
    type: 'knockout' | 'double_elimination' | 'round_robin';
    rounds: {
        name: string;
        matches: {
            matchId: mongoose.Types.ObjectId;
            team1?: mongoose.Types.ObjectId;
            team2?: mongoose.Types.ObjectId;
            winner?: mongoose.Types.ObjectId;
            nextMatchId?: mongoose.Types.ObjectId;
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