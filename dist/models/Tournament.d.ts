import mongoose, { Document } from 'mongoose';
export interface ITournament extends Document {
    name: string;
    description?: string;
    format: string;
    startDate: Date;
    numberOfTeams: number;
    status: 'upcoming' | 'active' | 'completed';
    isLive: boolean;
    liveScores?: {
        team1: {
            name: string;
            score: number;
            wickets: number;
            overs: number;
        };
        team2: {
            name: string;
            score: number;
            wickets: number;
            overs: number;
        };
        currentRunRate: number;
        requiredRunRate: number;
        target: number;
        lastFiveOvers: string;
    };
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<ITournament, {}, {}, {}, mongoose.Document<unknown, {}, ITournament> & ITournament & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map