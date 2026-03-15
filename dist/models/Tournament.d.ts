import mongoose, { Document } from 'mongoose';
export declare enum TournamentType {
    ROUND_ROBIN = "round_robin",
    KNOCKOUT = "knockout",
    LEAGUE = "league"
}
export declare enum TournamentStatus {
    UPCOMING = "upcoming",
    ONGOING = "ongoing",
    COMPLETED = "completed"
}
export interface ITournament extends Document {
    name: string;
    type: TournamentType;
    format: string;
    status: TournamentStatus;
    organizer: mongoose.Types.ObjectId;
    teams: mongoose.Types.ObjectId[];
    matches: mongoose.Types.ObjectId[];
    startDate: Date;
    endDate: Date;
    venue: string;
    prizePool: number;
    rules: string;
    pointsTable?: any[];
    bracket?: any[];
    generateBracket(): Promise<void>;
    calculatePointsTable(): Promise<void>;
    addTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
    isUserOwner(userId: string): boolean;
}
declare const _default: mongoose.Model<ITournament, {}, {}, {}, mongoose.Document<unknown, {}, ITournament> & ITournament & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Tournament.d.ts.map