import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Match, { MatchStatus, OutType, TossDecision } from '../models/Match';
import Team from '../models/Team';
import Tournament from '../models/Tournament';

interface AuthRequest extends Request { user?: any; }

// ─── REUSABLE POPULATE OPTIONS (FIX FOR PLAYER NAMES MISSING) ───────────────
const teamPopulateOptions = [
  { 
    path: 'team1', 
    select: 'name shortName logo players',
    populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' }
  },
  { 
    path: 'team2', 
    select: 'name shortName logo players',
    populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' }
  }
];

// ─── GET /matches ─────────────────────────────────────────────────────────────
export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tournament, team, limit = 50, page = 1 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (tournament) query.tournamentId = tournament;
    if (team) query.$or = [{ team1: team }, { team2: team }];

    const matches = await Match.find(query)
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournamentId', 'name')
      .sort({ date: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Match.countDocuments(query);
    res.json({
      success: true,
      data: matches,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) { next(error); }
};

// ─── GET /matches/:id ─────────────────────────────────────────────────────────
export const getMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate(teamPopulateOptions) // Uses the reusable deep populate
      .populate('tournamentId')
      .populate('winner');
      
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

// ─── POST /matches ────────────────────────────────────────────────────────────
export const createMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
const {
      name, tournamentId, round, matchNumber,
      team1, team2, date, time, format, venue, maxOvers
    } = req.body;

    if (!team1 || !team2) return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
    if (!date) return res.status(400).json({ success: false, message: 'Match date is required' });
    if (team1 === team2) return res.status(400).json({ success: false, message: 'Teams must be different' });

    const [team1Doc, team2Doc] = await Promise.all([
      Team.findById(team1),
      Team.findById(team2)
    ]);
    if (!team1Doc || !team2Doc) return res.status(400).json({ success: false, message: 'Invalid team IDs' });

    const oversMap: Record<string, number> = { T10: 10, T20: 20, ODI: 50, Test: 90 };
    const fmt = format || 'T20';

    const match = await Match.create({
      name: name || `${team1Doc.name} vs ${team2Doc.name}`,
      team1Name: team1Doc.name,
      team2Name: team2Doc.name,
      tournamentId,
      round, matchNumber,
      team1, team2, venue: venue || 'TBD',
      date: new Date(date), time,
      format: fmt,
      maxOvers: maxOvers || oversMap[fmt] || 20,
      status: 'upcoming',
      scorerId: req.user?.id
    });

    if (tournamentId) {
      await Tournament.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
    }

    await match.populate([
      { path: 'team1', select: 'name shortName' },
      { path: 'team2', select: 'name shortName' }
    ]);

    res.status(201).json({ success: true, message: 'Match created', data: match });
  } catch (error) { next(error); }
};

// ─── PUT /matches/:id ─────────────────────────────────────────────────────────
export const updateMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    )
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

// ─── DELETE /matches/:id ──────────────────────────────────────────────────────
export const deleteMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.tournamentId) {
      await Tournament.findByIdAndUpdate(match.tournamentId, { $pull: { matches: match._id } });
    }
    await match.deleteOne();
    res.json({ success: true, message: 'Match deleted' });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/start ──────────────────────────────────────────────────
export const startMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const {
      tossWinnerId, tossWinnerName, tossDecision,
      battingTeamId, battingTeamName, bowlingTeamId, bowlingTeamName,
      striker, nonStriker, bowler
    } = req.body;

    if (!tossWinnerId || !tossWinnerName || !tossDecision || !battingTeamId || !battingTeamName || !bowlingTeamId || !bowlingTeamName || !striker || !nonStriker || !bowler) {
      return res.status(400).json({
        success: false,
        message: 'Required: tossWinnerId, tossWinnerName, tossDecision, battingTeamId, battingTeamName, bowlingTeamId, bowlingTeamName, striker, nonStriker, bowler'
      });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'upcoming' && match.status !== 'live') {
      return res.status(400).json({ success: false, message: 'Match cannot be started' });
    }

    await match.startMatch({
      tossWinnerId,
      tossWinnerName: tossWinnerName || '',
      tossDecision,
      battingTeamId,
      battingTeamName: battingTeamName || '',
      bowlingTeamId: bowlingTeamId || '',
      bowlingTeamName: bowlingTeamName || '',
      striker,
      nonStriker,
      bowler
    });

    await match.populate(teamPopulateOptions); // FIX: Deep populate for real-time

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchStarted', match.toObject());

    res.json({ success: true, message: 'Match started', data: match });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/select-players ─────────────────────────────────────────
export const selectPlayers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { striker, nonStriker, bowler } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    await match.selectPlayers({ striker, nonStriker, bowler });

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('playersSelected', {
      striker: match.strikerName,
      nonStriker: match.nonStrikerName,
      bowler: match.currentBowlerName
    });

    res.json({
      success: true,
      message: 'Players selected',
      data: {
        striker: match.strikerName,
        nonStriker: match.nonStrikerName,
        bowler: match.currentBowlerName
      }
    });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/score ──────────────────────────────────────────────────
export const addBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    // Validate active striker exists
    const innings = match.innings?.[match.currentInnings - 1];
    if (!innings?.batsmen?.some((b: any) => b.isStriker && !b.isOut)) {
      return res.status(400).json({
        success: false,
        message: 'No active striker found. Please select striker/non-striker/bowler first.'
      });
    }

    const result = await match.addBall(req.body);

    await match.populate(teamPopulateOptions); // FIX: Ensure players are included for UI updates

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('scoreUpdate', {
        match: match.toObject(),
        result,
        overSummary: match.getOverSummary()
      });
    }

    // Handle innings end
    if (result.inningsEnded && !result.matchEnded) {
      if (io) io.to(`match:${match._id}`).emit('inningsEnded', {
        inningsNumber: match.currentInnings - 1,
        score: result.score,
        wickets: result.wickets
      });
    }

    if (result.matchEnded) {
      if (io) io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
    }

    res.json({ success: true, data: result, match: match.toObject() });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/undo ───────────────────────────────────────────────────
export const undoLastBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    await match.undoLastBall();

    await match.populate(teamPopulateOptions); // FIX: Ensure players are included for UI updates

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('scoreUpdate', { match: match.toObject(), result: null });

    res.json({ success: true, message: 'Last ball undone', data: match });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/end-innings ────────────────────────────────────────────
export const endInnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    await match.endInnings();

    await match.populate(teamPopulateOptions); // FIX: Deep populate for next innings

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('inningsEnded', match.toObject());

    res.json({ success: true, message: 'Innings ended', data: match });
  } catch (error) { next(error); }
};

// ─── POST /matches/:id/end ────────────────────────────────────────────────────
export const endMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { winnerId, winnerName, resultSummary, playerOfMatch } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    await match.endMatch(winnerId, winnerName, resultSummary);
    if (playerOfMatch) match.playerOfMatch = playerOfMatch;
    await match.save();

    // Update team win/loss stats
    if (winnerId) {
      await Team.findByIdAndUpdate(winnerId, {
        $inc: { 'stats.matchesWon': 1, 'stats.matchesPlayed': 1, 'tournamentStats.matchesWon': 1, 'tournamentStats.matchesPlayed': 1 }
      });
      const losingTeamId = winnerId === match.team1.toString() ? match.team2 : match.team1;
      await Team.findByIdAndUpdate(losingTeamId, {
        $inc: { 'stats.matchesPlayed': 1, 'tournamentStats.matchesPlayed': 1 }
      });
    }

    await match.populate([
      { path: 'team1', select: 'name shortName' },
      { path: 'team2', select: 'name shortName' },
      { path: 'winner', select: 'name shortName' }
    ]);

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchEnded', match.toObject());

    res.json({ success: true, message: 'Match ended', data: match });
  } catch (error) { next(error); }
};

// ─── PUT /matches/:id/status ──────────────────────────────────────────────────
export const updateMatchStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    );
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchStatusUpdate', { matchId: match._id, status });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

// ─── GET /matches/live ────────────────────────────────────────────────────────
export const getLiveMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await Match.find({ status: 'live' })
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournamentId', 'name')
      .sort({ updatedAt: -1 });
    res.json({ success: true, data: matches });
  } catch (error) { next(error); }
};

export default {
  getMatches, getMatch, createMatch, updateMatch, deleteMatch,
  startMatch, selectPlayers, addBall, undoLastBall,
  endInnings, endMatch, updateMatchStatus, getLiveMatches
};