/**
 * teamController.ts
 *
 * ID assignment rules
 * ───────────────────
 * Team number  — sequential within a tournament (1, 2, 3 …).
 *                Assigned atomically via findOneAndUpdate $inc so two
 *                concurrent requests never get the same number.
 *                Stored in Team.teamNumber.
 *
 * Player number — sequential within a team (1, 2, 3 …).
 *                 Assigned atomically via findOneAndUpdate $inc on
 *                 Team.nextPlayerNumber.  The (teamId, playerNumber)
 *                 pair is stored in Player.teamNumbers[] so the same
 *                 player can sit in many teams without any collision.
 */

import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Team from '../models/Team';
import Player from '../models/Player';
import Tournament from '../models/Tournament';

interface AuthRequest extends Request { user?: any; }

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the next sequential team number for a given tournament.
 * Counts existing teams in that tournament and adds 1.
 * Safe for normal usage — teams are never bulk-created in parallel.
 */
async function nextTeamNumber(tournamentId: mongoose.Types.ObjectId): Promise<number> {
  const count = await Team.countDocuments({ tournamentId });
  return count + 1;
}

/**
 * Returns the next sequential player number for a given team.
 * Atomically increments Team.nextPlayerNumber and returns the NEW value.
 */
async function nextPlayerNumber(teamId: mongoose.Types.ObjectId): Promise<number> {
  const updated = await Team.findByIdAndUpdate(
    teamId,
    { $inc: { nextPlayerNumber: 1 } },
    { new: true }
  );
  return updated?.nextPlayerNumber ?? 1;
}

// ─── Controllers ──────────────────────────────────────────────────────────

export const createTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, shortName, players, captain, tournamentId } = req.body;

    let tId: mongoose.Types.ObjectId | undefined;
    if (tournamentId) tId = new mongoose.Types.ObjectId(tournamentId);

    // Retry loop: if two teams are created at the exact same millisecond the
    // countDocuments result can be equal, causing a duplicate-key on teamNumber.
    // We catch that specific error and simply try the next number.
    let team: any = null;
    let attempts = 0;
    while (!team && attempts < 5) {
      attempts++;
      const teamNum = tId ? await nextTeamNumber(tId) : 0;
      try {
        team = await Team.create({
          name,
          shortName,
          players,
          captain,
          tournamentId: tId,
          teamNumber:   teamNum,
        });
      } catch (err: any) {
        // E11000 = duplicate key — teamNumber collision, retry with fresh count
        if (err.code === 11000 && err.keyPattern?.teamNumber) continue;
        throw err; // any other error re-throw immediately
      }
    }

    if (!team) {
      return res.status(500).json({ success: false, message: 'Could not assign a unique team number after retries' });
    }

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
      .populate({
        path: 'players',
        select: 'name role jerseyNumber teamNumbers',
      })
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
      .populate({
        path: 'players',
        select: 'name role jerseyNumber teamNumbers',
      })
      .populate('captain tournamentId matches', 'name shortName');

    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export const updateTeam = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Prevent overwriting system-managed fields
    const { teamNumber, nextPlayerNumber: _, ...safeBody } = req.body;

    const team = await Team.findByIdAndUpdate(
      req.params.id,
      safeBody,
      { new: true, runValidators: true }
    ).populate('players captain');

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
    const team   = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    let player: any;

    if (req.body.playerId) {
      // ── Existing player being added to this team ──
      const pid = new mongoose.Types.ObjectId(req.body.playerId);
      player    = await Player.findById(pid);
      if (!player) return res.status(404).json({ success: false, message: 'Player not found' });

      // Guard: already on this team
      const alreadyInTeam = team.players.some((p: mongoose.Types.ObjectId) => p.equals(pid));
      if (alreadyInTeam) {
        return res.status(400).json({ success: false, message: 'Player is already in this team' });
      }

      // Assign a new player number for this team membership
      const pNum = await nextPlayerNumber(teamId);

      // Update the player's teamNumbers array
      await Player.findByIdAndUpdate(pid, {
        $push: {
          teams:       teamId,
          teamNumbers: { teamId, playerNumber: pNum },
        },
      });

    } else if (req.body.name && req.body.role) {
      // ── Brand-new player being created and added to this team ──
      const pNum = await nextPlayerNumber(teamId);

      player = await Player.create({
        name:         req.body.name,
        role:         req.body.role,
        jerseyNumber: req.body.jerseyNumber ? Number(req.body.jerseyNumber) : undefined,
        isActive:     true,
        teams:        [teamId],
        teamNumbers:  [{ teamId, playerNumber: pNum }],
      });

    } else {
      return res.status(400).json({
        success: false,
        message: 'Provide either playerId (existing) or name + role (new player)',
      });
    }

    // Add to team's players array
    await team.addPlayer(player._id);

    // Return populated team
    await team.populate({
      path:   'players',
      select: 'name role jerseyNumber teamNumbers',
    });
    await team.populate('captain', 'name role');

    res.json({ success: true, data: team });
  } catch (error: any) { next(error); }
};

export const removePlayer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teamId   = new mongoose.Types.ObjectId(req.params.id);
    const playerId = new mongoose.Types.ObjectId(req.params.playerId);

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    // Remove the team from the player's membership arrays
    await Player.findByIdAndUpdate(playerId, {
      $pull: {
        teams:       teamId,
        teamNumbers: { teamId },
      },
    });

    await team.removePlayer(playerId);
    await team.populate('players');
    res.json({ success: true, data: team });
  } catch (error) { next(error); }
};

export default { createTeam, getTeams, getTeam, updateTeam, deleteTeam, addPlayer, removePlayer };