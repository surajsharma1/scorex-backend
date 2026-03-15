/**
 * Leaderboard Controller — Fixed & Rewritten
 *
 * BUGS FIXED:
 * 1. getGlobalLeaderboard: `data` variable used before assignment if type is neither
 *    'player' nor 'team' — caused "Cannot read properties of undefined (reading 'map')"
 *    at the `total` calculation line.
 *    FIX: initialise data = [] and add else branch with 400 response.
 */

import { Request, Response, NextFunction } from 'express';
import Player from '../models/Player';
import Team from '../models/Team';
import Match from '../models/Match';
import Tournament from '../models/Tournament';

export const getGlobalLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type = 'player', limit = 50, page = 1, timeframe = 'all' } = req.query;

    let query: any = {};
    if (timeframe !== 'all') {
      const now = new Date();
      const dates: Record<string, Date> = {
        year:  new Date(now.getFullYear(), 0, 1),
        month: new Date(now.getFullYear(), now.getMonth(), 1),
        week:  new Date(now.setDate(now.getDate() - 7)),
      };
      if (dates[timeframe as string]) query.lastMatchDate = { $gte: dates[timeframe as string] };
    }

    // FIX: initialise data so it's never undefined at the `total` lookup below
    let data: any[] = [];
    let total = 0;

    if (type === 'player') {
      data = await Player.find({ ...query, isActive: true })
        .sort({ 'points.total': -1, 'battingStats.totalRuns': -1, 'bowlingStats.totalWickets': -1 })
        .limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
        .select('name profilePicture role points battingStats bowlingStats').lean();
      data = data.map((p, i) => ({ ...p, rank: (Number(page) - 1) * Number(limit) + i + 1, totalPoints: p.points?.total || 0, totalRuns: p.battingStats?.totalRuns || 0, totalWickets: p.bowlingStats?.totalWickets || 0 }));
      total = await Player.countDocuments(query);

    } else if (type === 'team') {
      data = await Team.find({ ...query, isActive: true })
        .sort({ points: -1, netRunRate: -1 })
        .limit(Number(limit)).skip((Number(page) - 1) * Number(limit))
        .select('name shortName logo points netRunRate tournamentStats').populate('owner', 'username').lean();
      data = data.map((t, i) => ({ ...t, rank: (Number(page) - 1) * Number(limit) + i + 1, matchesPlayed: t.tournamentStats?.matchesPlayed || 0, matchesWon: t.tournamentStats?.matchesWon || 0 }));
      total = await Team.countDocuments(query);

    } else {
      // FIX: original fell through here with data undefined, crashing on `total = type === 'player' ? ...`
      return res.status(400).json({ success: false, message: "Invalid type — must be 'player' or 'team'" });
    }

    res.json({ success: true, data, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
};

export const getTournamentLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    const { type = 'player', limit = 50 } = req.query;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });

    let data: any[] = [];

    if (type === 'player') {
      const teams = await Team.find({ tournaments: tournamentId }).populate('players');
      const playerIds: any[] = teams.flatMap((t: any) => (t.players || []).map((p: any) => p._id));

      const matches = await Match.find({ tournamentId, status: 'completed' });
      const playerStats = new Map<string, any>();

      for (const match of matches) {
        for (const inning of (match as any).innings || []) {
          for (const bat of inning.batsmen || []) {
            const pid = bat.playerId?.toString(); if (!pid) continue;
            const s = playerStats.get(pid) || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
            s.runs += bat.runs || 0; s.fours += bat.fours || 0; s.sixes += bat.sixes || 0;
            playerStats.set(pid, s);
          }
          for (const bowl of inning.bowlers || []) {
            const pid = bowl.playerId?.toString(); if (!pid) continue;
            const s = playerStats.get(pid) || { runs: 0, fours: 0, sixes: 0, wickets: 0, catches: 0 };
            s.wickets += bowl.wickets || 0;
            playerStats.set(pid, s);
          }
        }
      }

      const players = await Player.find({ _id: { $in: playerIds } }).select('name profilePicture role').lean();
      data = players.map(p => {
        const s = playerStats.get(p._id.toString()) || {};
        const points = (s.runs || 0) + (s.fours || 0) + (s.sixes || 0) * 2 + (s.wickets || 0) * 10 + (s.catches || 0) * 5;
        return { _id: p._id, name: p.name, photo: (p as any).profilePicture, role: p.role, points, ...s };
      });
      data.sort((a, b) => b.points - a.points);
      data = data.slice(0, Number(limit)).map((d, i) => ({ ...d, rank: i + 1 }));

    } else if (type === 'team') {
      data = await Team.find({ tournaments: tournamentId })
        .sort({ 'tournamentStats.points': -1 }).limit(Number(limit))
        .select('name shortName logo tournamentStats').lean();
      data = data.map((t, i) => ({ ...t, rank: i + 1, points: t.tournamentStats?.points || 0, matchesPlayed: t.tournamentStats?.matchesPlayed || 0, matchesWon: t.tournamentStats?.matchesWon || 0 }));
    } else {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }

    res.json({ success: true, data, tournament: { _id: tournament._id, name: tournament.name } });
  } catch (error) { next(error); }
};

export const getMatchLeaderboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.matchId).populate('team1', 'name shortName').populate('team2', 'name shortName');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const playerStats = new Map<string, any>();
    for (const inning of (match as any).innings || []) {
      for (const bat of inning.batsmen || []) {
        const pid = bat.playerId?.toString(); if (!pid) continue;
        const s = playerStats.get(pid) || { playerId: pid, team: inning.teamId?.toString(), runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0 };
        s.runs += bat.runs || 0; s.balls += bat.balls || 0; s.fours += bat.fours || 0; s.sixes += bat.sixes || 0;
        playerStats.set(pid, s);
      }
      for (const bowl of inning.bowlers || []) {
        const pid = bowl.playerId?.toString(); if (!pid) continue;
        const s = playerStats.get(pid) || { playerId: pid, team: inning.teamId?.toString(), runs: 0, balls: 0, fours: 0, sixes: 0, wickets: 0 };
        s.wickets += bowl.wickets || 0;
        playerStats.set(pid, s);
      }
    }

    const data = Array.from(playerStats.values()).map(p => {
      const points = p.runs * 1 + p.fours * 1 + p.sixes * 2 + p.wickets * 10;
      return { ...p, points, strikeRate: p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(2) : '0.00' };
    }).sort((a, b) => b.points - a.points);
    if (data.length > 0) data[0].isMVP = true;

    res.json({ success: true, data, match: { _id: match._id, team1: match.team1, team2: match.team2 } });
  } catch (error) { next(error); }
};

export const getOrangeCap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.query;
    let query: any = { isActive: true };
    if (tournamentId) {
      const teams = await Team.find({ tournaments: tournamentId });
      query._id = { $in: teams.flatMap((t: any) => t.players || []) };
    }
    const players = await Player.find(query).sort({ 'battingStats.totalRuns': -1 }).limit(10).select('name profilePicture battingStats').lean();
    res.json({ success: true, data: players.map((p, i) => ({ ...p, rank: i + 1 })), title: 'Orange Cap - Top Run Scorer' });
  } catch (error) { next(error); }
};

export const getPurpleCap = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.query;
    let query: any = { isActive: true };
    if (tournamentId) {
      const teams = await Team.find({ tournaments: tournamentId });
      query._id = { $in: teams.flatMap((t: any) => t.players || []) };
    }
    const players = await Player.find(query).sort({ 'bowlingStats.totalWickets': -1 }).limit(10).select('name profilePicture bowlingStats').lean();
    res.json({ success: true, data: players.map((p, i) => ({ ...p, rank: i + 1 })), title: 'Purple Cap - Top Wicket Taker' });
  } catch (error) { next(error); }
};

export default { getGlobalLeaderboard, getTournamentLeaderboard, getMatchLeaderboard, getOrangeCap, getPurpleCap };
