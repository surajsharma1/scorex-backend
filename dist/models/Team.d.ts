import mongoose, { Document, Types } from 'mongoose';
export interface ITeam extends Document {
    name: string;
    color?: string;
    tournament?: Types.ObjectId;
    logo?: string;
    captain?: Types.ObjectId;
    players: Types.ObjectId[];
    statistics: {
        matchesPlayed: number;
        won: number;
        lost: number;
        tied: number;
        points: number;
        netRunRate: number;
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITeam, {}, {}, {}, mongoose.Document<unknown, {}, ITeam> & ITeam & {
    _id: Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Team.d.ts.map