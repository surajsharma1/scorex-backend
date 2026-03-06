import { Request, Response, NextFunction } from 'express';
import Match, { IBall } from '../models/Match';

export const createMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    
    // Map frontend field names to backend field names
    const matchData = {
      tournamentId: req.body.tournament || req.body.tournamentId,
      matchName: req.body.matchName || `Match ${new Date().toLocaleDateString()}`,
      teamA: req.body.team1 || req.body.teamA,
      teamB: req.body.team2 || req.body.teamB,
      venue: req.body.venue || 'TBD',
      matchDate: req.body.date || req.body.matchDate || new Date(),
      format: req.body.format || req.body.matchType || 'Club',
      maxOvers: req.body.maxOvers || 20,
      playersPerSide: req.body.playersPerSide || 11,
      videoLink: req.body.videoLink || req.body.videoLinks?.[0] || '',
      videoLinks: req.body.videoLinks || [],
    };

    const match = await Match.create({ ...matchData, createdBy: userId });
    res.status(201).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const startMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tossWinnerId, decision } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const battingTeamId = decision === 'Bat' ? tossWinnerId : 
                          (tossWinnerId.toString() === match.teamA.toString() ? match.teamB : match.teamA);
    const bowlingTeamId = battingTeamId.toString() === match.teamA.toString() ? match.teamB : match.teamA;

    match.toss = { winner: tossWinnerId, decision };
    match.status = 'First Innings';
    match.currentInnings = 1;
    match.firstInnings = {
      battingTeam: battingTeamId, bowlingTeam: bowlingTeamId,
      totalRuns: 0, totalWickets: 0, totalOversBowled: 0, extrasTotal: 0, ballByBall: []
    };

    await match.save();
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const scoreBall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id; // Correctly mapped
    const ballData: IBall = req.body; 
    
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    // Auto-start match if not active (allows scoring without explicit toss)
    if (!['First Innings', 'Second Innings'].includes(match.status)) {
      // Default: Team A bats first, Team B bowls
      match.status = 'First Innings';
      match.currentInnings = 1;
      match.toss = { winner: match.teamA, decision: 'Bat' };
      match.firstInnings = {
        battingTeam: match.teamA,
        bowlingTeam: match.teamB,
        totalRuns: 0,
        totalWickets: 0,
        totalOversBowled: 0,
        extrasTotal: 0,
        ballByBall: []
      };
      await match.save();
    }

    const innings = match.currentInnings === 1 ? match.firstInnings! : match.secondInnings!;
    
    const totalRunsFromBall = ballData.runsOffBat + ballData.extras;
    innings.totalRuns += totalRunsFromBall;
    innings.extrasTotal += ballData.extras;

    if (ballData.isWicket) {
      if (ballData.wicketType === 'Over the Fence' && match.customRules.overTheFenceOut) {
        innings.totalRuns -= totalRunsFromBall; 
      }
      innings.totalWickets += 1;
    }

    innings.ballByBall.push(ballData);

    const validBalls = innings.ballByBall.filter(b => !['WD', 'NB', 'Penalty'].includes(b.extraType)).length;
    innings.totalOversBowled = Math.floor(validBalls / 6) + ((validBalls % 6) / 10);

    const allOutWickets = match.customRules.lastManStanding ? match.playersPerSide : match.playersPerSide - 1;
    
    if (innings.totalWickets >= allOutWickets || Math.floor(validBalls / 6) >= match.maxOvers) {
      if (match.currentInnings === 1) {
        match.status = 'Second Innings';
        match.currentInnings = 2;
        match.secondInnings = {
          battingTeam: innings.bowlingTeam, bowlingTeam: innings.battingTeam,
          totalRuns: 0, totalWickets: 0, totalOversBowled: 0, extrasTotal: 0, ballByBall: []
        };
      } else {
        match.status = 'Completed';
      }
    }

    await match.save();

    // Broadcast update to both room formats for compatibility
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('match_updated', match);
      io.to(`match:${matchId}`).emit('match_updated', match);
    }

    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const undoLastBall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id; // Defined matchId for the broadcast
    const match = await Match.findById(matchId);
    
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });

    const innings = match.currentInnings === 1 ? match.firstInnings! : match.secondInnings!;
    
    if (innings.ballByBall.length === 0) {
      return res.status(400).json({ success: false, message: 'No balls to undo' });
    }

    innings.ballByBall.pop();

    let recalculatedRuns = 0;
    let recalculatedWickets = 0;
    let recalculatedExtras = 0;
    let validBalls = 0;

    innings.ballByBall.forEach(ball => {
      let ballRuns = ball.runsOffBat + ball.extras;
      if (ball.isWicket) {
        recalculatedWickets += 1;
        if (ball.wicketType === 'Over the Fence' && match.customRules.overTheFenceOut) ballRuns = 0;
      }
      recalculatedRuns += ballRuns;
      recalculatedExtras += ball.extras;
      if (!['WD', 'NB', 'Penalty'].includes(ball.extraType)) validBalls += 1;
    });

    innings.totalRuns = recalculatedRuns;
    innings.totalWickets = recalculatedWickets;
    innings.extrasTotal = recalculatedExtras;
    innings.totalOversBowled = Math.floor(validBalls / 6) + ((validBalls % 6) / 10);

    if (match.status === 'Completed' || (match.status === 'Second Innings' && match.currentInnings === 1)) {
       // Logic to revert status back to Live if needed
    }

    await match.save();

    // Broadcast undo to both room formats for compatibility
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('match_updated', match);
      io.to(`match:${matchId}`).emit('match_updated', match);
    }

    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const getMatchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findById(req.params.id).populate('teamA').populate('teamB');
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const getAllMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournament, status } = req.query;
    
    // Build filter object - Note: Match model uses 'tournamentId' not 'tournament'
    const filter: any = {};
    if (tournament) {
      filter.tournamentId = tournament;
    }
    if (status) {
      filter.status = status;
    }

    const matches = await Match.find(filter)
      .populate('teamA')
      .populate('teamB')
      .populate('tournamentId')
      .sort({ createdAt: -1 });

    res.status(200).json({ 
      success: true, 
      data: matches,
      count: matches.length 
    });
  } catch (error) {
    next(error);
  }
};
