import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Match from '../models/Match';
import Team from '../models/Team';
import Tournament from '../models/Tournament';
import { cacheService } from '../utils/cache';


const teamPopulateOptions = [
  { path: 'team1', select: 'name shortName logo players', populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' } },
  { path: 'team2', select: 'name shortName logo players', populate: { path: 'players', select: 'name role jerseyNumber', model: 'Player' } }
];

export const getMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tournament, team, limit = 50, page = 1 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (tournament) query.tournamentId = tournament;
    if (team) query.$or = [{ team1: team }, { team2: team }];
    const matches = await Match.find(query).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').populate('tournamentId', 'name').sort({ date: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    const total = await Match.countDocuments(query);
    res.json({ success: true, data: matches, pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { next(error); }
};

export const getMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id).populate(teamPopulateOptions).populate('tournamentId').populate('winner');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

export const createMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, tournamentId, round, matchNumber, team1, team2, date, time, format, venue, maxOvers } = req.body;
    if (!team1 || !team2) return res.status(400).json({ success: false, message: 'team1 and team2 are required' });
    const [team1Doc, team2Doc] = await Promise.all([Team.findById(team1), Team.findById(team2)]);
    const oversMap: Record<string, number> = { T10: 10, T20: 20, ODI: 50, Test: 90 };
    const fmt = format || 'T20';
    const match = await Match.create({ name: name || `${team1Doc?.name} vs ${team2Doc?.name}`, team1Name: team1Doc?.name, team2Name: team2Doc?.name, tournamentId, round, matchNumber, team1, team2, venue: venue || 'TBD', date: new Date(date), time, format: fmt, maxOvers: maxOvers || oversMap[fmt] || 20, status: 'upcoming', scorerId: req.user?.id });
    if (tournamentId) await Tournament.findByIdAndUpdate(tournamentId, { $push: { matches: match._id } });
    await match.populate([{ path: 'team1', select: 'name shortName' }, { path: 'team2', select: 'name shortName' }]);
    res.status(201).json({ success: true, message: 'Match created', data: match });
  } catch (error) { next(error); }
};

export const updateMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('team1', 'name shortName').populate('team2', 'name shortName');
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

export const deleteMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (match?.tournamentId) await Tournament.findByIdAndUpdate(match.tournamentId, { $pull: { matches: match._id } });
    await match?.deleteOne();
    res.json({ success: true, message: 'Match deleted' });
  } catch (error) { next(error); }
};

export const startMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    await match.startMatch(req.body);
    await match.populate(teamPopulateOptions); 
    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('matchStarted', match.toObject());
    res.json({ success: true, message: 'Match started', data: match });
  } catch (error) { next(error); }
};

export const selectPlayers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    const prevBowler = match.currentBowlerName;
    const prevStriker = match.strikerName;
    const prevNonStriker = match.nonStrikerName;

    // Snapshot batsmen BEFORE selectPlayers mutates their isOut/outType state
    const prevInn = match.innings?.[match.currentInnings - 1];
    const prevBatsmen: any[] = JSON.parse(JSON.stringify(prevInn?.batsmen || []));
    const prevBowlers: any[] = JSON.parse(JSON.stringify(prevInn?.bowlers || []));

    await match.selectPlayers(req.body);
    
    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('playersSelected', { striker: match.strikerName, nonStriker: match.nonStrikerName, bowler: match.currentBowlerName });
      
      const inn = match.innings?.[match.currentInnings - 1];

      if (req.body.bowler && req.body.bowler !== prevBowler && prevBowler) {
        // Use incoming bowler's existing stats (if they bowled before in this innings)
        const bowlerObj = prevBowlers.find((b: any) => b.name === req.body.bowler);
        const bowlerBalls = bowlerObj?.balls || 0;
        io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'NEW_BOWLER', duration: 8, data: {
          bowler: req.body.bowler, playerName: req.body.bowler,
          overs: `${Math.floor(bowlerBalls / 6)}.${bowlerBalls % 6}`,
          maidens: 0, runs: bowlerObj?.runs || 0, wickets: bowlerObj?.wickets || 0, economy: bowlerObj?.economy || 0
        }});
      }

      // Check each position separately so non-striker changes are handled correctly
      const strikerChanged = req.body.striker && req.body.striker !== prevStriker && prevStriker;
      const nonStrikerChanged = req.body.nonStriker && req.body.nonStriker !== prevNonStriker && prevNonStriker;

      const emitBatsmanAnim = (outName: string, inName: string) => {
        if (!outName) return;
        const outBatsman = prevBatsmen.find((b: any) => b.name === outName);
        const isRetired = outBatsman?.outType === 'retired_hurt' || outBatsman?.outType === 'retired';
        const isActualWicket = outBatsman?.isOut && !isRetired;
        if (isActualWicket) {
          io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'WICKET_SWITCH', duration: 8, data: {
            outName, howOut: (outBatsman?.outType || 'out').replace(/_/g, ' ').toUpperCase(),
            outRuns: outBatsman?.runs || 0, outBalls: outBatsman?.balls || 0,
            inName, inRuns: 0, inBalls: 0, isSub: false
          }});
        } else {
          io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'BATSMAN_CHANGE', duration: 8, data: {
            outName, howOut: isRetired ? 'Retired Hurt' : 'Substitution',
            outRuns: outBatsman?.runs || 0, outBalls: outBatsman?.balls || 0,
            inName, inRuns: 0, inBalls: 0, isSub: !isActualWicket
          }});
        }
      };

      if (strikerChanged) emitBatsmanAnim(prevStriker, req.body.striker);
      if (nonStrikerChanged) emitBatsmanAnim(prevNonStriker, req.body.nonStriker);
    }
    res.json({ success: true, message: 'Players selected' });
  } catch (error) { next(error); }
};

export const addBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    const result = await match.addBall(req.body);
    await match.populate(teamPopulateOptions); 

    let inningsEnded = result.inningsEnded;
    let matchEnded = result.matchEnded;

    // Automatic "All Out" check
    const currentInningsData = match.innings?.[match.currentInnings - 1];
    const battingTeam = match.currentInnings === 1 ? match.team1 : match.team2;
    const maxWickets = (battingTeam?.players?.length > 1 ? battingTeam.players.length : 11) - 1;

    if (!inningsEnded && currentInningsData && currentInningsData.wickets >= maxWickets) {
        await match.endInnings();
        inningsEnded = true;
        result.inningsEnded = true;
        result.ballDescription += ' (All Out)';
        
        if (match.currentInnings === 2) {
            matchEnded = true;
            result.matchEnded = true;
            const inn1Score = match.innings[0].score;
            const inn2Score = match.innings[1].score;
            if (inn1Score > inn2Score) {
                await match.endMatch(match.team1._id, match.team1.name, `${match.team1.name} won by ${inn1Score - inn2Score} runs`);
            } else if (inn2Score > inn1Score) {
                await match.endMatch(match.team2._id, match.team2.name, `${match.team2.name} won by ${maxWickets - match.innings[1].wickets + 1} wickets`);
            } else {
                await match.endMatch(null, 'DRAW', 'Match Tied');
            }
        }
        await match.save();
    }

    const allBatsmen = currentInningsData?.batsmen || [];
    const allBowlers = currentInningsData?.bowlers || [];

    const battingSummary = allBatsmen.map((b: any) => ({
      name: b.name, runs: b.runs ?? 0, balls: b.balls ?? 0, fours: b.fours ?? 0, sixes: b.sixes ?? 0, sr: b.strikeRate ?? 0, outStatus: b.isOut ? 'out' : 'not_out'
    }));

    const bowlingSummary = allBowlers.map((b: any) => ({
      name: b.name, overs: b.balls ? `${Math.floor(b.balls / 6)}.${b.balls % 6}` : '0.0', maidens: 0, runs: b.runs ?? 0, wkts: b.wickets ?? 0, econ: b.economy ?? 0
    }));

    let activeTrigger: any = null;
    
    // CRITICAL: We DO NOT trigger the wicket animation here anymore. 
    // It waits for selectPlayers (unless the innings/match is instantly over).
    if (result.isWicket || req.body.wicket) {
      if (inningsEnded || matchEnded) {
        const outName = result.outBatsmanName || req.body.outBatsmanName;
        const outBatsman = allBatsmen.find((b:any) => b.name === outName);
        activeTrigger = { type: 'WICKET_SWITCH', data: { outName: outName, howOut: result.outType || req.body.outType, outRuns: outBatsman?.runs || 0, outBalls: outBatsman?.balls || 0, isSub: false } };
      }
    } else if (result.isSix) {
      activeTrigger = { type: 'SIX', data: { playerName: match.strikerName } };
    } else if (result.isFour) {
      activeTrigger = { type: 'FOUR', data: { playerName: match.strikerName } };
    } else if (result.overChanged && !inningsEnded) {
      activeTrigger = { type: 'OVER_COMPLETE', data: { overNumber: result.completedOverNumber } };
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`match:${match._id}`).emit('scoreUpdate', {
        match: match.toObject(),
        result,
        overSummary: match.getOverSummary(),
        activeTrigger, 
        battingSummary, 
        bowlingSummary
      });

      if (inningsEnded && !matchEnded) {
        io.to(`match:${match._id}`).emit('inningsEnded', { match: match.toObject(), result });
        const target = (match.innings?.[0]?.score || 0) + 1;
        io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'INNINGS_BREAK', duration: 10, data: { chasingTeam: match.team2Name || "TEAM 2", targetScore: target } }); 
      }
      if (matchEnded) {
        io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
        io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'MATCH_END', data: { winnerTeam: match.winnerName, winMargin: match.resultSummary } });
      }
    }
    // Invalidate Redis cache so the next REST fetch gets live data
    if (match.tournamentId) {
      await cacheService.del(cacheService.getTournamentKey(match.tournamentId.toString())).catch(() => {});
      await cacheService.del(cacheService.getTournamentsListKey()).catch(() => {});
    }
    res.json({ success: true, data: result, match: match.toObject() });
  } catch (error) { next(error); }
};

export const undoLastBall = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    await match.undoLastBall();
    await match.populate(teamPopulateOptions);
    if (match.tournamentId) {
      await cacheService.del(cacheService.getTournamentKey(match.tournamentId.toString())).catch(() => {});
      await cacheService.del(cacheService.getTournamentsListKey()).catch(() => {});
    }
    const io = req.app.get('io');
    if (io) io.to(`match:${match._id}`).emit('scoreUpdate', { match: match.toObject(), result: null });
    res.json({ success: true, message: 'Last ball undone', data: match });
  } catch (error) { next(error); }
};

export const endInnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    await match.endInnings();
    if (match.tournamentId) {
      await cacheService.del(cacheService.getTournamentKey(match.tournamentId.toString())).catch(() => {});
      await cacheService.del(cacheService.getTournamentsListKey()).catch(() => {});
    }
    const io = req.app.get('io');
    if (io) {
        io.to(`match:${match._id}`).emit('inningsEnded', match.toObject());
        const target = (match.innings?.[0]?.score || 0) + 1;
        io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'INNINGS_BREAK', duration: 10, data: { chasingTeam: match.team2Name, targetScore: target } });
    }
    res.json({ success: true, message: 'Innings ended', data: match });
  } catch (error) { next(error); }
};

export const endMatch = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { winnerId, winnerName, resultSummary } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    await match.endMatch(winnerId, winnerName, resultSummary);
    await match.save();
    if (match.tournamentId) {
      await cacheService.del(cacheService.getTournamentKey(match.tournamentId.toString())).catch(() => {});
      await cacheService.del(cacheService.getTournamentsListKey()).catch(() => {});
    }
    const io = req.app.get('io');
    if (io) {
        io.to(`match:${match._id}`).emit('matchEnded', match.toObject());
        io.to(`match:${match._id}`).emit('overlayTrigger', { type: 'MATCH_END', data: { winnerTeam: match.winnerName, winMargin: match.resultSummary } });
    }
    res.json({ success: true, message: 'Match ended', data: match });
  } catch (error) { next(error); }
};

export const updateMatchStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const match = await Match.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, data: match });
  } catch (error) { next(error); }
};

export const getLiveMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matches = await Match.find({ status: 'live' }).populate('team1', 'name shortName logo').populate('team2', 'name shortName logo').populate('tournamentId', 'name').sort({ updatedAt: -1 });
    const valid = matches.filter(m => m.tournamentId === null || typeof m.tournamentId === 'object');
    res.json({ success: true, data: valid });
  } catch (error) { next(error); }
};

export default { getMatches, getMatch, createMatch, updateMatch, deleteMatch, startMatch, selectPlayers, addBall, undoLastBall, endInnings, endMatch, updateMatchStatus, getLiveMatches };