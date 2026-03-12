/**
 * Match Model
 * Complete cricket match and scoring system
 * Following PROJECT_ALGORITHM.md specifications
 */
import mongoose, { Document } from 'mongoose';
export type OutType = 'caught' | 'bowled' | 'lbw' | 'run out' | 'stumped' | 'hit wicket' | 'obstructing the field' | 'timed out' | 'handled the ball';
export type ExtraType = 'no ball' | 'wide' | 'bye' | 'leg bye';
export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type MatchFormat = 'T10' | 'T20' | 'ODI' | 'Test';
export type InningsStatus = 'pending' | 'in_progress' | 'completed';
export interface IBatsman {
    playerId: mongoose.Types.ObjectId;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    isOut: boolean;
    outType?: OutType;
    outBy?: mongoose.Types.ObjectId;
    outAtBalls?: number;
}
export interface IBowler {
    playerId: mongoose.Types.ObjectId;
    overs: number;
    maidens: number;
    runsConceded: number;
    wickets: number;
    wides: number;
    noBalls: number;
}
export interface IExtras {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
}
export interface IInnings {
    teamId: mongoose.Types.ObjectId;
    status: InningsStatus;
    score: number;
    wickets: number;
    overs: number;
    balls: number;
    runRate: number;
    requiredRuns?: number;
    requiredRunRate?: number;
    targetScore?: number;
    extras: IExtras;
    batsmen: IBatsman[];
    bowlers: IBowler[];
    fallOfWickets: {
        wicket: number;
        score: number;
        overs: number;
        playerId: mongoose.Types.ObjectId;
    }[];
    powerPlay?: {
        start: number;
        end: number;
        runs: number;
        wickets: number;
    };
}
export interface IOver {
    overNumber: number;
    bowlerId: mongoose.Types.ObjectId;
    runs: number;
    wickets: number;
    extras: number;
    balls: {
        runs: number;
        isWide: boolean;
        isNoBall: boolean;
        isWicket: boolean;
        outType?: OutType;
    }[];
}
export interface IMatch extends Document {
    name: string;
    tournamentId?: mongoose.Types.ObjectId;
    round?: string;
    matchNumber?: number;
    team1: mongoose.Types.ObjectId;
    team2: mongoose.Types.ObjectId;
    venue: string;
    date: Date;
    time?: string;
    format: MatchFormat;
    status: MatchStatus;
    tossWinner?: mongoose.Types.ObjectId;
    tossDecision?: 'bat' | 'bowl';
    innings: IInnings[];
    currentInnings: number;
    team1Score: number;
    team1Wickets: number;
    team1Overs: number;
    team2Score: number;
    team2Wickets: number;
    team2Overs: number;
    winner?: mongoose.Types.ObjectId;
    resultType?: 'win' | 'draw' | 'tie' | 'no result';
    margin?: string;
    playerOfMatch?: mongoose.Types.ObjectId;
    currentOver: number;
    currentBall: number;
    lastBowler?: mongoose.Types.ObjectId;
    striker?: mongoose.Types.ObjectId;
    nonStriker?: mongoose.Types.ObjectId;
    overHistory: IOver[];
    streamUrl?: string;
    streamEmbedUrl?: string;
    overlayId?: mongoose.Types.ObjectId;
    overlayUrl?: string;
    scorerId?: mongoose.Types.ObjectId;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    scorecard?: {
        batting: Array<{
            playerId?: mongoose.Types.ObjectId;
            name?: string;
            runs: number;
            balls: number;
            fours: number;
            sixes: number;
            isOut: boolean;
            outType?: string;
            dismissal?: string;
            teamId?: mongoose.Types.ObjectId;
        }>;
        bowling: Array<{
            fieldingStats: any;
            playerId?: mongoose.Types.ObjectId;
            name?: string;
            overs: number;
            runs: number;
            wickets: number;
            teamId?: mongoose.Types.ObjectId;
        }>;
    };
    startMatch(tossWinnerId: mongoose.Types.ObjectId, decision: 'bat' | 'bowl'): Promise<void>;
    addBall(ballData: {
        runs: number;
        isWide?: boolean;
        isNoBall?: boolean;
        isWicket?: boolean;
        outType?: OutType;
        byes?: number;
        legByes?: number;
    }): Promise<IMatch>;
    calculateRunRate(): number;
    calculateRequiredRunRate(): number | null;
    endInnings(): Promise<void>;
    endMatch(winnerId?: mongoose.Types.ObjectId, resultType?: string): Promise<void>;
    getScoreDisplay(): string;
    getLiveMatches(): Promise<any[]>;
    getByTournament(tournamentId: mongoose.Types.ObjectId): Promise<any[]>;
    getByTeam(teamId: mongoose.Types.ObjectId): Promise<any[]>;
    getUpcoming(limit?: number): Promise<any[]>;
}
declare const _default: mongoose.Model<IMatch, {}, {}, {}, mongoose.Document<unknown, {}, IMatch> & IMatch & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Match.d.ts.map