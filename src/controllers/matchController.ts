/**
 * Match Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. updateMatch used invalid populate(array, 'select') syntax — split into separate calls
 * 2. endMatch used fire-and-forget .then() for team stats — replaced with await
 * 3. getLiveMatches / getUpcomingMatches cast to `any` for statics — use proper model
 * 4. endInnings pushed second innings with hardcoded team2 regardless of toss — now toss-aware
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Match from '../models/Match';
import Team from '../models/Team';
import Player from '../models/Player';
import Tournament from '../models/Tournament';
import { OutType } from '../models/Match';

interface AuthRequest extends Request { user?: any; }

// ─────────────────────────────────────────
// GET /matches
// ─────────────────────────────────────────
export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tournament, team, limit = 20, page = 1 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (tournament) query.tournamentId = tournament;
    if (team) query.$or = [{ team1: team }, { team2: team }];

    const matches = await Match.aggregate([
      { $match: query },
      { $lookup: { from: 'teams', localField: 'team1', foreignField: '_id', as: 'team1' } },
      { $unwind: { path: '$team1', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'teams', localField: 'team2', foreignField: '_id', as: 'team2' } },
      { $unwind: { path: '$team2', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'tournaments', localField: 'tournamentId', foreignField: '_id', as: 'tournamentId' } },
      { $unwind: { path: '$tournamentId', preserveNullAndEmptyArrays: true } },
      { $sort: { date: -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) }
    ]);

    const total = await Match.countDocuments(query);
    res.json({ success: true, data: matches, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// GET /matches/:id
// ─────────────────────────────────────────
export const getMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('team1', 'name shortName logo players')
      .populate('team2', 'name shortName logo players')
      .populate('tournamentId', 'name')
      .populate('scorerId', 'username email');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// POST /matches
// ─────────────────────────────────────────
export const createMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, tournamentId: tId, tournament: tRaw, round, matchNumber,
      team1: t1Raw, team2: t2Raw, team1Id, team2Id,
      date: dateRaw, scheduledDate, time, format, venue } = req.body;

    const team1 = t1Raw || team1Id;
    const team2 = t2Raw || team2Id;
    const date = dateRaw || scheduledDate;
    const tournamentId = tId || tRaw || req.params.id;

    if (!team1 || !team2) return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
    if (!date) return res.status(400).json({ success: false, message: 'Match date is required' });

    const [team1Doc, team2Doc] = await Promise.all([Team.findById(team1), Team.findById(team2)]);
    if (!team1Doc || !team2Doc) return res.status(400).json({ success: false, message: 'Invalid team IDs' });

    const match = await Match.create({
      name: name || `${team1Doc.name} vs ${team2Doc.name}`,
      team1Name: team1Doc.name,
      team2Name: team2Doc.name,
      tournamentId, round, matchNumber,
      team1, team2, venue,
      date: new Date(date), time,
      format: format || 'T20',
      status: 'upcoming',
      scorerId: req.user?.id
    });

    if (tournamentId) {
      await Tournament.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
    }

    await match.populate([
      { path: 'team1', select: 'name shortName' },
      { path: 'team2', select: 'name shortName' },
    ]);

    res.status(201).json({ success: true, message: 'Match created successfully', data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// PUT /matches/:id
// FIX #1: original used .populate(['team1','team2'], 'name shortName') — invalid syntax
// ─────────────────────────────────────────
export const updateMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('team1', 'name shortName')     // FIX: separate populate calls
      .populate('team2', 'name shortName')
      .populate('tossWinner', 'name shortName');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, message: 'Match updated', data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// DELETE /matches/:id
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// POST /matches/:id/start
// ─────────────────────────────────────────
export const startMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { tossWinner, decision, forceStart = false } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    // Allow force start for admins or explicit bypass
    if (!forceStart && match.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'Match is not upcoming' });
    }
    
    console.log(`🎯 Starting match ${match._id}: status='${match.status}' → forceStart=${forceStart}`);

    await match.startMatch(new mongoose.Types.ObjectId(tossWinner), decision);

    await match.populate([
      { path: 'team1', select: 'name shortName logo' },
      { path: 'team2', select: 'name shortName logo' },
      { path: 'tossWinner', select: 'name shortName' },
    ]);
    res.json({ success: true, message: 'Match started', data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// POST /matches/:id/score
// ─────────────────────────────────────────
export const addBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { strikerId, nonStrikerId, bowlerId, ...ballData } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    if (match.status !== 'live') return res.status(400).json({ success: false, message: 'Match is not live' });

    if (strikerId) match.striker = new mongoose.Types.ObjectId(strikerId);
    if (nonStrikerId) match.nonStriker = new mongoose.Types.ObjectId(nonStrikerId);
    if (bowlerId) match.lastBowler = new mongoose.Types.ObjectId(bowlerId);

    await match.addBall(ballData);

    await match.populate([
      { path: 'team1', select: 'name shortName logo' },
      { path: 'team2', select: 'name shortName logo' },
    ]);

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('scoreUpdate', match.toObject());

    const inningsIdx = (match.currentInnings || 1) - 1;
    const currentInnings = match.innings[inningsIdx];

    res.json({
      success: true,
      message: 'Ball added',
      data: {
        score: match.team1Score, wickets: match.team1Wickets, overs: (match.team1Overs || 0).toFixed(1),
        team2Score: match.team2Score, team2Wickets: match.team2Wickets, team2Overs: (match.team2Overs || 0).toFixed(1),
        currentOver: match.currentOver, currentBall: match.currentBall, currentInnings: match.currentInnings,
        innings: currentInnings ? {
          score: currentInnings.score, wickets: currentInnings.wickets, overs: currentInnings.overs,
          balls: currentInnings.balls, runRate: currentInnings.runRate,
          requiredRuns: currentInnings.requiredRuns, requiredRunRate: currentInnings.requiredRunRate,
          targetScore: currentInnings.targetScore, extras: currentInnings.extras
        } : null,
        team1: (match.team1 as any)?.name || '', team2: (match.team2 as any)?.name || '',
      }
    });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// POST /matches/:id/striker|non-striker|bowler
// ─────────────────────────────────────────
export const setStriker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.striker = new mongoose.Types.ObjectId(req.body.playerId);
    await match.save();
    res.json({ success: true, message: 'Striker set' });
  } catch (error) { next(error); }
};

export const setNonStriker = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.nonStriker = new mongoose.Types.ObjectId(req.body.playerId);
    await match.save();
    res.json({ success: true, message: 'Non-striker set' });
  } catch (error) { next(error); }
};

export const setBowler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.lastBowler = new mongoose.Types.ObjectId(req.body.playerId);
    await match.save();
    res.json({ success: true, message: 'Bowler set' });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// POST /matches/:id/end-innings
// FIX #4: original hardcoded team2 for 2nd innings — now respects toss/batting team order
// ─────────────────────────────────────────
export const endInnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    await match.endInnings();

    // If first innings just ended, set up second innings for the other team
    if (match.currentInnings === 1 && match.status === 'live') {
      const firstInningsBattingTeam = match.innings[0]?.teamId;
      // The second innings batting team is whichever team DIDN'T bat first
      const secondInningsBattingTeam =
        firstInningsBattingTeam?.toString() === match.team1.toString() ? match.team2 : match.team1;

      const targetScore = match.team1Score + 1; // need one more than first innings score

      match.innings.push({
        teamId: secondInningsBattingTeam,  // FIX: was hardcoded match.team2 regardless of toss
        status: 'in_progress',
        score: 0, wickets: 0, overs: 0, balls: 0, runRate: 0,
        targetScore,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
        batsmen: [], bowlers: [], fallOfWickets: []
      } as any);

      match.currentInnings = 2;
      match.currentOver = 0;
      match.currentBall = 0;
      await match.save();
    }

    await match.populate('team1', 'name shortName');
    await match.populate('team2', 'name shortName');

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('inningsEnded', match.toObject());

    res.json({ success: true, message: 'Innings ended', data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// POST /matches/:id/end
// FIX #2: original used fire-and-forget .then() — now properly awaits team stats
// ─────────────────────────────────────────
export const endMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { winnerId, resultType, margin, playerOfMatch } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    await match.endMatch(
      winnerId ? new mongoose.Types.ObjectId(winnerId) : undefined,
      resultType
    );
    if (margin) match.margin = margin;
    if (playerOfMatch) match.playerOfMatch = new mongoose.Types.ObjectId(playerOfMatch);

    // FIX #2: was .then(async (team) => { ... }) with no await — stats might not save
    if (winnerId) {
      const winTeam = await Team.findById(winnerId);
      if (winTeam) {
        winTeam.tournamentStats = {
          ...winTeam.tournamentStats,
          matchesWon: (winTeam.tournamentStats?.matchesWon || 0) + 1,
          matchesPlayed: (winTeam.tournamentStats?.matchesPlayed || 0) + 1,
        };
        await winTeam.save();
      }
      // Also update the losing team's played count
      const losingTeamId = winnerId === match.team1.toString() ? match.team2 : match.team1;
      const loseTeam = await Team.findById(losingTeamId);
      if (loseTeam) {
        loseTeam.tournamentStats = {
          ...loseTeam.tournamentStats,
          matchesPlayed: (loseTeam.tournamentStats?.matchesPlayed || 0) + 1,
        };
        await loseTeam.save();
      }
    }

    await match.save();
    await match.populate('team1', 'name shortName');
    await match.populate('team2', 'name shortName');
    await match.populate('winner', 'name shortName');

    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchEnded', match.toObject());

    res.json({ success: true, message: 'Match ended', data: match });
  } catch (error) { next(error); }
};

// ─────────────────────────────────────────
// GET /matches/live & /matches/upcoming
// FIX #3: original cast model to `any` to call statics — use proper model typing
// ─────────────────────────────────────────
export const getLiveMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // FIX: use findById query directly instead of casting to any
    const matches = await Match.find({ status: 'live' })
      .populate('team1', 'name shortName logo')
      .populate('team2', 'name shortName logo')
      .populate('tournamentId', 'name');
    res.json({ success: true, data: matches });
  } catch (error) { next(error); }
};

export const getUpcomingMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const matches = await Match.find({ status: 'upcoming', date: { $gte: new Date() } })
      .populate('team1', 'name shortName')
      .populate('team2', 'name shortName')
      .sort({ date: 1 })
      .limit(limit);
    res.json({ success: true, data: matches });
  } catch (error) { next(error); }
};

export const updateMatchStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.status = status;
    await match.save();
    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchStatusUpdate', { matchId: match._id, status });
    res.json({ success: true, message: 'Status updated', data: { status } });
  } catch (error) { next(error); }
};

export const setMatchOverlay = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    match.overlayId = new mongoose.Types.ObjectId(req.body.overlayId);
    await match.save();
    res.json({ success: true, message: 'Overlay set' });
  } catch (error) { next(error); }
};

export default { getMatches, getMatch, createMatch, updateMatch, deleteMatch, startMatch, addBall, setStriker, setNonStriker, setBowler, endInnings, endMatch, getLiveMatches, getUpcomingMatches, updateMatchStatus, setMatchOverlay };
