import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';


export const createTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'admin';

    // Non-admin users may only have 1 active tournament at a time
    if (!isAdmin) {
      const existing = await Tournament.countDocuments({
        organizer: req.user?._id,
        status: { $in: ['upcoming', 'ongoing'] },
      });
      if (existing >= 1) {
        return res.status(400).json({
          success: false,
          message: 'You already have an active tournament. Complete or delete it before creating a new one.',
        });
      }
    }

    const tournament = await Tournament.create({ ...req.body, organizer: req.user?._id });
    res.status(201).json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const getTournaments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    const tournaments = await Tournament.find(query).populate('organizer', 'username').populate('teams', 'name shortName').sort({ createdAt: -1 });
    res.json({ success: true, data: tournaments });
  } catch (error) { next(error); }
};

export const getMyTournaments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournaments = await Tournament.find({ organizer: req.user?._id }).populate('teams', 'name shortName').sort({ createdAt: -1 });
    res.json({ success: true, data: tournaments });
  } catch (error) { next(error); }
};

export const getTournamentById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('organizer', 'username email')
      .populate('teams', 'name shortName logo stats tournamentStats')
      .populate({ path: 'matches', populate: [{ path: 'team1', select: 'name shortName' }, { path: 'team2', select: 'name shortName' }] });
    if (!tournament) return res.status(404).json({ success: false, message: 'Tournament not found' });
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const updateTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findOneAndUpdate({ _id: req.params.id, organizer: req.user?._id }, req.body, { new: true, runValidators: true });
    if (!tournament) return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};
export const deleteTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const query = isAdmin
      ? { _id: req.params.id }
      : { _id: req.params.id, organizer: req.user?._id };

    const tournamentDoc = await Tournament.findOne(query);
    if (!tournamentDoc) return res.status(404).json({ success: false, message: 'Not found or unauthorized' });

    const tid = tournamentDoc._id;

    // ✅ FIX: was { tournament: tid } — field is tournamentId
    await Match.deleteMany({ tournamentId: tid });

    // ✅ Also clean up overlays and teams linked to this tournament
    const Overlay = (await import('../models/Overlay')).default;
    await Overlay.deleteMany({ tournament: tid });

    await Team.deleteMany({ tournament: tid });
    await Tournament.findByIdAndDelete(tid);

    res.json({ success: true, message: 'Tournament and all associated data deleted' });
  } catch (error) { next(error); }
};
export const generateBracket = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ success: false, message: 'Not found' });
    await tournament.generateBracket();
    res.json({ success: true, data: tournament.bracket });
  } catch (error) { next(error); }
};

export const startTournament = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { status: 'ongoing' }, { new: true });
    res.json({ success: true, data: tournament });
  } catch (error) { next(error); }
};

export const getTournamentMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const Match = (await import('../models/Match')).default;
    const matches = await Match.find({ tournamentId: req.params.id })
      .populate([
        { path: 'team1', select: 'name shortName logo' },
        { path: 'team2', select: 'name shortName logo' }
      ])
      .sort({ date: -1 });
    if (matches.length === 0) {
      return res.json({ success: true, data: [] });
    }
    res.json({ success: true, data: matches });
  } catch (error: any) { next(error); }
};

export const getPointsTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('teams');
    if (!tournament) return res.status(404).json({ success: false, message: 'Not found' });
    const matches = await Match.find({ tournamentId: req.params.id, status: 'completed' });
    const teamMap: Record<string, any> = {};
    (tournament.teams as any[]).forEach(team => {
      teamMap[team._id.toString()] = { _id: team._id, name: team.name, shortName: team.shortName, played: 0, won: 0, lost: 0, tied: 0, nr: 0, points: 0, runsFor: 0, oversFor: 0, runsAgainst: 0, oversAgainst: 0, nrr: 0 };
    });
    matches.forEach(match => {
      const t1 = match.team1.toString(), t2 = match.team2.toString();
      if (!teamMap[t1] || !teamMap[t2]) return;
      teamMap[t1].played++; teamMap[t2].played++;
      teamMap[t1].runsFor += match.team1Score || 0; teamMap[t1].oversFor += match.team1Overs || 0;
      teamMap[t1].runsAgainst += match.team2Score || 0; teamMap[t1].oversAgainst += match.team2Overs || 0;
      teamMap[t2].runsFor += match.team2Score || 0; teamMap[t2].oversFor += match.team2Overs || 0;
      teamMap[t2].runsAgainst += match.team1Score || 0; teamMap[t2].oversAgainst += match.team1Overs || 0;
      if (match.winner) {
        const w = match.winner.toString(), l = w === t1 ? t2 : t1;
        if (teamMap[w]) { teamMap[w].won++; teamMap[w].points += 2; }
        if (teamMap[l]) teamMap[l].lost++;
      } else { teamMap[t1].nr++; teamMap[t2].nr++; /* No points for no-result */ }

    });
    Object.values(teamMap).forEach((team: any) => {
      const rpf = team.oversFor > 0 ? team.runsFor / team.oversFor : 0;
      const rpa = team.oversAgainst > 0 ? team.runsAgainst / team.oversAgainst : 0;
      team.nrr = parseFloat((rpf - rpa).toFixed(3));
    });
    const table = Object.values(teamMap).sort((a: any, b: any) => b.points - a.points || b.nrr - a.nrr);
    res.json({ success: true, data: table });
  } catch (error) { next(error); }
};

export default { createTournament, getTournaments, getMyTournaments, getTournamentById, updateTournament, deleteTournament, generateBracket, startTournament, getPointsTable, getTournamentMatches };
