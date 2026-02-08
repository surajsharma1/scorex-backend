import { Request, Response } from 'express';
import Tournament from '../models/Tournament';
import auditLogger from '../utils/auditLogger';
import cacheService from '../utils/cache';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: any;
}

export const getTournaments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Create cache key with pagination
    const cacheKey = `${cacheService.getTournamentsListKey()}:page${page}:limit${limit}`;
    const cachedResult = await cacheService.getJSON(cacheKey);

    if (cachedResult) {
      res.json(cachedResult);
      return;
    }

    const total = await Tournament.countDocuments();
    const tournaments = await Tournament.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const result = {
      tournaments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    };

    // Cache for 5 minutes
    await cacheService.setJSON(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('createdBy', 'username');
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createTournament = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Creating tournament with data:', req.body); // Debug log
    const tournament = await Tournament.create({
      ...req.body,
      createdBy: req.user?._id,
    });
    console.log('Tournament created:', tournament); // Debug log

    // Invalidate tournaments list cache
    await cacheService.del(cacheService.getTournamentsListKey());

    res.status(201).json(tournament);
  } catch (error: any) {
    console.error('Create tournament error:', error.message); // Detailed error
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const updateTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTournament = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { deleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }

    // Audit log tournament deletion
    auditLogger.logUserAction(
      (req as any).user?._id.toString(),
      'TOURNAMENT_DELETED',
      'Tournament',
      req.params.id,
      { name: tournament.name },
      req.ip,
      req.get('User-Agent')
    );

    // Invalidate caches
    await cacheService.del(cacheService.getTournamentsListKey());
    await cacheService.del(cacheService.getTournamentKey(req.params.id));

    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    logger.error('Delete tournament error:', { error: error instanceof Error ? error.message : 'Unknown error', tournamentId: req.params.id });
    auditLogger.logSystemAction('TOURNAMENT_DELETION_ERROR', 'Tournament', req.params.id, { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({ message: 'Server error' });
  }
};

export const goLive = async (req: Request, res: Response): Promise<void> => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { isLive: true }, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateLiveScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { scores } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, { liveScores: scores }, { new: true });
    if (!tournament) {
      res.status(404).json({ message: 'Tournament not found' });
      return;
    }
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};