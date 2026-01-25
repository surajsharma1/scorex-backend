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
declare const _default: mongoose.Model<ITeam, {}, {}, {}, mongoose.Document<unknown, {}, ITeam> & ITeam & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Team.d.ts.map