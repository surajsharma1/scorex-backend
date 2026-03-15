/**
 * Tournament Model — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. generateKnockoutBracket set team1 & team2 both to teams[0] — now pairs correctly
 * 2. calculatePointsTable NRR used raw decimal overs as divisor — now converts to real overs
 * 3. matchesNoResult counter was never incremented — now handled properly
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

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
  name: string; description?: string; logo?: string; banner?: string;
  organizer: mongoose.Types.ObjectId;
  contactEmail?: string; contactPhone?: string;
  startDate: Date; endDate: Date; registrationDeadline?: Date;
  location: string; locationType: LocationType; address?: string;
  type: TournamentType; format: TournamentFormat;
  maxTeams: number; minTeams: number; overs?: number;
  rules?: string; prize?: string; entryFee?: number;
  status: TournamentStatus;
  teams: mongoose.Types.ObjectId[];
  waitingList: mongoose.Types.ObjectId[];
  matches: mongoose.Types.ObjectId[];
  bracketGenerated: boolean; bracketData?: any;
  pointsTable?: {
    teamId: mongoose.Types.ObjectId;
    matchesPlayed: number; matchesWon: number; matchesLost: number;
    matchesTied: number; matchesNoResult: number;
    points: number; netRunRate: number;
    forRuns: number; againstRuns: number; oversFaced: number; oversBowled: number;
  }[];
  winner?: mongoose.Types.ObjectId; runnerUp?: mongoose.Types.ObjectId; secondRunnerUp?: mongoose.Types.ObjectId;
  mvp?: mongoose.Types.ObjectId; orangeCap?: mongoose.Types.ObjectId; purpleCap?: mongoose.Types.ObjectId;
  isPublic: boolean; isFeatured: boolean; streamUrl?: string;
  createdAt: Date; updatedAt: Date;
  addTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
  removeTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
  generateBracket(): Promise<void>;
  calculatePointsTable(): Promise<void>;
  startTournament(): Promise<void>;
  endTournament(winnerId?: mongoose.Types.ObjectId): Promise<void>;
}

const PointsTableEntrySchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  matchesPlayed: { type: Number, default: 0 }, matchesWon: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 }, matchesTied: { type: Number, default: 0 },
  matchesNoResult: { type: Number, default: 0 }, points: { type: Number, default: 0 },
  netRunRate: { type: Number, default: 0 }, forRuns: { type: Number, default: 0 },
  againstRuns: { type: Number, default: 0 }, oversFaced: { type: Number, default: 0 },
  oversBowled: { type: Number, default: 0 },
}, { _id: false });

const TournamentSchema: Schema = new Schema({
  name: { type: String, required: [true, 'Tournament name is required'], trim: true, maxlength: 200 },
  description: { type: String, maxlength: 2000 },
  logo: String, banner: String,
  organizer: { type: Schema.Types.ObjectId, ref: 'User', required: [true, 'Organizer is required'] },
  contactEmail: String, contactPhone: String,
  startDate: { type: Date, required: [true, 'Start date is required'] },
  endDate: Date, registrationDeadline: Date,
  location: { type: String, trim: true }, locationType: { type: String, enum: ['indoor', 'outdoor', 'both'], default: 'outdoor' }, address: String,
  type: { type: String, enum: ['round_robin', 'knockout', 'double_elimination', 'league', 'group_stage'], required: true, default: 'round_robin' },
  format: { type: String, enum: ['T10', 'T20', 'ODI', 'Test', 'Custom'], default: 'T20' },
  maxTeams: { type: Number, default: 8, min: 2, max: 100 }, minTeams: { type: Number, default: 4, min: 2 }, overs: { type: Number, default: 20 },
  rules: String, prize: String, entryFee: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'], default: 'draft' },
  teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  waitingList: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  matches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  bracketGenerated: { type: Boolean, default: false }, bracketData: Schema.Types.Mixed,
  pointsTable: [PointsTableEntrySchema],
  winner: { type: Schema.Types.ObjectId, ref: 'Team' }, runnerUp: { type: Schema.Types.ObjectId, ref: 'Team' }, secondRunnerUp: { type: Schema.Types.ObjectId, ref: 'Team' },
  mvp: { type: Schema.Types.ObjectId, ref: 'Player' }, orangeCap: { type: Schema.Types.ObjectId, ref: 'Player' }, purpleCap: { type: Schema.Types.ObjectId, ref: 'Player' },
  isPublic: { type: Boolean, default: true }, isFeatured: { type: Boolean, default: false },
  streamUrl: String,
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

TournamentSchema.index({ status: 1 });
TournamentSchema.index({ organizer: 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ name: 'text', description: 'text' });

TournamentSchema.methods.addTeam = async function (teamId: mongoose.Types.ObjectId) {
  if (this.teams.some((t: mongoose.Types.ObjectId) => t.toString() === teamId.toString())) {
    throw new Error('Team already registered');
  }
  if (this.teams.length >= this.maxTeams) {
    this.waitingList.push(teamId);
    await this.save();
    throw new Error('Tournament is full — team added to waiting list');
  }
  this.teams.push(teamId);
  await this.save();
};

TournamentSchema.methods.removeTeam = async function (teamId: mongoose.Types.ObjectId) {
  this.teams = this.teams.filter((t: mongoose.Types.ObjectId) => t.toString() !== teamId.toString());
  await this.save();
};

TournamentSchema.methods.generateBracket = async function () {
  const Match = mongoose.model('Match');
  switch (this.type) {
    case 'round_robin': case 'league': await generateRoundRobin(this, Match); break;
    case 'knockout': case 'double_elimination': await generateKnockout(this, Match); break;
    case 'group_stage': await generateRoundRobin(this, Match); break;
    default: await generateRoundRobin(this, Match);
  }
  this.bracketGenerated = true;
  await this.save();
};

// FIX #1: knockout bracket — original set team1 AND team2 to teams[0]
async function generateKnockout(tournament: any, Match: any) {
  const teams = [...tournament.teams];
  // Shuffle for randomness
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  // Pad to power of 2
  while (!isPowerOf2(teams.length)) teams.push(null);

  const matchDocs = [];
  let matchNumber = 1;
  for (let i = 0; i < teams.length; i += 2) {
    const t1 = teams[i];
    const t2 = teams[i + 1];
    // FIX: only create a real match when both teams are actual teams (not null byes)
    if (t1 && t2) {
      const match = await Match.create({
        name: `Round 1 Match ${matchNumber}`,
        team1: t1, team2: t2,    // FIX: was team1: teams[0], team2: teams[0]
        tournamentId: tournament._id,
        round: 'Round 1', matchNumber,
        date: tournament.startDate,
        format: tournament.format || 'T20',
        status: 'upcoming',
      });
      matchDocs.push(match._id);
    }
    matchNumber++;
  }
  tournament.matches.push(...matchDocs);
}

function isPowerOf2(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

async function generateRoundRobin(tournament: any, Match: any) {
  const teams = tournament.teams;
  const matchDocs = [];
  let matchNumber = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const match = await Match.create({
        name: `Match ${matchNumber}`,
        team1: teams[i], team2: teams[j],
        tournamentId: tournament._id,
        round: 'League', matchNumber,
        date: tournament.startDate,
        format: tournament.format || 'T20',
        status: 'upcoming',
      });
      matchDocs.push(match._id);
      matchNumber++;
    }
  }
  tournament.matches.push(...matchDocs);
}

// FIX #2: NRR calculation — convert decimal overs (12.3) to real overs (12.5)
// The original divided directly by 12.3 which is wrong; 12 overs 3 balls = 12.5 actual overs
function decimalOversToReal(decimalOvers: number): number {
  const whole = Math.floor(decimalOvers);
  const balls = Math.round((decimalOvers - whole) * 10);
  return whole + balls / 6;
}

TournamentSchema.methods.calculatePointsTable = async function () {
  const Match = mongoose.model('Match');
  const table: any[] = [];

  for (const teamId of this.teams) {
    const matches = await Match.find({
      tournamentId: this._id,
      $or: [{ team1: teamId }, { team2: teamId }],
      status: 'completed'
    });

    let matchesPlayed = 0, matchesWon = 0, matchesLost = 0, matchesTied = 0, matchesNoResult = 0;
    let forRuns = 0, againstRuns = 0, oversFaced = 0, oversBowled = 0;

    for (const match of matches) {
      matchesPlayed++;
      const isTeam1 = match.team1.toString() === teamId.toString();
      const ourScore = isTeam1 ? match.team1Score : match.team2Score;
      const oppScore = isTeam1 ? match.team2Score : match.team1Score;
      const ourOvers = isTeam1 ? match.team1Overs : match.team2Overs;
      const oppOvers = isTeam1 ? match.team2Overs : match.team1Overs;

      // FIX #3: detect no-result (both scores are 0 after completion = likely no result)
      if (match.resultType === 'no result') {
        matchesNoResult++;
        continue; // don't count runs/overs for no-result matches
      }

      forRuns += ourScore || 0;
      againstRuns += oppScore || 0;
      // FIX #2: convert decimal overs to real overs before accumulating
      oversFaced += decimalOversToReal(ourOvers || 0);
      oversBowled += decimalOversToReal(oppOvers || 0);

      if (match.resultType === 'tie') { matchesTied++; }
      else if (ourScore > oppScore) { matchesWon++; }
      else { matchesLost++; }
    }

    const points = matchesWon * 2 + matchesTied * 1 + matchesNoResult * 1;
    // FIX #2: now oversFaced is already in real overs (e.g. 12.5), not decimal (12.3)
    const nrr = (oversFaced > 0 && oversBowled > 0)
      ? parseFloat(((forRuns / oversFaced) - (againstRuns / oversBowled)).toFixed(3))
      : 0;

    table.push({ teamId, matchesPlayed, matchesWon, matchesLost, matchesTied, matchesNoResult, points, netRunRate: nrr, forRuns, againstRuns, oversFaced, oversBowled });
  }

  table.sort((a, b) => b.points !== a.points ? b.points - a.points : b.netRunRate - a.netRunRate);
  this.pointsTable = table;
  await this.save();
};

TournamentSchema.methods.startTournament = async function () {
  if (this.teams.length < this.minTeams) throw new Error(`Need at least ${this.minTeams} teams to start`);
  if (!this.bracketGenerated) await this.generateBracket();
  this.status = 'ongoing';
  await this.save();
};

TournamentSchema.methods.endTournament = async function (winnerId?: mongoose.Types.ObjectId) {
  this.status = 'completed';
  if (winnerId) {
    this.winner = winnerId;
    if (this.pointsTable && this.pointsTable.length > 1) this.runnerUp = this.pointsTable[1].teamId;
  }
  if (this.type === 'round_robin' || this.type === 'league') await this.calculatePointsTable();
  await this.save();
};

TournamentSchema.statics.getUpcoming = function (limit = 10) {
  return this.find({ status: { $in: ['draft', 'upcoming'] }, isPublic: true, startDate: { $gte: new Date() } }).populate('organizer', 'username email').sort({ startDate: 1 }).limit(limit);
};
TournamentSchema.statics.getOngoing = function () {
  return this.find({ status: 'ongoing', isPublic: true }).populate('organizer', 'username email').populate('teams', 'name shortName');
};
TournamentSchema.statics.getFeatured = function (limit = 5) {
  return this.find({ isFeatured: true, isPublic: true, status: { $in: ['upcoming', 'ongoing'] } }).populate('organizer', 'username').sort({ startDate: 1 }).limit(limit);
};
TournamentSchema.statics.getByOrganizer = function (organizerId: mongoose.Types.ObjectId | string) {
  return this.find({ organizer: organizerId }).sort({ createdAt: -1 });
};
TournamentSchema.statics.getFullDetails = function (tournamentId: mongoose.Types.ObjectId) {
  return this.findById(tournamentId).populate('organizer', 'username email fullName').populate('teams', 'name shortName logo players').populate('matches').populate('winner', 'name shortName').populate('runnerUp', 'name shortName');
};
TournamentSchema.statics.search = function (query: string) {
  return this.find({ $text: { $search: query }, isPublic: true });
};

export default mongoose.model<ITournament, ITournamentModel>('Tournament', TournamentSchema);
