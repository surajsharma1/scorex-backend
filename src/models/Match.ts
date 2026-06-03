import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// ENUMS
// ============================================
export enum MatchStatus { UPCOMING = 'upcoming', LIVE = 'live', COMPLETED = 'completed', ABANDONED = 'abandoned' }
export enum OutType { BOWLED = 'bowled', CAUGHT = 'caught', LBW = 'lbw', RUN_OUT = 'run_out', STUMPED = 'stumped', HIT_WICKET = 'hit_wicket', HANDLED_BALL = 'handled_ball', OBSTRUCTING = 'obstructing', TIMED_OUT = 'timed_out', RETIRED_HURT = 'retired_hurt' }
export enum TossDecision { BAT = 'bat', BOWL = 'bowl' }

// ============================================
// INTERFACES
// ============================================
export interface IBatsman { playerId?: mongoose.Types.ObjectId; name: string; runs: number; balls: number; fours: number; sixes: number; strikeRate: number; isOut: boolean; isStriker: boolean; outType?: string; outTo?: string; outFielder?: string; enteredAt?: number; }
export interface IBowler { playerId?: mongoose.Types.ObjectId; name: string; overs: number; balls: number; maidens: number; runs: number; wickets: number; economy: number; wides: number; noBalls: number; }
export interface IFallOfWicket { wicket: number; score: number; overs: string; batsman: string; bowler?: string; }
export interface IInnings {
  _wicketLimit: number; teamId: mongoose.Types.ObjectId; teamName: string; status: 'in_progress' | 'completed'; score: number; wickets: number; overs: number; balls: number; runRate: number; targetScore?: number; requiredRuns?: number; requiredRunRate?: number; extras: { wides: number; noBalls: number; byes: number; legByes: number; total: number; }; batsmen: IBatsman[]; bowlers: IBowler[]; fallOfWickets: IFallOfWicket[]; ballHistory: Array<any>; 
}

export interface IMatch extends Document {
  name: string; tournamentId?: mongoose.Types.ObjectId; round?: string; matchNumber?: number; team1: any; team1Name: string; team2: any; team2Name: string; venue: string; date: Date; time?: string; format: 'T10' | 'T20' | 'ODI' | 'Test' | 'Custom'; maxOvers: number; status: MatchStatus; tossWinner?: mongoose.Types.ObjectId; tossWinnerName?: string; tossDecision?: TossDecision; innings: IInnings[]; currentInnings: number; strikerName: string; nonStrikerName: string; currentBowlerName: string; team1Score: number; team1Wickets: number; team1Overs: number; team2Score: number; team2Wickets: number; team2Overs: number; winner?: mongoose.Types.ObjectId; winnerName?: string; resultSummary?: string; playerOfMatch?: string; scorerId?: mongoose.Types.ObjectId; streamUrl?: string; createdAt: Date; updatedAt: Date;
  /** Current-striker/non-striker/bowler ObjectIds — collision-free tracking */
  strikerId?:      mongoose.Types.ObjectId;
  nonStrikerId?:   mongoose.Types.ObjectId;
  currentBowlerId?: mongoose.Types.ObjectId;

  addBall(data: AddBallData): Promise<ScoreUpdateResult>; startMatch(data: StartMatchData): Promise<void>; endInnings(): Promise<void>; endMatch(winnerId?: string, winnerName?: string, resultSummary?: string): Promise<void>; undoLastBall(): Promise<void>; selectPlayers(data: SelectPlayersData): Promise<void>; getOverSummary(): string; _updateSummary(innings: IInnings): void;
}

export interface AddBallData { runs?: number; wide?: boolean; noBall?: boolean; bye?: number; legBye?: number; wicket?: boolean; outType?: string; outBatsmanName?: string; outFielder?: string; retired?: boolean; penalty?: number; noPenalty?: boolean; }
export interface StartMatchData {
  bowlerId: any;
  nonStrikerId: any;
  strikerId: any; tossWinnerId: string; tossWinnerName: string; tossDecision: TossDecision; battingTeamId: string; battingTeamName: string; bowlingTeamId: string; bowlingTeamName: string; striker: string; nonStriker: string; bowler: string; 
}
export interface SelectPlayersData {
  striker?: string;
  nonStriker?: string;
  bowler?: string;
  /** MongoDB ObjectId strings — preferred over name for collision-free lookup */
  strikerId?: string;
  nonStrikerId?: string;
  bowlerId?: string;
}
export interface ScoreUpdateResult {
  outType: string; 
  score: number; 
  wickets: number; 
  overs: string; 
  runRate: number; 
  requiredRuns?: number; 
  requiredRunRate?: number; 
  targetScore?: number; 
  ballDescription: string; 
  overChanged: boolean; 
  inningsEnded: boolean; 
  matchEnded: boolean; 
  needPlayerSelection: boolean;
  // --- NEW FIELDS FOR OVERLAY TRIGGERS ---
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  outBatsmanName?: string;
  completedOverNumber?: number;
  strikerMatchRuns?: number;
  strikerMatchBalls?: number;
  totalFours: number;
  totalSixes: number;
}

// ============================================
// SCHEMA
// ============================================
const BatsmanSchema = new Schema<IBatsman>({ playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, name: { type: String, required: true }, runs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, fours: { type: Number, default: 0 }, sixes: { type: Number, default: 0 }, strikeRate: { type: Number, default: 0 }, isOut: { type: Boolean, default: false }, isStriker: { type: Boolean, default: false }, outType: String, outTo: String, outFielder: String, enteredAt: Number }, { _id: false });
const BowlerSchema = new Schema<IBowler>({ playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, name: { type: String, required: true }, overs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, maidens: { type: Number, default: 0 }, runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, economy: { type: Number, default: 0 }, wides: { type: Number, default: 0 }, noBalls: { type: Number, default: 0 } }, { _id: false });
const InningsSchema = new Schema<IInnings>({ teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, teamName: { type: String, required: true }, status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' }, score: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, overs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, runRate: { type: Number, default: 0 }, targetScore: Number, requiredRuns: Number, requiredRunRate: Number, extras: { wides: { type: Number, default: 0 }, noBalls: { type: Number, default: 0 }, byes: { type: Number, default: 0 }, legByes: { type: Number, default: 0 }, total: { type: Number, default: 0 } }, batsmen: [BatsmanSchema], bowlers: [BowlerSchema], fallOfWickets: [Schema.Types.Mixed], ballHistory: [Schema.Types.Mixed] }, { _id: false });
const MatchSchema = new Schema<IMatch>({ name: { type: String, required: true }, tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', index: true }, round: String, matchNumber: Number, team1: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, team1Name: { type: String, required: true }, team2: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }, team2Name: { type: String, required: true }, venue: { type: String, default: 'TBD' }, date: { type: Date, required: true }, time: String, format: { type: String, enum: ['T10', 'T20', 'ODI', 'Test', 'Custom'], default: 'T20' }, maxOvers: { type: Number, default: 20 }, status: { type: String, enum: Object.values(MatchStatus), default: MatchStatus.UPCOMING, index: true }, tossWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, tossWinnerName: String, tossDecision: { type: String, enum: Object.values(TossDecision) }, innings: [InningsSchema], currentInnings: { type: Number, default: 1 }, strikerName: { type: String, default: '' }, nonStrikerName: { type: String, default: '' }, currentBowlerName: { type: String, default: '' }, team1Score: { type: Number, default: 0 }, team1Wickets: { type: Number, default: 0 }, team1Overs: { type: Number, default: 0 }, team2Score: { type: Number, default: 0 }, team2Wickets: { type: Number, default: 0 }, team2Overs: { type: Number, default: 0 }, winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, winnerName: String, resultSummary: String, playerOfMatch: String, scorerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, streamUrl: { type: String, default: '' }, strikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, nonStrikerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' }, currentBowlerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' } }, { timestamps: true });
MatchSchema.index({ tournamentId: 1, status: 1 }); MatchSchema.index({ status: 1, date: -1 });

function formatOvers(completedOvers: number, ballsInOver: number): string { return `${completedOvers}.${ballsInOver}`; }
function calcRunRate(score: number, overs: number, balls: number): number { const totalOvers = overs + balls / 6; return totalOvers > 0 ? parseFloat((score / totalOvers).toFixed(2)) : 0; }
function calcRequiredRunRate(required: number, remainingOvers: number, remainingBalls: number): number { const total = remainingOvers + remainingBalls / 6; return total > 0 ? parseFloat((required / total).toFixed(2)) : 0; }

MatchSchema.methods.startMatch = async function(data: StartMatchData): Promise<void> {
  this.tossWinner = new mongoose.Types.ObjectId(data.tossWinnerId); this.tossWinnerName = data.tossWinnerName; this.tossDecision = data.tossDecision; this.status = MatchStatus.LIVE;
  // maxOvers was set correctly at match creation — do NOT override it here
  this.innings = [{
    teamId: new mongoose.Types.ObjectId(data.battingTeamId), teamName: data.battingTeamName, status: 'in_progress', score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: [
      { playerId: data.strikerId ? new mongoose.Types.ObjectId(data.strikerId) : undefined, name: data.striker, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isStriker: true,  enteredAt: 0 },
      { playerId: data.nonStrikerId ? new mongoose.Types.ObjectId(data.nonStrikerId) : undefined, name: data.nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isStriker: false, enteredAt: 0 },
    ],
    bowlers: [{ playerId: data.bowlerId ? new mongoose.Types.ObjectId(data.bowlerId) : undefined, name: data.bowler, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 }],
    fallOfWickets: [], ballHistory: []
  }];
  this.currentInnings = 1;
  this.strikerName = data.striker; this.nonStrikerName = data.nonStriker; this.currentBowlerName = data.bowler;
  this.strikerId    = data.strikerId    ? new mongoose.Types.ObjectId(data.strikerId)    : undefined;
  this.nonStrikerId = data.nonStrikerId ? new mongoose.Types.ObjectId(data.nonStrikerId) : undefined;
  this.currentBowlerId = data.bowlerId  ? new mongoose.Types.ObjectId(data.bowlerId)     : undefined;
  await this.save();
};

// ── ID-first lookup helpers ───────────────────────────────────────────────
// Always try playerId first; fall back to name so old data still works.
function findBatsman(batsmen: IBatsman[], id: mongoose.Types.ObjectId | undefined, name: string): IBatsman | undefined {
  if (id) {
    const byId = batsmen.find(b => b.playerId && b.playerId.equals(id) && !b.isOut);
    if (byId) return byId;
  }
  return batsmen.find(b => b.name === name && !b.isOut);
}
function findBatsmanAny(batsmen: IBatsman[], id: mongoose.Types.ObjectId | undefined, name: string): IBatsman | undefined {
  // Like findBatsman but includes out batsmen (needed for undo)
  if (id) {
    const byId = batsmen.find(b => b.playerId && b.playerId.equals(id));
    if (byId) return byId;
  }
  return batsmen.find(b => b.name === name);
}
function findBowler(bowlers: IBowler[], id: mongoose.Types.ObjectId | undefined, name: string): IBowler | undefined {
  if (id) {
    // When an ID is supplied, match ONLY by ID — never fall back to name.
    // This prevents two players who share the same name from being merged.
    return bowlers.find(b => b.playerId && b.playerId.equals(id));
  }
  // No ID supplied (legacy data) — fall back to name
  return bowlers.find(b => b.name === name);
}

MatchSchema.methods.addBall = async function(data: AddBallData): Promise<ScoreUpdateResult> {
  const innings = this.innings[this.currentInnings - 1];
  if (!innings || innings.status !== 'in_progress') throw new Error('No active innings');

  if (data.retired || data.penalty) {
    if (data.retired) {
      const outBatsman = innings.batsmen.find((b: IBatsman) => b.name === data.outBatsmanName && !b.isOut);
      if (outBatsman) {
        // Retired hurt: mark as isOut with retired_hurt outType but do NOT count as a batting wicket
        // (overlay-utils displays retired_hurt as not_out; player can return if needed)
        outBatsman.isOut = true; outBatsman.outType = 'retired_hurt'; outBatsman.isStriker = false;
        // Note: we do NOT increment innings.wickets — retired hurt is not a dismissal wicket
      }
    }
    if (data.penalty) { innings.score += data.penalty; innings.extras.total += data.penalty; }
    this._updateSummary(innings); this.markModified('innings'); await this.save();
    // Find the exact runs the striker has right now
  const currentStriker = findBatsman(innings.batsmen, this.strikerId, this.strikerName);

  const totalFours = innings.batsmen.reduce((sum, b) => sum + (b.fours || 0), 0);
  const totalSixes = innings.batsmen.reduce((sum, b) => sum + (b.sixes || 0), 0);

  return { 
    outType: data.retired ? 'retired_hurt' : '',
    score: innings.score, wickets: innings.wickets, overs: formatOvers(innings.overs, innings.balls % 6), 
    runRate: innings.runRate, requiredRuns: innings.requiredRuns, requiredRunRate: innings.requiredRunRate, 
    targetScore: innings.targetScore, ballDescription: data.retired ? `Retired Hurt (${data.outBatsmanName})` : `+${data.penalty} Penalty`, 
    overChanged: false, inningsEnded: innings.wickets >= innings._wicketLimit, matchEnded: false, needPlayerSelection: !!data.retired,
    isFour: false, isSix: false, isWicket: false, outBatsmanName: data.retired ? data.outBatsmanName : undefined,
    completedOverNumber: undefined, strikerMatchRuns: currentStriker ? currentStriker.runs : 0, strikerMatchBalls: currentStriker ? currentStriker.balls : 0,
    totalFours,
    totalSixes
  };
  }

  const runs = data.runs || 0; const isWide = data.wide || false; const isNoBall = data.noBall || false; const byeRuns = data.bye || 0; const legByeRuns = data.legBye || 0; const isWicket = data.wicket || false;
  const strikerIdx = innings.batsmen.findIndex((b: IBatsman) => b.isStriker && !b.isOut);
  // Find bowler by ID first (handles duplicate names), then fall back to name
  const bowlerIdxById = this.currentBowlerId
    ? innings.bowlers.findIndex((b: IBowler) => b.playerId && b.playerId.equals(this.currentBowlerId!))
    : -1;
  const bowlerIdx = bowlerIdxById >= 0 ? bowlerIdxById
    : innings.bowlers.findIndex((b: IBowler) => b.name === this.currentBowlerName);
  if (strikerIdx === -1) throw new Error('No striker found');
  const striker = innings.batsmen[strikerIdx]; const bowler = bowlerIdx >= 0 ? innings.bowlers[bowlerIdx] : null;

  let isLegalDelivery = !isWide && !isNoBall; let extrasRuns = 0; let ballDesc = '';
  const historyEntry = {
    over: innings.overs, ball: innings.balls % 6, runs,
    extras: isWide ? 'wide' : isNoBall ? 'nb' : byeRuns > 0 ? 'bye' : legByeRuns > 0 ? 'lb' : '',
    wicket: isWicket, outType: data.outType || '',
    outBatsmanName: data.outBatsmanName || (isWicket ? striker.name : ''),
    batsmanName: striker.name,
    bowlerName: this.currentBowlerName,
    totalBefore: innings.score, wicketsBefore: innings.wickets,
    // Snapshot positions BEFORE this ball so undo can restore exactly
    strikerBefore: this.strikerName, nonStrikerBefore: this.nonStrikerName, bowlerBefore: this.currentBowlerName,
    // ID snapshots — used by undo to find the right player even if two players share a name
    batsmanPlayerId:  striker.playerId ? striker.playerId.toString() : undefined,
    bowlerPlayerId:   this.currentBowlerId ? this.currentBowlerId.toString() : undefined,
    outPlayerId:      isWicket && striker.playerId ? striker.playerId.toString() : undefined,
    strikerIdBefore:  this.strikerId   ? this.strikerId.toString()   : undefined,
    nonStrikerIdBefore: this.nonStrikerId ? this.nonStrikerId.toString() : undefined,
    // Exact runs charged to the bowler for this delivery (includes wide/nb penalty).
    // Populated AFTER scoring logic runs — see the line below after push.
    bowlerRunsCharged: 0,
  };
  innings.ballHistory.push(historyEntry);

  if (isWide) { const widePenalty = data.noPenalty ? 0 : 1; extrasRuns = widePenalty + runs + byeRuns + legByeRuns; innings.extras.wides += 1; innings.extras.total += extrasRuns; innings.score += extrasRuns; if (bowler) { bowler.runs += extrasRuns; bowler.wides += 1; } historyEntry.bowlerRunsCharged = extrasRuns; ballDesc = `Wide${runs > 0 ? `+${runs}` : ''}${widePenalty === 0 ? ' (no penalty)' : ''}`; isLegalDelivery = false;
  } else if (isNoBall) { const nbPenalty = data.noPenalty ? 0 : 1; extrasRuns = nbPenalty; innings.extras.noBalls += 1; innings.extras.total += nbPenalty + runs + byeRuns + legByeRuns; innings.score += nbPenalty + runs + byeRuns + legByeRuns; if (bowler) { bowler.runs += nbPenalty + runs; bowler.noBalls += 1; } historyEntry.bowlerRunsCharged = nbPenalty + runs; if (runs > 0) { striker.runs += runs; if (runs === 4) striker.fours += 1; if (runs === 6) striker.sixes += 1; } striker.strikeRate = striker.balls > 0 ? parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)) : 0; ballDesc = `NB${runs > 0 ? `+${runs}` : ''}${nbPenalty === 0 ? ' (no penalty)' : ''}`; isLegalDelivery = false; 
  } else if (byeRuns > 0) { extrasRuns = byeRuns; innings.extras.byes += byeRuns; innings.extras.total += byeRuns; innings.score += byeRuns; striker.balls += 1; if (bowler) bowler.balls += 1; ballDesc = `B${byeRuns}`;
  } else if (legByeRuns > 0) { extrasRuns = legByeRuns; innings.extras.legByes += legByeRuns; innings.extras.total += legByeRuns; innings.score += legByeRuns; striker.balls += 1; if (bowler) bowler.balls += 1; ballDesc = `LB${legByeRuns}`;
  } else { innings.score += runs; striker.runs += runs; striker.balls += 1; if (runs === 4) striker.fours += 1; if (runs === 6) striker.sixes += 1; striker.strikeRate = parseFloat(((striker.runs / striker.balls) * 100).toFixed(1)); if (bowler) { bowler.runs += runs; bowler.balls += 1; } historyEntry.bowlerRunsCharged = runs; ballDesc = runs === 0 ? '•' : String(runs); }

  let needPlayerSelection = false;
  if (isWicket) {
    innings.wickets += 1;
    const outBatsman = data.outBatsmanName ? innings.batsmen.find((b: IBatsman) => b.name === data.outBatsmanName && !b.isOut) ?? striker : striker;
    if (outBatsman) {
      outBatsman.isOut = true; outBatsman.outType = data.outType || 'bowled'; outBatsman.outTo = this.currentBowlerName; outBatsman.outFielder = data.outFielder; 
      innings.fallOfWickets.push({ wicket: innings.wickets, score: innings.score, overs: formatOvers(innings.overs, innings.balls % 6), batsman: outBatsman.name, bowler: this.currentBowlerName });
      if (bowler && data.outType !== 'run_out') bowler.wickets += 1;
    }
    ballDesc += ' W';
    // Count how many non-retired-out dismissed batsmen there are. If there
    // are still un-dismissed players who haven't batted yet, selection is needed.
    // We use wickets < (total players - 1) to guard the last man standing case.
    // If the innings has reached all-out we do NOT prompt for player selection.
    const totalBatsmen = innings.batsmen.length; // batsmen entered so far
    const dismissedCount = innings.batsmen.filter((b: IBatsman) => b.isOut && b.outType !== 'retired_hurt' && b.outType !== 'retired').length;
    // needPlayerSelection only if at least one replacement can come in
    needPlayerSelection = innings.wickets < 10;
  }

  let overChanged = false;
  if (isLegalDelivery) {
    innings.balls += 1;
    if (innings.balls % 6 === 0) {
      innings.overs = Math.floor(innings.balls / 6); overChanged = true;
      if (bowler) { bowler.overs = Math.floor(bowler.balls / 6); bowler.economy = bowler.overs > 0 ? parseFloat((bowler.runs / bowler.overs).toFixed(2)) : 0; }
      needPlayerSelection = true;
    }
  }

  const runsForRotation = isWide ? runs : (byeRuns || legByeRuns || runs);
  
  if (runsForRotation % 2 === 1) {
    const p1 = findBatsman(innings.batsmen, this.strikerId, this.strikerName);
    const p2 = findBatsman(innings.batsmen, this.nonStrikerId, this.nonStrikerName);
    if (p1 && p2) {
      p1.isStriker = false; p2.isStriker = true;
      this.strikerName = p2.name; this.nonStrikerName = p1.name;
      this.strikerId = p2.playerId; this.nonStrikerId = p1.playerId;
    }
  }

  if (overChanged) {
    const p1 = findBatsman(innings.batsmen, this.strikerId, this.strikerName);
    const p2 = findBatsman(innings.batsmen, this.nonStrikerId, this.nonStrikerName);
    if (p1 && p2) {
      p1.isStriker = false; p2.isStriker = true;
      this.strikerName = p2.name; this.nonStrikerName = p1.name;
      this.strikerId = p2.playerId; this.nonStrikerId = p1.playerId;
    }
  }

  innings.runRate = calcRunRate(innings.score, innings.overs, innings.balls % 6);
  if (this.currentInnings === 2 && innings.targetScore) {
    innings.requiredRuns = innings.targetScore - innings.score;
    const remainingLegalBalls = (this.maxOvers * 6) - innings.balls;
    innings.requiredRunRate = innings.requiredRuns > 0 ? calcRequiredRunRate(innings.requiredRuns, Math.floor(remainingLegalBalls / 6), remainingLegalBalls % 6) : 0;
  }

  this._updateSummary(innings);
  let inningsEnded = false; let matchEnded = false;
  const chaseComplete = this.currentInnings === 2 && innings.targetScore && innings.score >= innings.targetScore;
  
  // End innings when: all batsmen out (limit set from squad size at innings start, max 10),
  // overs used up, or chase complete.
  if (innings.wickets >= innings._wicketLimit || innings.balls >= (this.maxOvers * 6) || chaseComplete) {
    innings.status = 'completed'; inningsEnded = true;
    if (this.currentInnings === 2 || chaseComplete) {
        matchEnded = true;
        this.status = MatchStatus.COMPLETED;
        // Calculate and store result summary automatically
        const inn1 = this.innings[0];
        const inn2 = this.innings[this.currentInnings - 1];
        const inn1Score = inn1?.score || 0;
        const inn2Score = inn2?.score || 0;
        const inn2Wickets = inn2?.wickets || 0;
        const battingTeamName = inn2?.teamName || this.team2Name;
        const bowlingTeamName = inn1?.teamName || this.team1Name;
        if (chaseComplete) {
            // Team 2 wins by wickets remaining
            const wicketsLeft = 10 - inn2Wickets;
            const winnerName = battingTeamName;
            this.winnerName = winnerName;
            this.resultSummary = `${winnerName} won by ${wicketsLeft} wicket${wicketsLeft !== 1 ? 's' : ''}`;
        } else if (inn1Score > inn2Score) {
            // Team 1 wins by runs
            const winnerName = bowlingTeamName;
            this.winnerName = winnerName;
            this.resultSummary = `${winnerName} won by ${inn1Score - inn2Score} run${(inn1Score - inn2Score) !== 1 ? 's' : ''}`;
        } else if (inn2Score > inn1Score) {
            // Team 2 wins (all out but scored more — unusual but possible)
            const winnerName = battingTeamName;
            this.winnerName = winnerName;
            this.resultSummary = `${winnerName} won by ${inn2Score - inn1Score} run${(inn2Score - inn1Score) !== 1 ? 's' : ''}`;
        } else {
            this.winnerName = 'TIED';
            this.resultSummary = 'Match Tied';
        }
    }
    
    // --- BUG FIX: AUTO CREATE 2ND INNINGS TO UNFREEZE OVERLAYS ---
    if (inningsEnded && !matchEnded && this.currentInnings === 1) {
        const firstBattingTeamId = innings.teamId.toString();
        const t1Id = this.team1._id ? this.team1._id.toString() : this.team1.toString();
        const t2Id = this.team2._id ? this.team2._id.toString() : this.team2.toString();
        const secondBattingTeamId = firstBattingTeamId === t1Id ? t2Id : t1Id;
        const secondBattingTeamName = firstBattingTeamId === t1Id ? this.team2Name : this.team1Name;
        const target = innings.score + 1;
        
        this.innings.push({
            teamId: new mongoose.Types.ObjectId(secondBattingTeamId), teamName: secondBattingTeamName, status: 'in_progress',
            score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0, targetScore: target, requiredRuns: target, requiredRunRate: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }, batsmen: [], bowlers: [], fallOfWickets: [], ballHistory: [],
            _wicketLimit: Math.min(10, Math.max(2, (this.innings[0]?.batsmen?.length || 11) - 1))
        } as any);
        this.currentInnings = 2;
        this.strikerName = '';
        this.nonStrikerName = '';
        this.currentBowlerName = '';
    }
  }

  this.markModified('innings');
  await this.save();
  const currentStriker = findBatsman(innings.batsmen, this.strikerId, this.strikerName);

  const totalFours = innings.batsmen.reduce((sum, b) => sum + (b.fours || 0), 0);
  const totalSixes = innings.batsmen.reduce((sum, b) => sum + (b.sixes || 0), 0);

  return { 
    outType: isWicket ? (data.outType || '') : '',
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
    needPlayerSelection: needPlayerSelection && !matchEnded,
    // --- NEW TRIGGER DATA ---
    isFour: runs === 4 && (isLegalDelivery || isWide || isNoBall),
    isSix: runs === 6 && (isLegalDelivery || isWide || isNoBall),
    isWicket: isWicket,
    outBatsmanName: isWicket ? (data.outBatsmanName || striker.name) : undefined,
    completedOverNumber: overChanged ? innings.overs : undefined,
    strikerMatchRuns: currentStriker ? currentStriker.runs : 0,
    strikerMatchBalls: currentStriker ? currentStriker.balls : 0,
    totalFours,
    totalSixes
  };

};

MatchSchema.methods._updateSummary = function(innings: IInnings) {
  if (this.currentInnings === 1) {
    if (innings.teamId.toString() === this.team1.toString()) { this.team1Score = innings.score; this.team1Wickets = innings.wickets; this.team1Overs = innings.overs + (innings.balls % 6) / 10; } 
    else { this.team2Score = innings.score; this.team2Wickets = innings.wickets; this.team2Overs = innings.overs + (innings.balls % 6) / 10; }
  } else {
    if (innings.teamId.toString() === this.team1.toString()) { this.team1Score = innings.score; this.team1Wickets = innings.wickets; this.team1Overs = innings.overs + (innings.balls % 6) / 10; } 
    else { this.team2Score = innings.score; this.team2Wickets = innings.wickets; this.team2Overs = innings.overs + (innings.balls % 6) / 10; }
  }
};

MatchSchema.methods.endInnings = async function(): Promise<void> {
  const innings = this.innings[this.currentInnings - 1];
  if (innings) innings.status = 'completed';
  if (this.currentInnings === 1) {
    const firstBattingTeamId = innings?.teamId?.toString();
    const t1Id = this.team1._id ? this.team1._id.toString() : this.team1.toString();
    const t2Id = this.team2._id ? this.team2._id.toString() : this.team2.toString();
    const secondBattingTeamId = firstBattingTeamId === t1Id ? t2Id : t1Id;
    const secondBattingTeamName = firstBattingTeamId === t1Id ? this.team2Name : this.team1Name;
    const target = (innings?.score || 0) + 1;
    this.innings.push({
      teamId: new mongoose.Types.ObjectId(secondBattingTeamId), teamName: secondBattingTeamName, status: 'in_progress',
      score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0, targetScore: target, requiredRuns: target, requiredRunRate: 0,
      extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 }, batsmen: [], bowlers: [], fallOfWickets: [], ballHistory: [],
      _wicketLimit: Math.min(10, Math.max(2, (this.innings[0]?.batsmen?.length || 11) - 1))
    } as any);
    this.currentInnings = 2; this.strikerName = ''; this.nonStrikerName = ''; this.currentBowlerName = '';
  }
  await this.save();
};

MatchSchema.methods.endMatch = async function(winnerId?: string, winnerName?: string, resultSummary?: string): Promise<void> {
  this.status = MatchStatus.COMPLETED;
  if (winnerId) this.winner = new mongoose.Types.ObjectId(winnerId);
  if (winnerName) this.winnerName = winnerName;
  if (resultSummary) this.resultSummary = resultSummary;
  const innings = this.innings[this.currentInnings - 1];
  if (innings) innings.status = 'completed';
  await this.save();
};

MatchSchema.methods.undoLastBall = async function(): Promise<void> {
  const innings = this.innings[this.currentInnings - 1];
  if (!innings || !innings.ballHistory || innings.ballHistory.length === 0) throw new Error('Nothing to undo');
  const last = innings.ballHistory.pop();
  if (!last) throw new Error('No history to undo');

  // Restore score and wickets to exactly what they were before this ball
  innings.score = last.totalBefore;
  innings.wickets = last.wicketsBefore;

  // Restore ball count (wides and no-balls don't count as legal deliveries)
  if (last.extras !== 'wide' && last.extras !== 'nb') {
    if (innings.balls > 0) innings.balls -= 1;
  }
  innings.overs = Math.floor(innings.balls / 6);

  // Restore dismissed batsman to active (wicket or retired hurt)
  if (last.wicket || last.outType === 'retired_hurt') {
    if (last.wicket) innings.fallOfWickets.pop();
    const outName = last.outBatsmanName || last.batsmanName;
    const outBatsman = innings.batsmen.find((b: IBatsman) =>
      (last.outPlayerId && b.playerId && b.playerId.toString() === last.outPlayerId)
        ? b.isOut
        : b.name === outName && b.isOut
    );
    if (outBatsman) {
      outBatsman.isOut = false;
      outBatsman.outType = undefined;
      outBatsman.outTo = undefined;
      outBatsman.outFielder = undefined;
    }
  }

  // Restore batsman stats
  const batsman = innings.batsmen.find((b: IBatsman) => last.batsmanPlayerId && b.playerId ? b.playerId.toString() === last.batsmanPlayerId : b.name === last.batsmanName);
  if (batsman && last.extras !== 'wide') {
    if (batsman.balls > 0) batsman.balls -= 1;
    batsman.runs -= last.runs;
    if (last.runs === 4 && batsman.fours > 0) batsman.fours -= 1;
    if (last.runs === 6 && batsman.sixes > 0) batsman.sixes -= 1;
    batsman.strikeRate = batsman.balls > 0 ? parseFloat(((batsman.runs / batsman.balls) * 100).toFixed(1)) : 0;
  }

  // Restore bowler stats — find by ID first to avoid merging duplicate-name bowlers
  const bowler = innings.bowlers.find((b: IBowler) =>
    last.bowlerPlayerId && b.playerId
      ? b.playerId.toString() === last.bowlerPlayerId
      : b.name === last.bowlerName
  );
  if (bowler) {
    // Reverse runs: use the exact amount charged to the bowler (includes wide/nb penalty)
    const runsToReverse = typeof last.bowlerRunsCharged === 'number' ? last.bowlerRunsCharged : last.runs;
    bowler.runs = Math.max(0, bowler.runs - runsToReverse);
    if (last.extras === 'wide') {
      if (bowler.wides > 0) bowler.wides -= 1;
    } else if (last.extras === 'nb') {
      if (bowler.noBalls > 0) bowler.noBalls -= 1;
      if (bowler.balls > 0) bowler.balls -= 1; // nb counts as a delivery for bowler balls
      bowler.overs = Math.floor(bowler.balls / 6);
    } else {
      if (bowler.balls > 0) bowler.balls -= 1;
      bowler.overs = Math.floor(bowler.balls / 6);
    }
    if (last.wicket && bowler.wickets > 0) bowler.wickets -= 1;
    bowler.economy = bowler.overs > 0 ? parseFloat((bowler.runs / bowler.overs).toFixed(2)) : 0;
  }

  // Restore extras
  if (last.extras === 'wide' && innings.extras.wides > 0) innings.extras.wides -= 1;
  if (last.extras === 'nb' && innings.extras.noBalls > 0) innings.extras.noBalls -= 1;
  if (last.extras === 'bye' && innings.extras.byes > 0) innings.extras.byes -= last.runs;
  if (last.extras === 'lb' && innings.extras.legByes > 0) innings.extras.legByes -= last.runs;
  innings.extras.total = innings.extras.wides + innings.extras.noBalls + innings.extras.byes + innings.extras.legByes;

  // ── CRITICAL: restore striker/nonStriker/bowler to their state BEFORE this ball ──
  if (last.strikerBefore) {
    this.strikerName = last.strikerBefore;
    this.nonStrikerName = last.nonStrikerBefore || '';
  }
  // Restore player IDs so ID-based lookups (bowler duplicate-name fix) stay correct
  if (last.strikerIdBefore)    this.strikerId    = new mongoose.Types.ObjectId(last.strikerIdBefore);
  if (last.nonStrikerIdBefore) this.nonStrikerId = new mongoose.Types.ObjectId(last.nonStrikerIdBefore);
  if (last.bowlerBefore) {
    this.currentBowlerName = last.bowlerBefore;
  }
  // Restore bowler ID — critical when two bowlers share the same name
  if (last.bowlerPlayerId) {
    this.currentBowlerId = new mongoose.Types.ObjectId(last.bowlerPlayerId);
  }

  // Sync isStriker flags on batsmen array to match restored names
  innings.batsmen.forEach((b: IBatsman) => {
    b.isStriker = this.strikerId && b.playerId
      ? b.playerId.equals(this.strikerId)
      : b.name === this.strikerName;
  });

  innings.runRate = calcRunRate(innings.score, innings.overs, innings.balls % 6);
  this._updateSummary(innings);
  this.markModified('innings');
  await this.save();
};

MatchSchema.methods.selectPlayers = async function(data: SelectPlayersData): Promise<void> {
  const innings = this.innings[this.currentInnings - 1];
  if (!innings) throw new Error('No active innings');

  const sid   = data.strikerId    ? new mongoose.Types.ObjectId(data.strikerId)    : undefined;
  const nsid  = data.nonStrikerId ? new mongoose.Types.ObjectId(data.nonStrikerId) : undefined;
  const bowid = data.bowlerId     ? new mongoose.Types.ObjectId(data.bowlerId)      : undefined;

  if (data.striker) {
    this.strikerName = data.striker;
    this.strikerId   = sid;
    // Find by ID first, then fall back to name
    const existing = findBatsmanAny(innings.batsmen, sid, data.striker);
    if (!existing) {
      innings.batsmen.push({ playerId: sid, name: data.striker, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isStriker: true, enteredAt: innings.balls });
    } else {
      existing.isStriker = true;
      // Sync name in case it somehow drifted
      if (sid) existing.playerId = sid;
      // Only restore if retired hurt — dismissed players stay dismissed
      if (existing.outType === 'retired_hurt' || existing.outType === 'retired') { existing.isOut = false; existing.outType = undefined; }
    }
  }

  if (data.nonStriker) {
    this.nonStrikerName = data.nonStriker;
    this.nonStrikerId   = nsid;
    const existing = findBatsmanAny(innings.batsmen, nsid, data.nonStriker);
    if (!existing) {
      innings.batsmen.push({ playerId: nsid, name: data.nonStriker, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, isOut: false, isStriker: false, enteredAt: innings.balls });
    } else {
      existing.isStriker = false;
      if (nsid) existing.playerId = nsid;
      if (existing.outType === 'retired_hurt' || existing.outType === 'retired') { existing.isOut = false; existing.outType = undefined; }
    }
  }

  // Sync isStriker flags — use ID where available
  innings.batsmen.forEach((b: IBatsman) => {
    if (sid && b.playerId) {
      b.isStriker = b.playerId.equals(sid);
    } else {
      b.isStriker = b.name === this.strikerName;
    }
  });

  if (data.bowler) {
    this.currentBowlerName = data.bowler;
    this.currentBowlerId   = bowid;
    const existing = findBowler(innings.bowlers, bowid, data.bowler);
    if (!existing) {
      innings.bowlers.push({ playerId: bowid, name: data.bowler, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 });
    } else {
      if (bowid) existing.playerId = bowid;
    }
  }

  this.markModified('innings');
  await this.save();
};

MatchSchema.methods.getOverSummary = function(): string {
  const innings = this.innings[this.currentInnings - 1];
  if (!innings || innings.ballHistory.length === 0) return '';
  const ballsInOver = innings.balls % 6;
  return innings.ballHistory.slice(-ballsInOver).map((b: any) => {
    if (b.wicket) return 'W'; if (b.extras === 'wide') return 'Wd'; if (b.extras === 'nb') return 'Nb';
    if (b.extras === 'bye') return `B${b.runs}`; if (b.extras === 'lb') return `Lb${b.runs}`; return String(b.runs || '•');
  }).join(' ');
};

export default mongoose.model<IMatch>('Match', MatchSchema);