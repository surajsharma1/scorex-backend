/**
 * Team Model
 * Team management with players
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document, Model } from 'mongoose';
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
    getTopTeams(limit?: number): Promise<any[]>;
    getByOwner(ownerId: mongoose.Types.ObjectId): Promise<any[]>;
    getByTournament(tournamentId: mongoose.Types.ObjectId): Promise<any[]>;
    search(query: string): Promise<any[]>;
}
interface ITeamModel extends Model<ITeam> {
    getTopTeams(limit?: number): Promise<ITeam[]>;
    getByOwner(ownerId: mongoose.Types.ObjectId): Promise<ITeam[]>;
    getByTournament(tournamentId: mongoose.Types.ObjectId): Promise<ITeam[]>;
    search(query: string): Promise<ITeam[]>;
}
declare const Team: ITeamModel;
export default Team;
//# sourceMappingURL=Team.d.ts.map