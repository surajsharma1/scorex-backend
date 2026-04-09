// ========== UNIFIED DATA NORMALIZER (ENHANCED WITH VALIDATION & FALLBACKS) ==========
window.normalizeScoreData = function(data) {
    if (!data) {
        console.warn('[OVERLAY UTILS] No data provided to normalizer');
        return {
            matchName: 'No Data',
            tournamentName: 'SCOREX LIVE',
            team1Name: 'Team 1', team1Score: 0, team1Wickets: 0, team1Overs: '0.0',
            team1ShortName: '', team2ShortName: '', thisOver: [],
            strikerName: '', strikerRuns: 0, strikerBalls: 0,
            nonStrikerName: '', nonStrikerRuns: 0, nonStrikerBalls: 0,
            bowlerName: 'Waiting Bowler...', bowlerRuns: 0, bowlerWickets: 0, bowlerOvers: '0.0',
            target: 0, runRate: '0.00', requiredRunRate: '0.00'
        };
    }

    let t1Score = Math.max(0, Number(data.team1Score) || 0);
    let t1Wickets = Math.max(0, Number(data.team1Wickets) || 0);
    let t1Overs = data.team1Overs || '0.0';
    let sRuns = Math.max(0, Number(data.strikerRuns) || 0);
    let sBalls = Math.max(0, Number(data.strikerBalls) || 0);
    let nsRuns = Math.max(0, Number(data.nonStrikerRuns) || 0);
    let nsBalls = Math.max(0, Number(data.nonStrikerBalls) || 0);
    let bRuns = Math.max(0, Number(data.bowlerRuns) || 0);
    let bWickets = Math.max(0, Number(data.bowlerWickets) || 0);
    let bOvers = data.bowlerOvers || '0.0';
    let target = Math.max(0, Number(data.target) || 0);
    let runRate = '0.00', reqRunRate = '0.00';

    // GUARANTEED FALLBACKS FOR MISSING DATA
    let safeBowlerName = data.currentBowlerName || data.bowlerName || 'Bowler';
    const safeTournamentName = data.tournament?.name || data.tournamentName || data.name || 'SCOREX LIVE';

    let validInning = null;
    if (data.innings && Array.isArray(data.innings) && data.innings.length > 0) {
        const rawIdx = Number(data.currentInnings || 1) - 1;
        const safeIdx = Math.max(0, Math.min(data.innings.length - 1, isNaN(rawIdx) ? 0 : rawIdx));
        
        validInning = data.innings[safeIdx];
        
        if (validInning.score != null && (isNaN(validInning.score) || validInning.score < 0)) validInning.score = 0;
        
        t1Score = Math.max(0, Number(validInning.score) || 0);
        t1Wickets = Math.max(0, Number(validInning.wickets) || 0);
        t1Overs = validInning.overs != null ? String(validInning.overs) : '0.0';
        
        if (validInning.batsmen && Array.isArray(validInning.batsmen)) {
            const striker = validInning.batsmen.find(b => b && b.name === data.strikerName) || {};
            sRuns = Math.max(0, Number(striker.runs) || 0);
            sBalls = Math.max(0, Number(striker.balls) || 0);
            
            const nonStriker = validInning.batsmen.find(b => b && b.name === data.nonStrikerName) || {};
            nsRuns = Math.max(0, Number(nonStriker.runs) || 0);
            nsBalls = Math.max(0, Number(nonStriker.balls) || 0);
        }
        
        if (validInning.bowlers && Array.isArray(validInning.bowlers)) {
            const bowler = validInning.bowlers.find(b => b && b.name === data.currentBowlerName) || { name: data.currentBowlerName || '' };
            bRuns = Math.max(0, Number(bowler.runs) || 0);
            bWickets = Math.max(0, Number(bowler.wickets) || 0);
            
            const bowlerBalls = Math.max(0, Number(bowler.balls) || 0);
            const bowlerOversNum = Math.floor(bowlerBalls / 6);
            const ballsInOver = bowlerBalls % 6;
            bOvers = bowlerBalls > 0 ? `${bowlerOversNum}.${ballsInOver}` : '0.0';
            
            if (bowler.name) safeBowlerName = bowler.name;
        }
        
        if (validInning.targetScore) target = Math.max(0, Number(validInning.targetScore));
        if (validInning.runRate != null) runRate = Number(validInning.runRate).toFixed(2);
        if (validInning.requiredRunRate != null) reqRunRate = Number(validInning.requiredRunRate).toFixed(2);
    }

    const computedMatchName = data.name || `${data.team1Name || 'Team 1'} vs ${data.team2Name || 'Team 2'}` || 'Live Match';

    return {
        matchName: computedMatchName,
        tournamentName: safeTournamentName,
        
        // Team Names & Truncation Handling
        team1Name: data.battingTeamName || data.team1Name || data.team1?.name || 'Team 1',
        team1ShortName: data.team1ShortName || data.team1?.shortName || '',
        team2ShortName: data.team2ShortName || data.team2?.shortName || '',
        
        // The newly connected "This Over" array for visual ball tracking
        thisOver: data.thisOver || [],

        // Core Match Stats
        team1Score: t1Score,
        team1Wickets: t1Wickets,
        team1Overs: t1Overs,
        strikerName: data.strikerName || '',
        strikerRuns: sRuns,
        strikerBalls: sBalls,
        nonStrikerName: data.nonStrikerName || '',
        nonStrikerRuns: nsRuns,
        nonStrikerBalls: nsBalls,
        bowlerName: safeBowlerName,
        bowlerRuns: bRuns,
        bowlerWickets: bWickets,
        bowlerOvers: bOvers,
        target: target,
        runRate: runRate,
        requiredRunRate: reqRunRate,
        status: data.status || 'LIVE',
        _raw: data
    };
};