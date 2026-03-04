import mongoose, { Document, Types } from 'mongoose';
export interface IBall {
    overNumber: number;
    ballNumber: number;
    bowler: Types.ObjectId;
    striker: Types.ObjectId;
    nonStriker: Types.ObjectId;
    runsOffBat: number;
    extras: number;
    extraType: 'None' | 'WD' | 'NB' | 'B' | 'LB' | 'Penalty';
    isWicket: boolean;
    wicketType: 'None' | 'Bowled' | 'Caught' | 'Stumped' | 'LBW' | 'Run Out' | 'Mankad' | 'Retired' | 'Hit Wicket' | 'Obstructing the Field' | 'Hit the Ball Twice' | 'Timed Out' | 'Over the Fence' | 'One Hand One Bounce';
    outPlayer?: Types.ObjectId;
    fielder?: Types.ObjectId;
    timestamp: Date;
}
export interface IInnings {
    battingTeam: Types.ObjectId;
    bowlingTeam: Types.ObjectId;
    totalRuns: number;
    totalWickets: number;
    totalOversBowled: number;
    extrasTotal: number;
    ballByBall: IBall[];
}
export interface IMatch extends Document {
    tournamentId: Types.ObjectId;
    matchName: string;
    teamA: Types.ObjectId;
    teamB: Types.ObjectId;
    venue: string;
    matchDate: Date;
    format: 'T10' | 'T20' | 'Club' | '100' | 'ODI' | 'Test' | 'Custom';
    maxOvers: number;
    playersPerSide: number;
    customRules: {
        overTheFenceOut: boolean;
        lastManStanding: boolean;
    };
    toss: {
        winner?: Types.ObjectId;
        decision: 'Bat' | 'Bowl' | 'Pending';
    };
    currentInnings: 1 | 2 | 3 | 4;
    firstInnings?: IInnings;
    secondInnings?: IInnings;
    status: 'Scheduled' | 'Toss Completed' | 'First Innings' | 'Second Innings' | 'Completed' | 'Abandoned';
    result?: {
        winner?: Types.ObjectId;
        margin?: string;
        isDraw: boolean;
    };
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IMatch, {}, {}, {}, mongoose.Document<unknown, {}, IMatch> & IMatch & {
    _id: Types.ObjectId;
}, any>;
export default _default;
//# sourceMappingURL=Match.d.ts.map