"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TossDecision = exports.OutType = exports.MatchStatus = void 0;
const mongoose_1 = __importStar(require("mongoose"));
// ============================================
// ENUMS
// ============================================
var MatchStatus;
(function (MatchStatus) {
    MatchStatus["UPCOMING"] = "upcoming";
    MatchStatus["LIVE"] = "live";
    MatchStatus["COMPLETED"] = "completed";
    MatchStatus["ABANDONED"] = "abandoned";
})(MatchStatus || (exports.MatchStatus = MatchStatus = {}));
var OutType;
(function (OutType) {
    OutType["BOWLED"] = "bowled";
    OutType["CAUGHT"] = "caught";
    OutType["LBW"] = "lbw";
    OutType["RUN_OUT"] = "run_out";
    OutType["STUMPED"] = "stumped";
    OutType["HIT_WICKET"] = "hit_wicket";
    OutType["HANDLED_BALL"] = "handled_ball";
    OutType["OBSTRUCTING"] = "obstructing";
    OutType["TIMED_OUT"] = "timed_out";
    OutType["RETIRED_HURT"] = "retired_hurt";
})(OutType || (exports.OutType = OutType = {}));
var TossDecision;
(function (TossDecision) {
    TossDecision["BAT"] = "bat";
    TossDecision["BOWL"] = "bowl";
})(TossDecision || (exports.TossDecision = TossDecision = {}));
// ============================================
// SCHEMA
// ============================================
const BatsmanSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' },
    name: { type: String, required: true },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    sixes: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    isOut: { type: Boolean, default: false },
    isStriker: { type: Boolean, default: false },
    outType: String,
    outTo: String,
    outFielder: String,
    enteredAt: Number
}, { _id: false });
const BowlerSchema = new mongoose_1.Schema({
    playerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Player' },
    name: { type: String, required: true },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    maidens: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    economy: { type: Number, default: 0 },
    wides: { type: Number, default: 0 },
    noBalls: { type: Number, default: 0 }
}, { _id: false });
const InningsSchema = new mongoose_1.Schema({
    teamId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team', required: true },
    teamName: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
    score: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    overs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    runRate: { type: Number, default: 0 },
    targetScore: Number,
    requiredRuns: Number,
    requiredRunRate: Number,
    extras: {
        wides: { type: Number, default: 0 },
        noBalls: { type: Number, default: 0 },
        byes: { type: Number, default: 0 },
        legByes: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    batsmen: [BatsmanSchema],
    bowlers: [BowlerSchema],
    fallOfWickets: [{
            wicket: Number,
            score: Number,
            overs: String,
            batsman: String,
            bowler: String
        }],
    ballHistory: [mongoose_1.Schema.Types.Mixed]
}, { _id: false });
const MatchSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    tournamentId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Tournament', index: true },
    round: String,
    matchNumber: Number,
    team1: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team', required: true },
    team1Name: { type: String, required: true },
    team2: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team', required: true },
    team2Name: { type: String, required: true },
    venue: { type: String, default: 'TBD' },
    date: { type: Date, required: true },
    time: String,
    format: { type: String, enum: ['T10', 'T20', 'ODI', 'Test'], default: 'T20' },
    maxOvers: { type: Number, default: 20 },
    status: { type: String, enum: Object.values(MatchStatus), default: MatchStatus.UPCOMING, index: true },
    tossWinner: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team' },
    tossWinnerName: String,
    tossDecision: { type: String, enum: Object.values(TossDecision) },
    innings: [InningsSchema],
    currentInnings: { type: Number, default: 1 },
    strikerName: { type: String, default: '' },
    nonStrikerName: { type: String, default: '' },
    currentBowlerName: { type: String, default: '' },
    team1Score: { type: Number, default: 0 },
    team1Wickets: { type: Number, default: 0 },
    team1Overs: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 },
    team2Wickets: { type: Number, default: 0 },
    team2Overs: { type: Number, default: 0 },
    winner: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Team' },
    winnerName: String,
    resultSummary: String,
    playerOfMatch: String,
    scorerId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
MatchSchema.index({ tournamentId: 1, status: 1 });
MatchSchema.index({ status: 1, date: -1 });
// ============================================
// HELPERS
// ============================================
function formatOvers(completedOvers, ballsInOver) {
    return `${completedOvers}.${ballsInOver}`;
}
function oversToDecimal(completedOvers, ballsInOver) {
    return completedOvers + ballsInOver / 6;
}
function calcRunRate(score, overs, balls) {
    const totalOvers = overs + balls / 6;
    return totalOvers > 0 ? parseFloat((score / totalOvers).toFixed(2)) : 0;
}
function calcRequiredRunRate(required, remainingOvers, remainingBalls) {
    const total = remainingOvers + remainingBalls / 6;
    return total > 0 ? parseFloat((required / total).toFixed(2)) : 0;
}
// ============================================
// startMatch METHOD
// ============================================
MatchSchema.methods.startMatch = async function (data) {
    this.tossWinner = new mongoose_1.default.Types.ObjectId(data.tossWinnerId);
    this.tossWinnerName = data.tossWinnerName;
    this.tossDecision = data.tossDecision;
    this.status = MatchStatus.LIVE;
    // Determine max overs based on format
    const oversMap = { T10: 10, T20: 20, ODI: 50, Test: 90 };
    this.maxOvers = oversMap[this.format] || 20;
    this.innings = [{
            teamId: new mongoose_1.default.Types.ObjectId(data.battingTeamId),
            teamName: data.battingTeamName,
            status: 'in_progress',
            score: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            runRate: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
            batsmen: [
                {
                    name: data.striker,
                    runs: 0, balls: 0, fours: 0, sixes: 0,
                    strikeRate: 0, isOut: false, isStriker: true,
                    enteredAt: 0
                },
                {
                    name: data.nonStriker,
                    runs: 0, balls: 0, fours: 0, sixes: 0,
                    strikeRate: 0, isOut: false, isStriker: false,
                    enteredAt: 0
                }
            ],
            bowlers: [{
                    name: data.bowler,
                    overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0,
                    economy: 0, wides: 0, noBalls: 0
                }],
            fallOfWickets: [],
            ballHistory: []
        }];
    this.currentInnings = 1;
    this.strikerName = data.striker;
    this.nonStrikerName = data.nonStriker;
    this.currentBowlerName = data.bowler;
    await this.save();
};
// ============================================
// addBall METHOD — CORE SCORING ENGINE
// ============================================
MatchSchema.methods.addBall = async function (data) {
    const innings = this.innings[this.currentInnings - 1];
    if (!innings || innings.status !== 'in_progress') {
        throw new Error('No active innings');
    }
    const runs = data.runs || 0;
    const isWide = data.wide || false;
    const isNoBall = data.noBall || false;
    const byeRuns = data.bye || 0;
    const legByeRuns = data.legBye || 0;
    const isWicket = data.wicket || false;
    const penaltyRuns = data.penalty || 0;
    // Find striker and current bowler
    const strikerIdx = innings.batsmen.findIndex((b) => b.isStriker && !b.isOut);
    const bowlerIdx = innings.bowlers.findIndex((b) => b.name === this.currentBowlerName);
    if (strikerIdx === -1)
        throw new Error('No striker found');
    const striker = innings.batsmen[strikerIdx];
    const bowler = bowlerIdx >= 0 ? innings.bowlers[bowlerIdx] : null;
    let isLegalDelivery = !isWide && !isNoBall;
    let runsFromBat = 0;
    let extrasRuns = 0;
    let ballDesc = '';
    let totalRunsThisBall = 0;
    // SAVE HISTORY SNAPSHOT BEFORE CHANGES
    const historyEntry = {
        over: innings.overs,
        ball: innings.balls % 6,
        runs,
        extras: isWide ? 'wide' : isNoBall ? 'nb' : byeRuns > 0 ? 'bye' : legByeRuns > 0 ? 'lb' : '',
        wicket: isWicket,
        outType: data.outType || '',
        batsmanName: striker.name,
        bowlerName: this.currentBowlerName,
        totalBefore: innings.score,
        wicketsBefore: innings.wickets
    };
    innings.ballHistory.push(historyEntry);
    // ---- WIDE ----
    if (isWide) {
        extrasRuns = 1 + runs + byeRuns + legByeRuns;
        innings.extras.wides += 1;
        innings.extras.total += extrasRuns;
        innings.score += extrasRuns;
        totalRunsThisBall = extrasRuns;
        if (bowler) {
            bowler.runs += extrasRuns;
            bowler.wides += 1;
        }
        ballDesc = `Wide${runs > 0 ? `+${runs}` : ''}`;
        // Wide = not a legal delivery (no ball count, but over ends on runs if it causes out)
        isLegalDelivery = false;
    }
    // ---- NO BALL ----
    else if (isNoBall) {
        extrasRuns = 1;
        runsFromBat = runs;
        innings.extras.noBalls += 1;
        innings.extras.total += 1 + runs + byeRuns + legByeRuns;
        innings.score += 1 + runs + byeRuns + legByeRuns;
        totalRunsThisBall = 1 + runs + byeRuns + legByeRuns;
        if (bowler) {
            bowler.runs += 1 + runs;
            bowler.noBalls += 1;
        }
        // Batsman gets credit for runs on bat (not extras)
        if (runs > 0) {
            striker.runs += runs;
            if (runs === 4)
                striker.fours += 1;
            if (runs === 6)
                striker.sixes += 1;
        }
        striker.strikeRate = striker.balls > 0 ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)) : 0;
        ballDesc = `NB${runs > 0 ? `+${runs}` : ''}`;
        isLegalDelivery = false; // no ball counts as legal for face count in some rules, but NOT for over
    }
    // ---- BYE ----
    else if (byeRuns > 0) {
        extrasRuns = byeRuns;
        innings.extras.byes += byeRuns;
        innings.extras.total += byeRuns;
        innings.score += byeRuns;
        totalRunsThisBall = byeRuns;
        striker.balls += 1;
        if (bowler)
            bowler.balls += 1;
        ballDesc = `B${byeRuns}`;
    }
    // ---- LEG BYE ----
    else if (legByeRuns > 0) {
        extrasRuns = legByeRuns;
        innings.extras.legByes += legByeRuns;
        innings.extras.total += legByeRuns;
        innings.score += legByeRuns;
        totalRunsThisBall = legByeRuns;
        striker.balls += 1;
        if (bowler)
            bowler.balls += 1;
        ballDesc = `LB${legByeRuns}`;
    }
    // ---- NORMAL BALL ----
    else {
        runsFromBat = runs;
        innings.score += runs + penaltyRuns;
        totalRunsThisBall = runs + penaltyRuns;
        striker.runs += runs;
        striker.balls += 1;
        if (runs === 4)
            striker.fours += 1;
        if (runs === 6)
            striker.sixes += 1;
        striker.strikeRate = parseFloat(((striker.runs / striker.balls) * 100).toFixed(1));
        if (bowler) {
            bowler.runs += runs;
            bowler.balls += 1;
        }
        ballDesc = runs === 0 ? '•' : String(runs);
    }
    // ---- WICKET ----
    let needPlayerSelection = false;
    if (isWicket) {
        innings.wickets += 1;
        const outBatsman = data.outBatsmanName
            ? innings.batsmen.find((b) => b.name === data.outBatsmanName && !b.isOut)
            : striker;
        if (outBatsman) {
            outBatsman.isOut = true;
            outBatsman.outType = data.outType || 'bowled';
            outBatsman.outTo = this.currentBowlerName;
            outBatsman.outFielder = data.outFielder;
            outBatsman.isStriker = false;
            // Fall of wickets
            innings.fallOfWickets.push({
                wicket: innings.wickets,
                score: innings.score,
                overs: formatOvers(innings.overs, innings.balls % 6),
                batsman: outBatsman.name,
                bowler: this.currentBowlerName
            });
            // Bowler gets wicket (not if run out)
            if (bowler && data.outType !== 'run_out' && data.outType !== 'retired_hurt') {
                bowler.wickets += 1;
            }
        }
        ballDesc += ' W';
        needPlayerSelection = innings.wickets < 10;
    }
    // ---- LEGAL BALL: increment balls faced / over count ----
    let overChanged = false;
    if (isLegalDelivery || isNoBall) {
        // Note: No-ball doesn't count towards over
        if (isLegalDelivery) {
            innings.balls += 1;
            const ballsInOver = innings.balls % 6;
            if (ballsInOver === 0) {
                // Over completed
                innings.overs = Math.floor(innings.balls / 6);
                overChanged = true;
                // Calculate maiden: if bowler conceded 0 runs this over
                if (bowler && bowler.balls >= 6) {
                    const runsThisOver = bowler.runs - (bowler.economy * bowler.overs || 0);
                    // Simple maiden check: store bowler over start
                }
                // Update bowler completed overs
                if (bowler) {
                    bowler.overs = Math.floor(bowler.balls / 6);
                    bowler.economy = bowler.overs > 0 ? parseFloat((bowler.runs / bowler.overs).toFixed(2)) : 0;
                }
                // End of over: new bowler needed (and possibly new batsman if wicket)
                needPlayerSelection = true;
            }
        }
    }
    // ---- STRIKE ROTATION ----
    // Rotate on odd runs (not wide, not run-out misfield)
    const runsForRotation = isWide ? runs : (byeRuns || legByeRuns || runs);
    if (runsForRotation % 2 === 1 && !isWide) {
        // Swap striker/non-striker
        const nonStrikerIdx = innings.batsmen.findIndex((b) => !b.isStriker && !b.isOut);
        if (nonStrikerIdx >= 0 && strikerIdx >= 0 && !isWicket) {
            innings.batsmen[strikerIdx].isStriker = false;
            innings.batsmen[nonStrikerIdx].isStriker = true;
            // Update names
            this.strikerName = innings.batsmen[nonStrikerIdx].name;
            this.nonStrikerName = striker.name;
        }
    }
    // At end of over, batsmen swap ends
    if (overChanged) {
        const activeStrikerIdx = innings.batsmen.findIndex((b) => b.isStriker && !b.isOut);
        const activeNonStrikerIdx = innings.batsmen.findIndex((b) => !b.isStriker && !b.isOut);
        if (activeStrikerIdx >= 0 && activeNonStrikerIdx >= 0) {
            innings.batsmen[activeStrikerIdx].isStriker = false;
            innings.batsmen[activeNonStrikerIdx].isStriker = true;
            this.strikerName = innings.batsmen[activeNonStrikerIdx].name;
            this.nonStrikerName = innings.batsmen[activeStrikerIdx].name;
        }
    }
    // ---- RUN RATE ----
    innings.runRate = calcRunRate(innings.score, innings.overs, innings.balls % 6);
    // ---- UPDATE REQUIRED RUNS (2nd innings) ----
    if (this.currentInnings === 2 && innings.targetScore) {
        innings.requiredRuns = innings.targetScore - innings.score;
        const remainingLegalBalls = (this.maxOvers * 6) - innings.balls;
        const remainOvers = Math.floor(remainingLegalBalls / 6);
        const remainBalls = remainingLegalBalls % 6;
        innings.requiredRunRate = innings.requiredRuns > 0
            ? calcRequiredRunRate(innings.requiredRuns, remainOvers, remainBalls)
            : 0;
    }
    // ---- UPDATE TOP-LEVEL SUMMARY ----
    this._updateSummary(innings);
    // ---- CHECK INNINGS END CONDITIONS ----
    let inningsEnded = false;
    let matchEnded = false;
    const maxOver = this.maxOvers;
    const legalBallsFaced = innings.balls;
    const maxBalls = maxOver * 6;
    const allOut = innings.wickets >= 10;
    const oversUp = legalBallsFaced >= maxBalls;
    // 2nd innings: team chasing won
    const chaseComplete = this.currentInnings === 2 &&
        innings.targetScore &&
        innings.score >= innings.targetScore;
    if (allOut || oversUp || chaseComplete) {
        innings.status = 'completed';
        inningsEnded = true;
        if (this.currentInnings === 2 || chaseComplete) {
            matchEnded = true;
        }
    }
    await this.save();
    return {
        score: innings.score,
        wickets: innings.wickets,
        overs: formatOvers(innings.overs, innings.balls % 6),
        runRate: innings.runRate,
        requiredRuns: innings.requiredRuns,
        requiredRunRate: innings.requiredRunRate,
        targetScore: innings.targetScore,
        ballDescription: ballDesc,
        overChanged,
        inningsEnded,
        matchEnded,
        needPlayerSelection: needPlayerSelection && !matchEnded
    };
};
// ---- Update summary denormalized fields ----
MatchSchema.methods._updateSummary = function (innings) {
    if (this.currentInnings === 1) {
        if (innings.teamId.toString() === this.team1.toString()) {
            this.team1Score = innings.score;
            this.team1Wickets = innings.wickets;
            this.team1Overs = innings.overs + (innings.balls % 6) / 10;
        }
        else {
            this.team2Score = innings.score;
            this.team2Wickets = innings.wickets;
            this.team2Overs = innings.overs + (innings.balls % 6) / 10;
        }
    }
    else {
        if (innings.teamId.toString() === this.team1.toString()) {
            this.team1Score = innings.score;
            this.team1Wickets = innings.wickets;
            this.team1Overs = innings.overs + (innings.balls % 6) / 10;
        }
        else {
            this.team2Score = innings.score;
            this.team2Wickets = innings.wickets;
            this.team2Overs = innings.overs + (innings.balls % 6) / 10;
        }
    }
};
// ============================================
// endInnings METHOD
// ============================================
MatchSchema.methods.endInnings = async function () {
    const innings = this.innings[this.currentInnings - 1];
    if (innings) {
        innings.status = 'completed';
    }
    if (this.currentInnings === 1) {
        // Determine who bats 2nd (team that didn't bat 1st)
        const firstBattingTeamId = innings?.teamId?.toString();
        const secondBattingTeamId = firstBattingTeamId === this.team1.toString()
            ? this.team2.toString()
            : this.team1.toString();
        const secondBattingTeamName = firstBattingTeamId === this.team1.toString()
            ? this.team2Name
            : this.team1Name;
        const target = (innings?.score || 0) + 1;
        this.innings.push({
            teamId: new mongoose_1.default.Types.ObjectId(secondBattingTeamId),
            teamName: secondBattingTeamName,
            status: 'in_progress',
            score: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            runRate: 0,
            targetScore: target,
            requiredRuns: target,
            requiredRunRate: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
            batsmen: [],
            bowlers: [],
            fallOfWickets: [],
            ballHistory: []
        });
        this.currentInnings = 2;
        this.strikerName = '';
        this.nonStrikerName = '';
        this.currentBowlerName = '';
    }
    await this.save();
};
// ============================================
// endMatch METHOD
// ============================================
MatchSchema.methods.endMatch = async function (winnerId, winnerName, resultSummary) {
    this.status = MatchStatus.COMPLETED;
    if (winnerId)
        this.winner = new mongoose_1.default.Types.ObjectId(winnerId);
    if (winnerName)
        this.winnerName = winnerName;
    if (resultSummary)
        this.resultSummary = resultSummary;
    // Mark current innings completed
    const innings = this.innings[this.currentInnings - 1];
    if (innings)
        innings.status = 'completed';
    await this.save();
};
// ============================================
// undoLastBall METHOD
// ============================================
MatchSchema.methods.undoLastBall = async function () {
    const innings = this.innings[this.currentInnings - 1];
    if (!innings || !innings.ballHistory || innings.ballHistory.length === 0) {
        throw new Error('Nothing to undo');
    }
    const last = innings.ballHistory.pop();
    if (!last)
        throw new Error('No history to undo');
    // Restore score and wickets from snapshot
    innings.score = last.totalBefore;
    innings.wickets = last.wicketsBefore;
    // Revert balls count if it was a legal delivery
    if (!last.extras.includes('wide') && !last.extras.includes('nb')) {
        if (innings.balls > 0)
            innings.balls -= 1;
    }
    innings.overs = Math.floor(innings.balls / 6);
    // Revert fall of wickets
    if (last.wicket) {
        innings.fallOfWickets.pop();
        // Revive the batsman
        const outBatsman = innings.batsmen.find((b) => b.name === last.batsmanName && b.isOut);
        if (outBatsman) {
            outBatsman.isOut = false;
            outBatsman.outType = undefined;
            outBatsman.outTo = undefined;
        }
    }
    // Revert batsman stats
    const batsman = innings.batsmen.find((b) => b.name === last.batsmanName);
    if (batsman && !last.extras.includes('wide')) {
        if (batsman.balls > 0)
            batsman.balls -= 1;
        batsman.runs -= last.runs;
        if (last.runs === 4 && batsman.fours > 0)
            batsman.fours -= 1;
        if (last.runs === 6 && batsman.sixes > 0)
            batsman.sixes -= 1;
        batsman.strikeRate = batsman.balls > 0 ? parseFloat(((batsman.runs / batsman.balls) * 100).toFixed(1)) : 0;
    }
    // Revert bowler stats
    const bowler = innings.bowlers.find((b) => b.name === last.bowlerName);
    if (bowler) {
        if (!last.extras.includes('wide') && !last.extras.includes('nb')) {
            if (bowler.balls > 0)
                bowler.balls -= 1;
            bowler.overs = Math.floor(bowler.balls / 6);
        }
        if (last.wicket && bowler.wickets > 0)
            bowler.wickets -= 1;
        bowler.runs -= last.runs;
        bowler.economy = bowler.overs > 0 ? parseFloat((bowler.runs / bowler.overs).toFixed(2)) : 0;
    }
    // Revert extras
    if (last.extras === 'wide' && innings.extras.wides > 0)
        innings.extras.wides -= 1;
    if (last.extras === 'nb' && innings.extras.noBalls > 0)
        innings.extras.noBalls -= 1;
    if (last.extras === 'bye' && innings.extras.byes > 0)
        innings.extras.byes -= last.runs;
    if (last.extras === 'lb' && innings.extras.legByes > 0)
        innings.extras.legByes -= last.runs;
    innings.extras.total = innings.extras.wides + innings.extras.noBalls + innings.extras.byes + innings.extras.legByes;
    // Recalculate run rate
    innings.runRate = calcRunRate(innings.score, innings.overs, innings.balls % 6);
    this._updateSummary(innings);
    await this.save();
};
// ============================================
// selectPlayers METHOD
// ============================================
MatchSchema.methods.selectPlayers = async function (data) {
    const innings = this.innings[this.currentInnings - 1];
    if (!innings)
        throw new Error('No active innings');
    if (data.striker) {
        this.strikerName = data.striker;
        // Add to batsmen if not already present
        const existing = innings.batsmen.find((b) => b.name === data.striker);
        if (!existing) {
            innings.batsmen.push({
                name: data.striker,
                runs: 0, balls: 0, fours: 0, sixes: 0,
                strikeRate: 0, isOut: false, isStriker: true,
                enteredAt: innings.balls
            });
        }
        else {
            // Clear old striker
            innings.batsmen.forEach((b) => { b.isStriker = false; });
            existing.isStriker = true;
        }
    }
    if (data.nonStriker) {
        this.nonStrikerName = data.nonStriker;
        const existing = innings.batsmen.find((b) => b.name === data.nonStriker);
        if (!existing) {
            innings.batsmen.push({
                name: data.nonStriker,
                runs: 0, balls: 0, fours: 0, sixes: 0,
                strikeRate: 0, isOut: false, isStriker: false,
                enteredAt: innings.balls
            });
        }
        else {
            existing.isStriker = false;
        }
    }
    if (data.bowler) {
        this.currentBowlerName = data.bowler;
        const existing = innings.bowlers.find((b) => b.name === data.bowler);
        if (!existing) {
            innings.bowlers.push({
                name: data.bowler,
                overs: 0, balls: 0, maidens: 0,
                runs: 0, wickets: 0, economy: 0,
                wides: 0, noBalls: 0
            });
        }
    }
    await this.save();
};
// ============================================
// getOverSummary
// ============================================
MatchSchema.methods.getOverSummary = function () {
    const innings = this.innings[this.currentInnings - 1];
    if (!innings || innings.ballHistory.length === 0)
        return '';
    const ballsInOver = innings.balls % 6;
    const thisOverBalls = innings.ballHistory.slice(-ballsInOver);
    return thisOverBalls.map((b) => {
        if (b.wicket)
            return 'W';
        if (b.extras === 'wide')
            return 'Wd';
        if (b.extras === 'nb')
            return 'Nb';
        if (b.extras === 'bye')
            return `B${b.runs}`;
        if (b.extras === 'lb')
            return `Lb${b.runs}`;
        return String(b.runs || '•');
    }).join(' ');
};
exports.default = mongoose_1.default.model('Match', MatchSchema);
