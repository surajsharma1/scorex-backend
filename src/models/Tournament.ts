/**
 * Tournament Model
 * Complete tournament management system
 * Following PROJECT_ALGORITHM.md specifications
 */

import mongoose, { Document, Schema } from 'mongoose';

// ==========================================
// INTERFACES & TYPES
// ==========================================

// Tournament types per algorithm
export type TournamentType = 
  | 'round_robin' 
  | 'knockout' 
  | 'double_elimination' 
  | 'league' 
  | 'group_stage';

// Tournament status
export type TournamentStatus = 'draft' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

// Tournament format
export type TournamentFormat = 'T10' | 'T20' | 'ODI' | 'Test' | 'Custom';

// Location type
export type LocationType = 'indoor' | 'outdoor' | 'both';

export interface ITournament extends Document {
  // Basic Information
  name: string;
  description?: string;
  logo?: string;
  banner?: string;
  
  // Organization
  organizer: mongoose.Types.ObjectId;
  contactEmail?: string;
  contactPhone?: string;
  
  // Schedule
  startDate: Date;
  endDate: Date;
  registrationDeadline?: Date;
  
  // Location
  location: string;
  locationType: LocationType;
  address?: string;
  
  // Tournament Configuration
  type: TournamentType;
  format: TournamentFormat;
  maxTeams: number;
  minTeams: number;
  overs?: number; // Overs per match (e.g., 20 for T20)
  
  // Rules
  rules?: string;
  prize?: string;
  entryFee?: number;
  
  // Status
  status: TournamentStatus;
  
  // Teams
  teams: mongoose.Types.ObjectId[];
  waitingList: mongoose.Types.ObjectId[];
  
  // Matches
  matches: mongoose.Types.ObjectId[];
  
  // Bracket
  bracketGenerated: boolean;
  bracketData?: any;
  
  // Points Table (for round robin)
  pointsTable?: {
    teamId: mongoose.Types.ObjectId;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesTied: number;
    points: number;
    netRunRate: number;
    forRuns: number;
    againstRuns: number;
    oversFaced: number;
    oversBowled: number;
  }[];
  
  // Winners
  winner?: mongoose.Types.ObjectId;
  runnerUp?: mongoose.Types.ObjectId;
  secondRunnerUp?: mongoose.Types.ObjectId;
  
  // MVP Awards
  mvp?: mongoose.Types.ObjectId;
  orangeCap?: mongoose.Types.ObjectId; // Top scorer
  purpleCap?: mongoose.Types.ObjectId; // Top wicket taker
  
  // Visibility
  isPublic: boolean;
  isFeatured: boolean;
  
  // Stream
  streamUrl?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
  removeTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
  generateBracket(): Promise<void>;
  calculatePointsTable(): Promise<void>;
  startTournament(): Promise<void>;
  endTournament(winnerId?: mongoose.Types.ObjectId): Promise<void>;
}

// ==========================================
// SUB-SCHEMAS
// ==========================================

const PointsTableEntrySchema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  matchesPlayed: { type: Number, default: 0 },
  matchesWon: { type: Number, default: 0 },
  matchesLost: { type: Number, default: 0 },
  matchesTied: { type: Number, default: 0 },
  matchesNoResult: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  netRunRate: { type: Number, default: 0 },
  forRuns: { type: Number, default: 0 },
  againstRuns: { type: Number, default: 0 },
  oversFaced: { type: Number, default: 0 },
  oversBowled: { type: Number, default: 0 },
}, { _id: false });

// ==========================================
// MAIN SCHEMA
// ==========================================

const TournamentSchema: Schema = new Schema({
  // Basic Information
  name: { 
    type: String, 
    required: [true, 'Tournament name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: { 
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  logo: { type: String },
  banner: { type: String },
  
  // Organization
  organizer: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: [true, 'Organizer is required']
  },
  contactEmail: { type: String },
  contactPhone: { type: String },
  
  // Schedule
  startDate: { 
    type: Date, 
    required: [true, 'Start date is required']
  },
  endDate: { 
    type: Date, 
    required: [true, 'End date is required']
  },
  registrationDeadline: { type: Date },
  
  // Location
  location: { 
    type: String, 
    required: [true, 'Location is required'],
    trim: true
  },
  locationType: { 
    type: String, 
    enum: ['indoor', 'outdoor', 'both'],
    default: 'outdoor'
  },
  address: { type: String },
  
  // Tournament Configuration
  type: { 
    type: String, 
    enum: ['round_robin', 'knockout', 'double_elimination', 'league', 'group_stage'],
    required: [true, 'Tournament type is required'],
    default: 'round_robin'
  },
  format: { 
    type: String, 
    enum: ['T10', 'T20', 'ODI', 'Test', 'Custom'],
    default: 'T20'
  },
  maxTeams: { 
    type: Number, 
    default: 8,
    min: [2, 'Minimum 2 teams required'],
    max: [100, 'Maximum 100 teams allowed']
  },
  minTeams: { 
    type: Number, 
    default: 4,
    min: [2, 'Minimum 2 teams required']
  },
  overs: { 
    type: Number,
    default: 20 // T20 default
  },
  
  // Rules
  rules: { type: String },
  prize: { type: String },
  entryFee: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['draft', 'upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  },
  
  // Teams
  teams: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Team' 
  }],
  waitingList: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Team' 
  }],
  
  // Matches
  matches: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Match' 
  }],
  
  // Bracket
  bracketGenerated: { type: Boolean, default: false },
  bracketData: { type: Schema.Types.Mixed },
  
  // Points Table
  pointsTable: [{ type: PointsTableEntrySchema }],
  
  // Winners
  winner: { type: Schema.Types.ObjectId, ref: 'Team' },
  runnerUp: { type: Schema.Types.ObjectId, ref: 'Team' },
  secondRunnerUp: { type: Schema.Types.ObjectId, ref: 'Team' },
  
  // MVP Awards
  mvp: { type: Schema.Types.ObjectId, ref: 'Player' },
  orangeCap: { type: Schema.Types.ObjectId, ref: 'Player' },
  purpleCap: { type: Schema.Types.ObjectId, ref: 'Player' },
  
  // Visibility
  isPublic: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Stream
  streamUrl: { type: String },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// INDEXES
// ==========================================

TournamentSchema.index({ name: 'text', description: 'text' });
TournamentSchema.index({ organizer: 1 });
TournamentSchema.index({ status: 1 });
TournamentSchema.index({ startDate: 1 });
TournamentSchema.index({ teams: 1 });
TournamentSchema.index({ isPublic: 1 });
TournamentSchema.index({ isFeatured: 1 });
TournamentSchema.index({ createdAt: -1 });

// ==========================================
// VIRTUALS
// ==========================================

// Virtual for team count
TournamentSchema.virtual('teamCount').get(function() {
  return this.teams ? this.teams.length : 0;
});

// Virtual for match count
TournamentSchema.virtual('matchCount').get(function() {
  return this.matches ? this.matches.length : 0;
});

// Virtual for is registration open
TournamentSchema.virtual('isRegistrationOpen').get(function() {
  if (this.status !== 'draft' && this.status !== 'upcoming') return false;
  if (this.teams.length >= this.maxTeams) return false;
  if (this.registrationDeadline && new Date() > this.registrationDeadline) return false;
  return true;
});

// Virtual for is ongoing
TournamentSchema.virtual('isOngoing').get(function() {
  return this.status === 'ongoing';
});

// Virtual for days until start
TournamentSchema.virtual('daysUntilStart').get(function() {
  const now = new Date();
  const start = new Date(this.startDate);
  const diff = start.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ==========================================
// METHODS
// ==========================================

// Add team to tournament
TournamentSchema.methods.addTeam = async function(teamId: mongoose.Types.ObjectId) {
  if (this.teams.includes(teamId)) {
    throw new Error('Team already registered');
  }
  
  if (this.teams.length >= this.maxTeams) {
    // Add to waiting list
    if (!this.waitingList.includes(teamId)) {
      this.waitingList.push(teamId);
    }
    throw new Error('Tournament full, added to waiting list');
  }
  
  this.teams.push(teamId);
  
  // Auto-update status if minimum teams reached
  if (this.teams.length >= this.minTeams && this.status === 'draft') {
    this.status = 'upcoming';
  }
  
  await this.save();
};

// Remove team from tournament
TournamentSchema.methods.removeTeam = async function(teamId: mongoose.Types.ObjectId) {
  this.teams = this.teams.filter(
    t => t.toString() !== teamId.toString()
  );
  
  // Promote from waiting list if available
  if (this.waitingList.length > 0 && this.teams.length < this.maxTeams) {
    const nextTeam = this.waitingList.shift();
    if (nextTeam) {
      this.teams.push(nextTeam);
    }
  }
  
  await this.save();
};

// Generate bracket based on tournament type
TournamentSchema.methods.generateBracket = async function() {
  const Match = mongoose.model('Match');
  
  if (this.teams.length < 2) {
    throw new Error('Need at least 2 teams to generate bracket');
  }
  
  this.matches = [];
  
  switch (this.type) {
    case 'knockout':
      await this.generateKnockoutBracket(Match);
      break;
    case 'round_robin':
      await this.generateRoundRobinSchedule(Match);
      break;
    case 'double_elimination':
      await this.generateDoubleEliminationBracket(Match);
      break;
    case 'group_stage':
      await this.generateGroupStage(Match);
      break;
    default:
      await this.generateRoundRobinSchedule(Match);
  }
  
  this.bracketGenerated = true;
  this.status = 'ongoing';
  await this.save();
};

// Generate knockout bracket
TournamentSchema.methods.generateKnockoutBracket = async function(Match: any) {
  const teams = [...this.teams];
  
  // Shuffle teams
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  
  // Calculate number of rounds
  const numRounds = Math.ceil(Math.log2(teams.length));
  const numMatches = Math.pow(2, numRounds - 1);
  
  let matchNumber = 1;
  
  // First round
  for (let i = 0; i < numMatches; i++) {
    const team1 = teams[i * 2];
    const team2 = teams[i * 2 + 1];
    
    if (team1 && team2) {
      const match = await Match.create({
        name: `Round 1 - Match ${matchNumber}`,
        tournamentId: this._id,
        round: 'Round 1',
        matchNumber: matchNumber++,
        team1,
        team2,
        venue: this.location,
        date: this.startDate,
        format: this.format,
        status: 'upcoming'
      });
      
      this.matches.push(match._id);
    }
  }
  
  // Create placeholder matches for subsequent rounds
  for (let round = 2; round <= numRounds; round++) {
    for (let i = 0; i < numMatches / Math.pow(2, round - 1); i++) {
      const roundName = round === numRounds ? 'Final' : 
        round === numRounds - 1 ? 'Semi Finals' : 
        round === numRounds - 2 ? 'Quarter Finals' : `Round ${round}`;
      
      const match = await Match.create({
        name: `${roundName} - Match ${matchNumber}`,
        tournamentId: this._id,
        round: roundName,
        matchNumber: matchNumber++,
        team1: teams[0], // Placeholder - will be updated
        team2: teams[0], // Placeholder - will be updated
        venue: this.location,
        date: new Date(this.startDate.getTime() + (round - 1) * 7 * 24 * 60 * 60 * 1000),
        format: this.format,
        status: 'upcoming'
      });
      
      this.matches.push(match._id);
    }
  }
  
  await this.save();
};

// Generate round robin schedule
TournamentSchema.methods.generateRoundRobinSchedule = async function(Match: any) {
  const teams = [...this.teams];
  const numTeams = teams.length;
  let matchNumber = 1;
  
  // Simple round robin - each team plays each other twice
  for (let i = 0; i < numTeams; i++) {
    for (let j = i + 1; j < numTeams; j++) {
      const match = await Match.create({
        name: `Match ${matchNumber}`,
        tournamentId: this._id,
        round: 'League',
        matchNumber: matchNumber++,
        team1: teams[i],
        team2: teams[j],
        venue: this.location,
        date: new Date(this.startDate.getTime() + Math.floor(matchNumber / (numTeams / 2)) * 24 * 60 * 60 * 1000),
        format: this.format,
        status: 'upcoming'
      });
      
      this.matches.push(match._id);
    }
  }
  
  await this.save();
};

// Generate double elimination bracket (simplified)
TournamentSchema.methods.generateDoubleEliminationBracket = async function(Match: any) {
  // Simplified implementation - similar to knockout but with winners/losers bracket
  await this.generateKnockoutBracket(Match);
};

// Generate group stage (simplified)
TournamentSchema.methods.generateGroupStage = async function(Match: any) {
  // Simplified - treat as round robin
  await this.generateRoundRobinSchedule(Match);
};

// Calculate points table for round robin
TournamentSchema.methods.calculatePointsTable = async function() {
  const Match = mongoose.model('Match');
  
  const table: any[] = [];
  
  for (const teamId of this.teams) {
    const matches = await Match.find({
      tournamentId: this._id,
      $or: [{ team1: teamId }, { team2: teamId }],
      status: 'completed'
    });
    
    let matchesPlayed = 0;
    let matchesWon = 0;
    let matchesLost = 0;
    let matchesTied = 0;
    let matchesNoResult = 0;
    let forRuns = 0;
    let againstRuns = 0;
    let oversFaced = 0;
    let oversBowled = 0;
    
    for (const match of matches) {
      matchesPlayed++;
      
      const isTeam1 = match.team1.toString() === teamId.toString();
      const ourScore = isTeam1 ? match.team1Score : match.team2Score;
      const opponentScore = isTeam1 ? match.team2Score : match.team1Score;
      const ourOvers = isTeam1 ? match.team1Overs : match.team2Overs;
      const opponentOvers = isTeam1 ? match.team2Overs : match.team1Overs;
      
      forRuns += ourScore || 0;
      againstRuns += opponentScore || 0;
      oversFaced += ourOvers || 0;
      oversBowled += opponentOvers || 0;
      
      if (ourScore > opponentScore) {
        matchesWon++;
      } else if (opponentScore > ourScore) {
        matchesLost++;
      } else {
        matchesTied++;
      }
    }
    
    // Points: 2 for win, 1 for tie/no result
    const points = (matchesWon * 2) + (matchesTied * 1) + (matchesNoResult * 1);
    
    // Net run rate
    const runRateFor = oversFaced > 0 ? forRuns / oversFaced : 0;
    const runRateAgainst = oversBowled > 0 ? againstRuns / oversBowled : 0;
    const netRunRate = runRateFor - runRateAgainst;
    
    table.push({
      teamId,
      matchesPlayed,
      matchesWon,
      matchesLost,
      matchesTied,
      matchesNoResult,
      points,
      netRunRate,
      forRuns,
      againstRuns,
      oversFaced,
      oversBowled
    });
  }
  
  // Sort by points, then net run rate
  table.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.netRunRate - a.netRunRate;
  });
  
  this.pointsTable = table;
  await this.save();
};

// Start tournament
TournamentSchema.methods.startTournament = async function() {
  if (this.teams.length < this.minTeams) {
    throw new Error(`Need at least ${this.minTeams} teams to start`);
  }
  
  if (!this.bracketGenerated) {
    await this.generateBracket();
  }
  
  this.status = 'ongoing';
  await this.save();
};

// End tournament
TournamentSchema.methods.endTournament = async function(winnerId?: mongoose.Types.ObjectId) {
  this.status = 'completed';
  
  if (winnerId) {
    this.winner = winnerId;
    
    // Find runner up from points table or final match
    if (this.pointsTable && this.pointsTable.length > 1) {
      this.runnerUp = this.pointsTable[1].teamId;
    }
  }
  
  // Calculate final points table for round robin
  if (this.type === 'round_robin' || this.type === 'league') {
    await this.calculatePointsTable();
  }
  
  await this.save();
};

// ==========================================
// STATIC METHODS
// ==========================================

// Get upcoming tournaments
TournamentSchema.statics.getUpcoming = function(limit: number = 10) {
  return this.find({ 
    status: { $in: ['draft', 'upcoming'] },
    isPublic: true,
    startDate: { $gte: new Date() }
  })
  .populate('organizer', 'username email')
  .sort({ startDate: 1 })
  .limit(limit);
};

// Get ongoing tournaments
TournamentSchema.statics.getOngoing = function() {
  return this.find({ 
    status: 'ongoing',
    isPublic: true
  })
  .populate('organizer', 'username email')
  .populate('teams', 'name shortName');
};

// Get featured tournaments
TournamentSchema.statics.getFeatured = function(limit: number = 5) {
  return this.find({ 
    isFeatured: true,
    isPublic: true,
    status: { $in: ['upcoming', 'ongoing'] }
  })
  .populate('organizer', 'username')
  .sort({ startDate: 1 })
  .limit(limit);
};

// Get tournaments by organizer
TournamentSchema.statics.getByOrganizer = function(organizerId: mongoose.Types.ObjectId) {
  return this.find({ organizer: organizerId })
    .sort({ createdAt: -1 });
};

// Get tournament with full details
TournamentSchema.statics.getFullDetails = function(tournamentId: mongoose.Types.ObjectId) {
  return this.findById(tournamentId)
    .populate('organizer', 'username email fullName')
    .populate('teams', 'name shortName logo players')
    .populate('matches')
    .populate('winner', 'name shortName')
    .populate('runnerUp', 'name shortName');
};

// Search tournaments
TournamentSchema.statics.search = function(query: string) {
  return this.find({ 
    $text: { $search: query },
    isPublic: true
  });
};

// ==========================================
// EXPORT
// ==========================================

export default mongoose.model<ITournament>('Tournament', TournamentSchema);

