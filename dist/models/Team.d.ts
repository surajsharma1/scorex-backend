import mongoose, { Document } from 'mongoose';
interface ITeamStats {
    matchesPlayed: number;
    matchesWon: number;
    tournamentWins: number;
    totalRuns: number;
    totalWickets: number;
}
interface ITeam extends Document {
    name: string;
    shortName: string;
    logo?: string;
    tournamentId?: mongoose.Types.ObjectId;
    players: mongoose.Types.ObjectId[];
    captain?: mongoose.Types.ObjectId;
    stats: ITeamStats;
    tournamentStats?: ITeamStats;
    addPlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
    removePlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
    updateStats(): Promise<void>;
}
declare const _default: mongoose.Model<ITeam, {}, {}, {}, mongoose.Document<unknown, {}, ITeam> & ITeam & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Team.d.ts.map