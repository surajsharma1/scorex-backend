import mongoose, { Document } from 'mongoose';
export interface IPlayer extends Document {
    name: string;
    role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket Keeper';
    jerseyNumber: string;
    image?: string;
    team: mongoose.Types.ObjectId;
    stats: {
        matches: number;
        runs: number;
        wickets: number;
        average: number;
    };
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPlayer, {}, {}, {}, mongoose.Document<unknown, {}, IPlayer, {}, {}> & IPlayer & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Player.d.ts.map