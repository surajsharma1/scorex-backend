/**
 * Match Model — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. addBall always wrote to innings[0] — now uses currentInnings index
 * 2. calculateRequiredRunRate hardcoded 120 balls — now format-aware
 * 3. endInnings checked wrong condition (currentInnings===2 before it was set)
 * 4. legByes typed as boolean but used as number — fixed to number
 * 5. calculateRunRate also used innings[0] — fixed to current innings
 * 6. team1Name missing from IMatch interface — added
 * 7. No bowler stats update in addBall — added
 */

import mongoose, { Document, Schema } from 'mongoose';

export type OutType =
  | 'caught' | 'bowled' | 'lbw' | 'run out' | 'stumped'
  | 'hit wicket' | 'obstructing the field' | 'timed out' | 'handled the ball';

export type MatchStatus = 'upcoming' | 'live' | 'completed' | 'cancelled';
export type MatchFormat = 'T10' | 'T20' | 'ODI' | 'Test';
export type InningsStatus = 'pending' | 'in_progress' | 'completed';

export interface IBatsman {
  playerId: mongoose.Types.ObjectId;
  runs: number; balls: number; fours: number; sixes: number;
  isOut: boolean; outType?: OutType;
  outBy?: mongoose.Types.ObjectId; outAtBalls?: number;
}

export interface IBowler {
  playerId: mongoose.Types.ObjectId;
  overs: number; maidens: number; runsConceded: number;
  wickets: number; wides: number; noBalls: number;
}

export interface IExtras { wides: number; noBalls: number; byes: number; legByes: number; total: number; }

export interface IInnings {
  teamId: mongoose.Types.ObjectId;
  status: InningsStatus;
  score: number; wickets: number; overs: number; balls: number; runRate: number;
  requiredRuns?: number; requiredRunRate?: number; targetScore?: number;
  extras: IExtras;
  batsmen: IBatsman[]; bowlers: IBowler[];
  fallOfWickets: { wicket: number; score: number; overs: number; playerId: mongoose.Types.ObjectId; }[];
  powerPlay?: { start: number; end: number; runs: number; wickets: number; };
}

export interface IMatch extends Document {
  name: string;
  team1Name?: string;   // FIX: was missing from interface
  team2Name?: string;
  tournamentId?: mongoose.Types.ObjectId;
  round?: string; matchNumber?: number;
  team1: mongoose.Types.ObjectId; team2: mongoose.Types.ObjectId;
  venue: string; date: Date; time?: string;
  format: MatchFormat; status: MatchStatus;
  tossWinner?: mongoose.Types.ObjectId; tossDecision?: 'bat' | 'bowl';
  innings: IInnings[]; currentInnings: number;
  team1Score: number; team1Wickets: number; team1Overs: number;
  team2Score: number; team2Wickets: number; team2Overs: number;
  winner?: mongoose.Types.ObjectId; resultType?: 'win' | 'draw' | 'tie' | 'no result';
  margin?: string; playerOfMatch?: mongoose.Types.ObjectId;
  currentOver: number; currentBall: number;
  lastBowler?: mongoose.Types.ObjectId; striker?: mongoose.Types.ObjectId; nonStriker?: mongoose.Types.ObjectId;
  overHistory: any[];
  streamUrl?: string; streamEmbedUrl?: string;
  overlayId?: mongoose.Types.ObjectId; overlayUrl?: string;
  scorerId?: mongoose.Types.ObjectId; notes?: string;
  createdAt: Date; updatedAt: Date;
  getMaxBalls(): number;
  startMatch(tossWinnerId: mongoose.Types.ObjectId, decision: 'bat' | 'bowl'): Promise<void>;
  addBall(ballData: {
    runs: number; isWide?: boolean; isNoBall?: boolean; isWicket?: boolean;
    outType?: OutType; byes?: number; legByes?: number; // FIX: was boolean
  }): Promise<IMatch>;
  calculateRunRate(): number;
  calculateRequiredRunRate(): number | null;
  endInnings(): Promise<void>;
  endMatch(winnerId?: mongoose.Types.ObjectId, resultType?: string): Promise<void>;
  getScoreDisplay(): string;
}

const ExtrasSchema = new Schema({ wides: { type: Number, default: 0 }, noBalls: { type: Number, default: 0 }, byes: { type: Number, default: 0 }, legByes: { type: Number, default: 0 }, total: { type: Number, default: 0 } }, { _id: false });
const BatsmanSchema = new Schema({ playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true }, runs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, fours: { type: Number, default: 0 }, sixes: { type: Number, default: 0 }, isOut: { type: Boolean, default: false }, outType: String, outBy: { type: Schema.Types.ObjectId, ref: 'Player' }, outAtBalls: Number }, { _id: false });
const BowlerSchema = new Schema({ playerId: { type: Schema.Types.ObjectId, ref: 'Player', required: true }, overs: { type: Number, default: 0 }, maidens: { type: Number, default: 0 }, runsConceded: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, wides: { type: Number, default: 0 }, noBalls: { type: Number, default: 0 } }, { _id: false });
const InningsSchema = new Schema({ teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true }, status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' }, score: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, overs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, runRate: { type: Number, default: 0 }, requiredRuns: Number, requiredRunRate: Number, targetScore: Number, extras: { type: ExtrasSchema, default: () => ({}) }, batsmen: [BatsmanSchema], bowlers: [BowlerSchema], fallOfWickets: [{ wicket: Number, score: Number, overs: Number, playerId: { type: Schema.Types.ObjectId, ref: 'Player' } }], powerPlay: { start: Number, end: Number, runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } } }, { _id: false });

const MatchSchema: Schema = new Schema({
  name: { type: String, trim: true },
  team1Name: { type: String, trim: true },
  team2Name: { type: String, trim: true },
  tournamentId: { type: Schema.Types.ObjectId, ref: 'Tournament' },
  round: String, matchNumber: Number,
  team1: { type: Schema.Types.ObjectId, ref: 'Team', required: [true, 'Team 1 is required'] },
  team2: { type: Schema.Types.ObjectId, ref: 'Team', required: [true, 'Team 2 is required'] },
  venue: { type: String, trim: true, default: 'TBD' },
  date: { type: Date, required: [true, 'Match date is required'] },
  time: String,
  format: { type: String, enum: ['T10', 'T20', 'ODI', 'Test'], default: 'T20' },
  status: { type: String, enum: ['upcoming', 'live', 'completed', 'cancelled'], default: 'upcoming' },
  tossWinner: { type: Schema.Types.ObjectId, ref: 'Team' },
  tossDecision: { type: String, enum: ['bat', 'bowl'] },
  innings: [InningsSchema],
  currentInnings: { type: Number, default: 1 },
  team1Score: { type: Number, default: 0 }, team1Wickets: { type: Number, default: 0 }, team1Overs: { type: Number, default: 0 },
  team2Score: { type: Number, default: 0 }, team2Wickets: { type: Number, default: 0 }, team2Overs: { type: Number, default: 0 },
  winner: { type: Schema.Types.ObjectId, ref: 'Team' },
  resultType: { type: String, enum: ['win', 'draw', 'tie', 'no result'] },
  margin: String, playerOfMatch: { type: Schema.Types.ObjectId, ref: 'Player' },
  currentOver: { type: Number, default: 0 }, currentBall: { type: Number, default: 0 },
  lastBowler: { type: Schema.Types.ObjectId, ref: 'Player' },
  striker: { type: Schema.Types.ObjectId, ref: 'Player' },
  nonStriker: { type: Schema.Types.ObjectId, ref: 'Player' },
  overHistory: [{ overNumber: Number, bowlerId: { type: Schema.Types.ObjectId, ref: 'Player' }, runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 }, extras: { type: Number, default: 0 }, balls: [{ runs: Number, isWide: Boolean, isNoBall: Boolean, isWicket: Boolean, outType: String }] }],
  streamUrl: String, streamEmbedUrl: String,
  overlayId: { type: Schema.Types.ObjectId, ref: 'Overlay' }, overlayUrl: String,
  scorerId: { type: Schema.Types.ObjectId, ref: 'User' }, notes: String,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

MatchSchema.index({ tournamentId: 1 });
MatchSchema.index({ team1: 1, team2: 1 });
MatchSchema.index({ status: 1 });
MatchSchema.index({ date: 1 });

MatchSchema.virtual('title').get(function () {
  return this.name || `${this.team1Name || 'Team 1'} vs ${this.team2Name || 'Team 2'}`;
});
MatchSchema.virtual('isLive').get(function () { return this.status === 'live'; });

// FIX: helper to get max legal balls based on format — was hardcoded to 120 everywhere
MatchSchema.methods.getMaxBalls = function (): number {
  const map: Record<string, number> = { T10: 60, T20: 120, ODI: 300, Test: 9999 };
  return map[this.format as string] ?? 120;
};

MatchSchema.methods.startMatch = async function (tossWinnerId: mongoose.Types.ObjectId, decision: 'bat' | 'bowl') {
  this.tossWinner = tossWinnerId;
  this.tossDecision = decision;
  this.status = 'live';
  const battingTeamId = decision === 'bat'
    ? tossWinnerId
    : (tossWinnerId.toString() === this.team1.toString() ? this.team2 : this.team1);
  this.innings = [{
    teamId: battingTeamId, status: 'in_progress',
    score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0,
    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
    batsmen: [], bowlers: [], fallOfWickets: []
  }];
  this.currentInnings = 1;
  this.currentOver = 0;
  this.currentBall = 0;
  await this.save();
};

MatchSchema.methods.addBall = async function (ballData: {
  runs: number; isWide?: boolean; isNoBall?: boolean; isWicket?: boolean;
  outType?: OutType; byes?: number; legByes?: number;
}) {
  if (this.status !== 'live') throw new Error('Match is not live');

  // FIX #1: use currentInnings to pick correct innings, not always [0]
  const inningsIdx = (this.currentInnings || 1) - 1;
  const innings = this.innings[inningsIdx];
  if (!innings || innings.status === 'completed') throw new Error('Current innings not available');

  const { runs, isWide = false, isNoBall = false, isWicket = false, outType, byes = 0, legByes = 0 } = ballData;

  // Extras
  let totalExtras = 0;
  if (isWide)   { innings.extras.wides   += 1; totalExtras += 1 + (runs || 0); }
  if (isNoBall) { innings.extras.noBalls += 1; totalExtras += 1; }
  if (byes > 0)    { innings.extras.byes    += byes;    totalExtras += byes; }
  if (legByes > 0) { innings.extras.legByes += legByes; totalExtras += legByes; } // FIX #4: was += 1 on a boolean
  innings.extras.total += totalExtras;

  // Score
  const battingRuns = (!isWide && !isNoBall) ? runs : 0;
  innings.score += battingRuns + totalExtras;

  // Ball counter — wides don't count as legal deliveries
  if (!isWide) {
    innings.balls += 1;
    const completedOvers = Math.floor(innings.balls / 6);
    const ballInOver = innings.balls % 6;
    this.currentBall = ballInOver;
    this.currentOver = completedOvers;
    innings.overs = completedOvers + (ballInOver / 10);
  }

  // Striker stats
  if (this.striker && !isWide) {
    const bat = innings.batsmen.find((b: IBatsman) => b.playerId.toString() === this.striker?.toString());
    if (bat) {
      bat.runs += battingRuns; bat.balls += 1;
      if (battingRuns === 4 && !byes && !legByes) bat.fours += 1;
      if (battingRuns === 6 && !byes && !legByes) bat.sixes += 1;
    }
  }

  // Wicket
  if (isWicket && this.striker) {
    innings.wickets += 1;
    const bat = innings.batsmen.find((b: IBatsman) => b.playerId.toString() === this.striker?.toString());
    if (bat) { bat.isOut = true; bat.outType = outType; bat.outAtBalls = bat.balls; }
    innings.fallOfWickets.push({ wicket: innings.wickets, score: innings.score, overs: innings.overs, playerId: this.striker });
  }

  // Bowler stats
  if (this.lastBowler) {
    const bowl = innings.bowlers.find((b: IBowler) => b.playerId.toString() === this.lastBowler?.toString());
    if (bowl) {
      bowl.runsConceded += battingRuns + (isWide ? 1 : 0) + (isNoBall ? 1 : 0);
      if (isWide) bowl.wides += 1;
      if (isNoBall) bowl.noBalls += 1;
      if (isWicket && outType !== 'run out') bowl.wickets += 1;
      if (!isWide) {
        const totalBalls = Math.round(Math.floor(bowl.overs) * 6 + (bowl.overs % 1) * 10) + 1;
        bowl.overs = Math.floor(totalBalls / 6) + ((totalBalls % 6) / 10);
      }
    }
  }

  // FIX #5: calculateRunRate uses correct innings index now
  this.calculateRunRate();

  // Sync denormalised score fields
  if (innings.teamId.toString() === this.team1.toString()) {
    this.team1Score = innings.score; this.team1Wickets = innings.wickets; this.team1Overs = innings.overs;
  } else {
    this.team2Score = innings.score; this.team2Wickets = innings.wickets; this.team2Overs = innings.overs;
  }

  // Strike rotation on odd runs (legal delivery only)
  if (!isWide && !isWicket && runs % 2 === 1 && this.striker && this.nonStriker) {
    [this.striker, this.nonStriker] = [this.nonStriker, this.striker];
  }

  await this.save();
  return this;
};

// FIX #5: uses currentInnings, not always innings[0]
MatchSchema.methods.calculateRunRate = function (): number {
  const innings = this.innings[(this.currentInnings || 1) - 1];
  if (!innings || innings.balls === 0) return 0;
  innings.runRate = parseFloat((innings.score / (innings.balls / 6)).toFixed(2));
  return innings.runRate;
};

// FIX #2: format-aware max balls; FIX #5: correct innings index
MatchSchema.methods.calculateRequiredRunRate = function (): number | null {
  const innings = this.innings[(this.currentInnings || 1) - 1];
  if (!innings || !innings.targetScore) return null;
  const ballsRemaining = this.getMaxBalls() - innings.balls;
  if (ballsRemaining <= 0) return null;
  const runsNeeded = innings.targetScore - innings.score;
  if (runsNeeded <= 0) return 0;
  innings.requiredRuns = runsNeeded;
  innings.requiredRunRate = parseFloat(((runsNeeded * 6) / ballsRemaining).toFixed(2));
  return innings.requiredRunRate;
};

// FIX #3: check by innings array index, not by currentInnings value (which hadn't been updated yet)
MatchSchema.methods.endInnings = async function () {
  const inningsIdx = (this.currentInnings || 1) - 1;
  const innings = this.innings[inningsIdx];
  if (!innings) return;
  innings.status = 'completed';

  if (inningsIdx === 1) {
    // Second innings just ended — determine result
    const firstScore = this.innings[0]?.score ?? 0;
    if (innings.score >= firstScore) {
      this.winner = innings.teamId;
      this.resultType = 'win';
      this.margin = `${10 - innings.wickets} wickets`;
    } else {
      this.winner = innings.teamId.toString() === this.team1.toString() ? this.team2 : this.team1;
      this.resultType = 'win';
      this.margin = `${firstScore - innings.score} runs`;
    }
    await this.endMatch();
    return;
  }
  await this.save();
};

MatchSchema.methods.endMatch = async function (winnerId?: mongoose.Types.ObjectId, resultType?: string) {
  if (winnerId) { this.winner = winnerId; this.resultType = (resultType as any) || 'win'; }
  this.status = 'completed';
  this.innings?.forEach((inn: IInnings) => { inn.status = 'completed'; });
  await this.save();
};

MatchSchema.methods.getScoreDisplay = function (): string {
  const t1 = `${this.team1Score}/${this.team1Wickets} (${(this.team1Overs || 0).toFixed(1)})`;
  if (this.currentInnings === 1) return t1;
  return `${t1} vs ${this.team2Score}/${this.team2Wickets} (${(this.team2Overs || 0).toFixed(1)})`;
};

MatchSchema.statics.getLiveMatches = function () {
  return this.find({ status: 'live' }).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').populate('tournamentId', 'name');
};
MatchSchema.statics.getByTournament = function (tournamentId: mongoose.Types.ObjectId) {
  return this.find({ tournamentId }).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').sort({ matchNumber: 1 });
};
MatchSchema.statics.getByTeam = function (teamId: mongoose.Types.ObjectId) {
  return this.find({ $or: [{ team1: teamId }, { team2: teamId }] }).sort({ date: -1 });
};
MatchSchema.statics.getUpcoming = function (limit: number = 10) {
  return this.find({ status: 'upcoming', date: { $gte: new Date() } }).populate('team1', 'name shortName').populate('team2', 'name shortName').sort({ date: 1 }).limit(limit);
};

export default mongoose.model<IMatch>('Match', MatchSchema);
