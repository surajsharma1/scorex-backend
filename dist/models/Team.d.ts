/**
 * Team Model
 * Team management with players
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface ITeam extends Document {
    name: string;
    shortName?: string;
    logo?: string;
    description?: string;
    owner: mongoose.Types.ObjectId;
    captain?: mongoose.Types.ObjectId;
    viceCaptain?: mongoose.Types.ObjectId;
    players: mongoose.Types.ObjectId[];
    tournamentStats?: {
        tournamentsPlayed: number;
        tournamentsWon: number;
        tournamentsLost: number;
        matchesPlayed: number;
        matchesWon: number;
        matchesLost: number;
        matchesTied: number;
        matchesNoResult: number;
    };
    points?: number;
    netRunRate?: number;
    isActive: boolean;
    isVerified: boolean;
    tournaments: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
    addPlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
    removePlayer(playerId: mongoose.Types.ObjectId): Promise<void>;
    calculateStats(): Promise<void>;
}
declare const _default: mongoose.Model<ITeam, {}, {}, {}, mongoose.Document<unknown, {}, ITeam> & ITeam & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Team.d.ts.map