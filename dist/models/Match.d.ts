import mongoose, { Document } from 'mongoose';
export declare enum OutType {
    BOWLED = "bowled",
    CAUGHT = "caught",
    LBW = "lbw",
    RUN_OUT = "run_out",
    STUMPED = "stumped"
}
export declare enum MatchStatus {
    UPCOMING = "upcoming",
    LIVE = "live",
    COMPLETED = "completed"
}
export declare enum TossDecision {
    BAT = "bat",
    BOWL = "bowl"
}
interface IBatsman {
    playerId?: mongoose.Types.ObjectId;
    name: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isOut: boolean;
    outType?: OutType;
    outTo?: string;
}
interface IBowler {
    playerId?: mongoose.Types.ObjectId;
    name: string;
    overs: number;
    maidens: number;
    runs: number;
    wickets: number;
    economy: number;
}
interface IInnings {
    teamId: mongoose.Types.ObjectId;
    status: 'in_progress' | 'completed';
    score: number;
    wickets: number;
    overs: number;
    balls: number;
    runRate: number;
    targetScore?: number;
    requiredRuns?: number;
    requiredRunRate?: number;
    extras: {
        wides: number;
        noBalls: number;
        byes: number;
        legByes: number;
        total: number;
    };
    batsmen: IBatsman[];
    bowlers: IBowler[];
    fallOfWickets: {
        wicket: number;
        score: number;
        overs: number;
        batsman: string;
    }[];
}
interface IMatch extends Document {
    name: string;
    tournamentId?: mongoose.Types.ObjectId;
    round?: string;
    matchNumber?: number;
    team1: mongoose.Types.ObjectId;
    team1Name: string;
    team2: mongoose.Types.ObjectId;
    team2Name: string;
    venue: string;
    date: Date;
    time?: string;
    format: string;
    status: MatchStatus;
    tossWinner?: mongoose.Types.ObjectId;
    tossDecision?: TossDecision;
    innings: IInnings[];
    currentInnings: number;
    currentOver: number;
    currentBall: number;
    striker?: mongoose.Types.ObjectId;
    nonStriker?: mongoose.Types.ObjectId;
    lastBowler?: mongoose.Types.ObjectId;
    team1Score: number;
    team1Wickets: number;
    team1Overs: number;
    team2Score: number;
    team2Wickets: number;
    team2Overs: number;
    winner?: mongoose.Types.ObjectId;
    margin?: string;
    playerOfMatch?: mongoose.Types.ObjectId;
    overlayId?: mongoose.Types.ObjectId;
    scorerId?: mongoose.Types.ObjectId;
    addBall(ballData: {
        runs?: number;
        wicket?: boolean;
        outType?: OutType;
        wide?: boolean;
        noBall?: boolean;
        bye?: number;
        legBye?: number;
        bowlerId?: string;
    }): Promise<void>;
    startMatch(tossWinner: mongoose.Types.ObjectId, decision: TossDecision): Promise<void>;
    endInnings(): Promise<void>;
    endMatch(winner?: mongoose.Types.ObjectId, resultType?: string): Promise<void>;
}
declare const _default: mongoose.Model<IMatch, {}, {}, {}, mongoose.Document<unknown, {}, IMatch> & IMatch & {
    _id: mongoose.Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Match.d.ts.map