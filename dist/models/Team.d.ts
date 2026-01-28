import mongoose, { Document } from 'mongoose';
export interface IPlayer {
    name: string;
    role: string;
    jerseyNumber: string;
    image?: string;
}
export interface ITeam extends Document {
    name: string;
    color: string;
    logo?: string;
    tournament: mongoose.Types.ObjectId;
    players: IPlayer[];
    createdBy: mongoose.Types.ObjectId;
}
declare const _default: mongoose.Model<ITeam, {}, {}, {}, mongoose.Document<unknown, {}, ITeam, {}, {}> & ITeam & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Team.d.ts.map