/**
 * Player Model
 * Cricket player profile and statistics
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export interface IPlayer extends Document {
    name: string;
    email?: string;
    phone?: string;
    dateOfBirth?: Date;
    nationality?: string;
    profilePicture?: string;
    role: 'batsman' | 'bowler' | 'all-rounder' | 'wicket-keeper' | 'batsman-wicket-keeper';
    jerseyNumber?: number;
    battingStats?: {
        totalMatches: number;
        totalInnings: number;
        totalRuns: number;
        highestScore: number;
        average: number;
        strikeRate: number;
        fifties: number;
        hundreds: number;
        doubles: number;
        notOuts: number;
        fours: number;
        sixes: number;
    };
    bowlingStats?: {
        totalMatches: number;
        totalInnings: number;
        totalOvers: number;
        totalMaidens: number;
        totalRunsConceded: number;
        totalWickets: number;
        economy: number;
        average: number;
        strikeRate: number;
        bestBowling: {
            wickets: number;
            runs: number;
        };
        fiveWickets: number;
    };
    fieldingStats?: {
        catches: number;
        runOuts: number;
        stumpings: number;
    };
    points?: {
        total: number;
        batting: number;
        bowling: number;
        fielding: number;
    };
    teams: mongoose.Types.ObjectId[];
    userId?: mongoose.Types.ObjectId;
    isActive: boolean;
    lastMatchDate?: Date;
    createdAt: Date;
    updatedAt: Date;
    calculateTotalPoints(): number;
    updateStats(matchResult: any): Promise<void>;
}
declare const _default: mongoose.Model<IPlayer, {}, {}, {}, mongoose.Document<unknown, {}, IPlayer> & IPlayer & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Player.d.ts.map