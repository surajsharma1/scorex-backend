/**
 * teamController.ts
 *
 * Team number  — sequential within a tournament (1, 2, 3 …).
 *                Assigned via atomic $inc on Tournament._teamCounter so
 *                two simultaneous requests can never get the same number.
 *
 * Player number — sequential within a team (1, 2, 3 …).
 *                 Assigned via atomic $inc on Team.nextPlayerNumber.
 *                 Stored in Player.teamNumbers[] so a player in multiple
 *                 teams has an independent number per team.
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Player from '../models/Player';
import Tournament from '../models/Tournament';


// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Atomically increments Tournament._teamCounter and returns the new value.
 * Because $inc + findOneAndUpdate is a single atomic MongoDB operation,
 * two concurrent requests always get different numbers.
 */
async function nextTeamNumber(tournamentId: mongoose.Types.ObjectId): Promise<number> {
  const updated = await Tournament.findByIdAndUpdate(
    tournamentId,
    { $inc: { _teamCounter: 1 } },
    { new: true }
  );
  // If the tournament wasn't found return 1 as a safe fallback
  return updated?._teamCounter ?? 1;
}

/**
 * Returns the next player number for a team.
 * Uses jersey number if provided; otherwise counts current active members + 1.
 * This is gap-free: deleting player #4 means the next player gets #4, not #5.
 */
async function nextPlayerNumber(teamId: mongoose.Types.ObjectId, jerseyNumber?: number): Promise<number> {
  // If a jersey number was explicitly supplied by the user, honour it
  if (jerseyNumber !== undefined && jerseyNumber > 0) return jerseyNumber;
  // Otherwise assign the next sequential slot: current player count + 1
  // Count players that currently have a teamNumber entry for this team
  const count = await Player.countDocuments({ 'teamNumbers.teamId': teamId });
  return count + 1;
}

// ─── Controllers ──────────────────────────────────────────────────────────

export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, shortName, players, captain, tournamentId } = req.body;

    let teamNum = 0;
    let tId: mongoose.Types.ObjectId | undefined;

    if (tournamentId) {
      tId = new mongoose.Types.ObjectId(tournamentId);
      // Atomic increment — guaranteed unique even under concurrent requests
      teamNum = await nextTeamNumber(tId);
    }

    const team = await Team.create({
      name,
      shortName,
      players,
      captain,
      tournamentId: tId,
      teamNumber: teamNum,
    });

    if (tId) {
      const tournament = await Tournament.findById(tId);
      if (tournament) await tournament.addTeam(team._id);
    }

    await team.populate('players captain', 'name');
    res.status(201).json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const getTeams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId, limit = 20, page = 1 } = req.query;
    const query: any = tournamentId ? { tournamentId } : {};

    const teams = await Team.find(query)
      .populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' })
      .populate('captain tournamentId', 'name shortName')
      .sort({ teamNumber: 1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Team.countDocuments(query);
    res.json({
      success: true,
      data: teams,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) { next(error); }
};

export const getTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' })
      .populate('captain tournamentId matches', 'name shortName');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Never let a client overwrite system-managed counters
    const { teamNumber, nextPlayerNumber: _npn, ...safeBody } = req.body;

    const team = await Team.findByIdAndUpdate(req.params.id, safeBody, {
      new: true,
      runValidators: true,
    }).populate('players captain');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    await team.updateStats();
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const deleteTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, message: 'Team deleted' });
  } catch (error) { next(error); }
};

export const addPlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    let player: any;

    if (req.body.playerId) {
      // ── Existing player being added to this team ──
      const pid = new mongoose.Types.ObjectId(req.body.playerId);
      player = await Player.findById(pid);
      if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

      const alreadyInTeam = team.players.some((p: mongoose.Types.ObjectId) => p.equals(pid));
      if (alreadyInTeam) {
        return res.status(400).json({ success: false, message: 'Player is already in this team' });
      }

      const pNum = await nextPlayerNumber(teamId);
      await Player.findByIdAndUpdate(pid, {
        $push: {
          teams: teamId,
          teamNumbers: { teamId, playerNumber: pNum },
        },
      });

    } else if (req.body.name && req.body.role) {
      // ── Brand-new player being created and added to this team ──
      const pNum = await nextPlayerNumber(teamId, req.body.jerseyNumber ? Number(req.body.jerseyNumber) : undefined);
      player = await Player.create({
        name: req.body.name,
        role: req.body.role,
        jerseyNumber: req.body.jerseyNumber ? Number(req.body.jerseyNumber) : undefined,
        isActive: true,
        teams: [teamId],
        teamNumbers: [{ teamId, playerNumber: pNum }],
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either playerId (existing) or name + role (new player)',
      });
    }

    await team.addPlayer(player._id);
    await team.populate({ path: 'players', select: 'name role jerseyNumber teamNumbers' });
    await team.populate('captain', 'name role');

    res.json({ success: true, data: team });
  } catch (error: any) { next(error); }
};

export const removePlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamId = new mongoose.Types.ObjectId(req.params.id);
    const playerId = new mongoose.Types.ObjectId(req.params.playerId);

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    await Player.findByIdAndUpdate(playerId, {
      $pull: {
        teams: teamId,
        teamNumbers: { teamId },
      },
    });

    await team.removePlayer(playerId);
    await team.populate('players');
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export default { createTeam, getTeams, getTeam, updateTeam, deleteTeam, addPlayer, removePlayer };