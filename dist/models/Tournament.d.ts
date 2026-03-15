/**
 * Tournament Model — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. generateKnockoutBracket set team1 & team2 both to teams[0] — now pairs correctly
 * 2. calculatePointsTable NRR used raw decimal overs as divisor — now converts to real overs
 * 3. matchesNoResult counter was never incremented — now handled properly
 */
import mongoose, { Document, Model } from 'mongoose';
export type TournamentType = 'round_robin' | 'knockout' | 'double_elimination' | 'league' | 'group_stage';
export type TournamentStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type TournamentFormat = 'T10' | 'T20' | 'ODI' | 'Test' | 'Custom';
export type LocationType = 'indoor' | 'outdoor' | 'both';
export interface ITournamentModel extends Model<ITournament> {
    getUpcoming(limit?: number): Promise<ITournament[]>;
    getOngoing(): Promise<ITournament[]>;
    getFeatured(limit?: number): Promise<ITournament[]>;
    getByOrganizer(organizerId: mongoose.Types.ObjectId | string): Promise<ITournament[]>;
    getFullDetails(tournamentId: mongoose.Types.ObjectId): Promise<ITournament | null>;
    search(query: string): Promise<ITournament[]>;
}
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
        matchesNoResult: number;
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
}
declare const _default: ITournamentModel;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map