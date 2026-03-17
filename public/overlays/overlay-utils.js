// ========== UNIFIED DATA NORMALIZER ==========
// This function digs into the complex Mongoose document (especially the 'innings' array)
// and flattens it into the simple variables expected by the HTML overlay templates.

window.normalizeScoreData = function(data) {
    if (!data) return null;

    // 1. Set up fallback defaults
    let t1Score = data.team1Score || 0;
    let t1Wickets = data.team1Wickets || 0;
    let t1Overs = data.team1Overs || '0.0';
    let sRuns = data.strikerRuns || 0, sBalls = data.strikerBalls || 0;
    let nsRuns = data.nonStrikerRuns || 0, nsBalls = data.nonStrikerBalls || 0;
    let bRuns = data.bowlerRuns || 0, bWickets = data.bowlerWickets || 0, bOvers = data.bowlerOvers || '0.0';
    let target = data.target || 0;
    let runRate = data.runRate || '0.00', reqRunRate = data.requiredRunRate || '0.00';

    // 2. THE MAGIC: Extract live stats from the active Mongoose 'innings' array
    if (data.innings && data.innings.length > 0) {
        const currentInningIdx = (data.currentInnings || 1) - 1;
        const currentInning = data.innings[currentInningIdx] || data.innings[0];

        t1Score = currentInning.score || 0;
        t1Wickets = currentInning.wickets || 0;
        t1Overs = currentInning.overs || '0.0';

        if (currentInning.targetScore) target = currentInning.targetScore;
        if (currentInning.runRate) runRate = currentInning.runRate.toFixed(2);
        if (currentInning.requiredRunRate) reqRunRate = currentInning.requiredRunRate.toFixed(2);

        // Find current Striker & Non-Striker from the active lineup
        if (currentInning.batsmen) {
            const striker = currentInning.batsmen.find(b => b.name === data.strikerName);
            if (striker) { sRuns = striker.runs; sBalls = striker.balls; }
            
            const nonStriker = currentInning.batsmen.find(b => b.name === data.nonStrikerName);
            if (nonStriker) { nsRuns = nonStriker.runs; nsBalls = nonStriker.balls; }
        }

        // Find current Bowler
        if (currentInning.bowlers) {
            const bowler = currentInning.bowlers.find(b => b.name === data.currentBowlerName);
            if (bowler) {
                bRuns = bowler.runs;
                bWickets = bowler.wickets;
                // Format overs properly (e.g., 1.4)
                bOvers = bowler.balls > 0 && bowler.balls < 6 ? `${bowler.overs}.${bowler.balls}` : `${bowler.overs}`;
            }
        }
    }

    // 3. Return the perfectly flattened object the HTML overlays expect
    return {
        matchName: data.name || `${data.team1Name || data.team1?.name || '?'} vs ${data.team2Name || data.team2?.name || '?'}` || 'Live Match',
        tournamentName: data.tournament?.name || data.tournamentName || 'Live Match',
        team1Name: data.battingTeamName || data.team1Name || data.team1?.name || data.team1?.shortName || 'Team 1',

        team1Score: t1Score,
        team1Wickets: t1Wickets,
        team1Overs: t1Overs,
        team2Name: data.bowlingTeamName || data.team2Name || data.team2?.name || data.team2?.shortName || 'Team 2',
        team2Score: data.team2Score || 0,
        team2Wickets: data.team2Wickets || 0,
        team2Overs: data.team2Overs || '0.0',
        strikerName: data.strikerName || '',
        strikerRuns: sRuns,
        strikerBalls: sBalls,
        nonStrikerName: data.nonStrikerName || '',
        nonStrikerRuns: nsRuns,
        nonStrikerBalls: nsBalls,
        bowlerName: data.currentBowlerName || data.bowlerName || '',
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

// 0. Add matchName field to normalized output
        matchName: data.name || `${data.team1Name || data.team1?.name || '?'} vs ${data.team2Name || data.team2?.name || '?'}` || 'Live Match',

// Optional: Keep your existing safeSetText helper just in case any custom templates use it
window.safeSetText = function(id, text) {
    const el = document.getElementById(id);
    if (el && text !== undefined && text !== null) el.textContent = text;
};

