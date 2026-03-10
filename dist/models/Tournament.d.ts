/**
 * Tournament Model
 * Complete tournament management system
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export type TournamentType = 'round_robin' | 'knockout' | 'double_elimination' | 'league' | 'group_stage';
export type TournamentStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'T10' | 'T20' | 'ODI' | 'Test' | 'Custom';
export type LocationType = 'indoor' | 'outdoor' | 'both';
export interface ITournament extends Document {
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    organizer: mongoose.Types.ObjectId;
    contactEmail?: string;
    contactPhone?: string;
    startDate: Date;
    endDate: Date;
    registrationDeadline?: Date;
    location: string;
    locationType: LocationType;
    address?: string;
    type: TournamentType;
    format: TournamentFormat;
    maxTeams: number;
    minTeams: number;
    overs?: number;
    rules?: string;
    prize?: string;
    entryFee?: number;
    status: TournamentStatus;
    teams: mongoose.Types.ObjectId[];
    waitingList: mongoose.Types.ObjectId[];
    matches: mongoose.Types.ObjectId[];
    bracketGenerated: boolean;
    bracketData?: any;
    pointsTable?: {
        teamId: mongoose.Types.ObjectId;
        matchesPlayed: number;
        matchesWon: number;
        matchesLost: number;
        matchesTied: number;
        points: number;
        netRunRate: number;
        forRuns: number;
        againstRuns: number;
        oversFaced: number;
        oversBowled: number;
    }[];
    winner?: mongoose.Types.ObjectId;
    runnerUp?: mongoose.Types.ObjectId;
    secondRunnerUp?: mongoose.Types.ObjectId;
    mvp?: mongoose.Types.ObjectId;
    orangeCap?: mongoose.Types.ObjectId;
    purpleCap?: mongoose.Types.ObjectId;
    isPublic: boolean;
    isFeatured: boolean;
    streamUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    addTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
    removeTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
    generateBracket(): Promise<void>;
    calculatePointsTable(): Promise<void>;
    startTournament(): Promise<void>;
    endTournament(winnerId?: mongoose.Types.ObjectId): Promise<void>;
    getUpcoming(limit?: number): Promise<any[]>;
    getOngoing(): Promise<any[]>;
    getFeatured(limit?: number): Promise<any[]>;
    getByOrganizer(organizerId: mongoose.Types.ObjectId): Promise<any[]>;
    getFullDetails(tournamentId: mongoose.Types.ObjectId): Promise<any[]>;
    search(query: string): Promise<any[]>;
}
declare const _default: mongoose.Model<ITournament, {}, {}, {}, mongoose.Document<unknown, {}, ITournament> & ITournament & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map