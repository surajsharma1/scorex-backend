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
    tossWinner?: mongoose.Types.ObjectId;
    tossChoice?: 'bat' | 'bowl';
    matchType?: 'League' | 'Quarter-Final' | 'Semi-Final' | 'Final' | 'Playoff';
    videoLink?: string;
    videoLinks?: string[];
    liveStreamUrl?: string;
    commentary: string[];
    createdBy: mongoose.Types.ObjectId;
    strikerName?: string;
    strikerRuns?: number;
    strikerBalls?: number;
    nonStrikerName?: string;
    nonStrikerRuns?: number;
    nonStrikerBalls?: number;
    bowlerName?: string;
    bowlerOvers?: number;
    bowlerMaidens?: number;
    bowlerRuns?: number;
    bowlerWickets?: number;
    currentRunRate?: number;
    requiredRunRate?: number;
    target?: number;
    lastFiveOvers?: string;
    team1Points?: number;
    team2Points?: number;
    thisOver?: string[];
    lastEvent?: string;
}
declare const _default: mongoose.Model<IMatch, {}, {}, {}, mongoose.Document<unknown, {}, IMatch> & IMatch & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Match.d.ts.map