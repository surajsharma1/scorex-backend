import { Request, Response, NextFunction } from 'express';
import Match, { IBall } from '../models/Match';
import logger from '../utils/logger';

export const createMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?._id || (req as any).user?.id;
    
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

export const getMatchById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Populate teams AND their players with explicit select
    const match = await Match.findById(req.params.id)
      .populate({
        path: 'teamA',
        select: 'name color players logo shortName statistics',
        populate: {
          path: 'players',
          select: 'name role jerseyNumber image stats',
          model: 'Player'
        }
      })
      .populate({
        path: 'teamB',
        select: 'name color players logo shortName statistics',
        populate: {
          path: 'players',
          select: 'name role jerseyNumber image stats',
          model: 'Player'
        }
      })
      .populate('tournamentId', 'name status type');
    
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    // Log for debugging
    logger.info('Match retrieved:', {
      matchId: req.params.id,
      teamA: match.teamA?.name,
      teamAPlayers: match.teamA?.players?.length,
      teamB: match.teamB?.name,
      teamBPlayers: match.teamB?.players?.length
    });
    
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

export const getAllMatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournament, status } = req.query;
    
    const filter: any = {};
    if (tournament) {
      filter.tournamentId = tournament;
    }
    if (status) {
      filter.status = status;
    }

    const matches = await Match.find(filter)
      .populate({
        path: 'teamA',
        select: 'name color players logo shortName statistics',
        populate: {
          path: 'players',
          select: 'name role jerseyNumber image stats',
          model: 'Player'
        }
      })
      .populate({
        path: 'teamB',
        select: 'name color players logo shortName statistics',
        populate: {
          path: 'players',
          select: 'name role jerseyNumber image stats',
          model: 'Player'
        }
      })
      .populate('tournamentId', 'name status type')
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

// Save toss winner and decision (Bat/Bowl)
export const saveToss = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tossWinnerId, decision } = req.body;
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    match.toss = {
      winner: tossWinnerId,
      decision: decision
    };
    match.status = 'Toss Completed';

    await match.save();
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

// Save player selections (batting order, bowling order, striker, non-striker, bowler)
export const savePlayerSelections = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      battingOrder, 
      bowlingOrder, 
      striker, 
      nonStriker, 
      bowler 
    } = req.body;
    
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    // Initialize innings if not exists
    if (!match.firstInnings) {
      match.firstInnings = {
        battingTeam: match.teamA,
        bowlingTeam: match.teamB,
        totalRuns: 0,
        totalWickets: 0,
        totalOversBowled: 0,
        extrasTotal: 0,
        ballByBall: []
      };
    }

    // Store player selections in match data
    (match as any).battingOrder = battingOrder || [];
    (match as any).bowlingOrder = bowlingOrder || [];
    (match as any).currentStriker = striker;
    (match as any).currentNonStriker = nonStriker;
    (match as any).currentBowler = bowler;

    await match.save();
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

// Change bowler after each over
export const changeBowler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newBowler } = req.body;
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    (match as any).currentBowler = newBowler;
    await match.save();
    
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

// Update striker after wicket
export const updateStriker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newStriker } = req.body;
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    (match as any).currentStriker = newStriker;
    await match.save();
    
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

// Update non-striker
export const updateNonStriker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { newNonStriker } = req.body;
    const match = await Match.findById(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    (match as any).currentNonStriker = newNonStriker;
    await match.save();
    
    res.status(200).json({ success: true, data: match });
  } catch (error) {
    next(error);
  }
};

// Start match after toss
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

// Score a ball
export const scoreBall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id;
    const ballData: IBall = req.body; 
    
    const match = await Match.findById(matchId);
    if (!match) return res.status(404).json({ success: false, message: 'Match not found' });
    
    // Auto-start match if not active
    if (!['First Innings', 'Second Innings'].includes(match.status)) {
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

    // Broadcast update
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

// Undo last ball
export const undoLastBall = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id;
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

    await match.save();

    // Broadcast undo
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

// Delete a match
export const deleteMatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    
    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    
    res.status(200).json({ success: true, message: 'Match deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get tournament statistics
export const getTournamentStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tournamentId } = req.params;
    
    const matches = await Match.find({ tournamentId })
      .populate('teamA')
      .populate('teamB');
    
    // Aggregate player statistics from all matches
    const playerStats: { [key: string]: any } = {};
    
    matches.forEach(match => {
      // Process first innings
      if (match.firstInnings?.ballByBall) {
        match.firstInnings.ballByBall.forEach((ball: IBall) => {
          // Track striker stats
          const strikerKey = typeof ball.striker === 'string' ? ball.striker : (ball.striker as any)?._id || 'unknown';
          if (!playerStats[strikerKey]) {
            playerStats[strikerKey] = {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              overs: 0,
              matches: 0
            };
          }
          playerStats[strikerKey].runs += ball.runsOffBat;
          if (!['WD', 'NB'].includes(ball.extraType)) {
            playerStats[strikerKey].balls += 1;
          }
          if (ball.runsOffBat === 4) playerStats[strikerKey].fours += 1;
          if (ball.runsOffBat === 6) playerStats[strikerKey].sixes += 1;
          playerStats[strikerKey].matches = (playerStats[strikerKey].matches || 0) + 1;
          
          // Track bowler stats
          const bowlerKey = typeof ball.bowler === 'string' ? ball.bowler : (ball.bowler as any)?._id || 'unknown';
          if (!playerStats[bowlerKey]) {
            playerStats[bowlerKey] = {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              overs: 0,
              matches: 0
            };
          }
          playerStats[bowlerKey].runs += ball.runsOffBat + ball.extras;
          if (!['WD', 'NB'].includes(ball.extraType)) {
            playerStats[bowlerKey].overs += 1;
          }
          if (ball.isWicket && ball.wicketType !== 'Run Out') {
            playerStats[bowlerKey].wickets += 1;
          }
        });
      }
      
      // Process second innings
      if (match.secondInnings?.ballByBall) {
        match.secondInnings.ballByBall.forEach((ball: IBall) => {
          const strikerKey = typeof ball.striker === 'string' ? ball.striker : (ball.striker as any)?._id || 'unknown';
          if (!playerStats[strikerKey]) {
            playerStats[strikerKey] = {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              overs: 0,
              matches: 0
            };
          }
          playerStats[strikerKey].runs += ball.runsOffBat;
          if (!['WD', 'NB'].includes(ball.extraType)) {
            playerStats[strikerKey].balls += 1;
          }
          if (ball.runsOffBat === 4) playerStats[strikerKey].fours += 1;
          if (ball.runsOffBat === 6) playerStats[strikerKey].sixes += 1;
          
          const bowlerKey = typeof ball.bowler === 'string' ? ball.bowler : (ball.bowler as any)?._id || 'unknown';
          if (!playerStats[bowlerKey]) {
            playerStats[bowlerKey] = {
              runs: 0,
              balls: 0,
              fours: 0,
              sixes: 0,
              wickets: 0,
              overs: 0,
              matches: 0
            };
          }
          playerStats[bowlerKey].runs += ball.runsOffBat + ball.extras;
          if (!['WD', 'NB'].includes(ball.extraType)) {
            playerStats[bowlerKey].overs += 1;
          }
          if (ball.isWicket && ball.wicketType !== 'Run Out') {
            playerStats[bowlerKey].wickets += 1;
          }
        });
      }
    });

    // Convert to array and sort
    const statsArray = Object.entries(playerStats).map(([playerId, stats]: [string, any]) => ({
      playerId,
      ...stats,
      strikeRate: stats.balls > 0 ? (stats.runs / stats.balls * 100).toFixed(2) : '0.00',
      economy: stats.overs > 0 ? (stats.runs / (stats.overs / 6)).toFixed(2) : '0.00'
    }));

    // Sort by runs (default)
    statsArray.sort((a, b) => b.runs - a.runs);

    res.status(200).json({ 
      success: true, 
      data: {
        matches: matches.length,
        playerStats: statsArray
      }
    });
  } catch (error) {
    next(error);
  }
};

