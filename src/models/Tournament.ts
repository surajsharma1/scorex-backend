import mongoose, { Schema, Document, Model } from 'mongoose';
import { UserRole } from './User';

export enum TournamentType {
  ROUND_ROBIN = 'round_robin',
  KNOCKOUT = 'knockout',
  LEAGUE = 'league'
}

export enum TournamentStatus {
  UPCOMING = 'upcoming',
  ONGOING = 'ongoing',
  COMPLETED = 'completed'
}



const TournamentSchema = new Schema<ITournament>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  type: { type: String, enum: Object.values(TournamentType), required: true },
  format: { type: String, required: true, enum: ['T10', 'T20', 'ODI', 'Test'] },
  status: { type: String, enum: Object.values(TournamentStatus), default: TournamentStatus.UPCOMING },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  startDate: { type: Date, required: true },
  endDate: Date,
  venue: { type: String, required: true },
  prizePool: { type: Number, default: 0 },
rules: { type: String },
  sponsors: [{ type: String }],
  pointsTable: [Schema.Types.Mixed],
  bracket: [Schema.Types.Mixed]
}, { timestamps: true });

// Indexes
TournamentSchema.index({ organizer: 1 });
TournamentSchema.index({ type: 1, status: 1 });
TournamentSchema.index({ startDate: 1 });

// Generate knockout bracket algorithm (from spec)
TournamentSchema.methods.generateBracket = async function(): Promise<void> {
  const teams = await mongoose.model('Team').find({ _id: { $in: this.teams } });
  if (teams.length === 0) throw new Error('No teams to generate bracket');
  
  // Shuffle teams for fair bracket
  const shuffledTeams = teams.sort(() => Math.random() - 0.5);
  
  let bracketRounds: any[] = [];
  let currentRound: any[] = [];
  let teamIndex = 0;
  
  // Handle non-power-of-2 byes
  const nextPowerOf2 = 2 ** Math.ceil(Math.log2(shuffledTeams.length));
  const byes = nextPowerOf2 - shuffledTeams.length;
  
  // Fill byes
  for (let i = 0; i < byes; i++) {
    currentRound.push({ team1: null, team2: shuffledTeams[teamIndex++], bye: true });
  }
  
  // Pair remaining teams
  while (teamIndex < shuffledTeams.length) {
    const team1 = shuffledTeams[teamIndex++];
    const team2 = shuffledTeams[teamIndex++];
    if (team2) {
      currentRound.push({ team1, team2, bye: false });
    }
  }
  
  bracketRounds.push({ round: 1, matches: currentRound });
  
  // Generate subsequent rounds (simplified - winners advance)
  let nextRoundTeams: any[] = [];
  currentRound.forEach(match => {
    if (match.bye) {
      nextRoundTeams.push(match.team2);
    } else {
      nextRoundTeams.push({ team1: match.team1, team2: match.team2 });
    }
  });
  
  // Continue until final
  let roundNum = 2;
  while (nextRoundTeams.length > 1) {
    const nextRoundMatches: any[] = [];
    for (let i = 0; i < nextRoundTeams.length; i += 2) {
      const team1 = nextRoundTeams[i];
      const team2 = nextRoundTeams[i + 1];
      if (team2) {
        nextRoundMatches.push({ team1, team2 });
      }
    }
    if (nextRoundMatches.length > 0) {
      bracketRounds.push({ round: roundNum++, matches: nextRoundMatches });
    }
    nextRoundTeams = nextRoundMatches.map(m => ({ winner: true })); // Placeholder
  }
  
  this.bracket = bracketRounds;
  await this.save();
};

// Calculate points table with NRR (Net Run Rate)
TournamentSchema.methods.calculatePointsTable = async function(): Promise<void> {
  const teams = await mongoose.model('Team').find({ _id: { $in: this.teams } });
  const matches = await mongoose.model('Match').find({ 
    _id: { $in: this.matches },
    status: 'completed'
  });
  
  const pointsTable = teams.map(team => {
    const teamMatches = matches.filter(m => 
      m.team1.toString() === team._id.toString() || 
      m.team2.toString() === team._id.toString()
    );
    
    let points = 0, wins = 0, losses = 0, nr = 0;
    let runsFor = 0, runsAgainst = 0, oversFor = 0, oversAgainst = 0;
    
    teamMatches.forEach(match => {
      if (match.winner?.toString() === team._id.toString()) {
        wins++; points += 2;
      } else if (!match.winner) {
        losses++;
      }
      // Simplified NRR calc
      runsFor += match.team1Score || 0;
      runsAgainst += match.team2Score || 0;
      oversFor += (match.team1Overs || 0);
      oversAgainst += (match.team2Overs || 0);
    });
    
    const nrr = Math.pow((runsFor / runsAgainst), (1 / (oversFor / oversAgainst))) - 1;
    
    return {
      team: team._id,
      played: teamMatches.length,
      won: wins, lost: losses, nr,
      points,
      nrr: Number(nrr.toFixed(3))
    };
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr);
  
  this.pointsTable = pointsTable;
  await this.save();
};

// Convenience methods
TournamentSchema.methods.addTeam = async function(teamId: mongoose.Types.ObjectId): Promise<void> {
  if (!this.teams.includes(teamId)) {
    this.teams.push(teamId);
    await this.save();
  }
};

TournamentSchema.methods.isUserOwner = function(userId: string): boolean {
  return this.organizer.toString() === userId;
};

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
  sponsors?: string[];
  pointsTable?: any[];
  bracket?: any[];

  // Methods
  generateBracket(): Promise<void>;
  calculatePointsTable(): Promise<void>;
  addTeam(teamId: mongoose.Types.ObjectId): Promise<void>;
  isUserOwner(userId: string): boolean;
}

export default mongoose.model<ITournament>('Tournament', TournamentSchema);

