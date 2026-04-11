// ========== SCOREX DATA NORMALIZER (BULLETPROOF PAYLOAD MATCHING) ==========
window.normalizeScoreData = function(data) {
    if (!data) return getFallbackData();

    // 1. Safely extract root objects (Handles both nested and flat payloads)
    const matchObj = data.match || data;
    const resultObj = data.result || {};

    // 2. Identify active batting team (Innings 1 = Team 1, Innings 2 = Team 2)
    let isTeam2Batting = matchObj.currentInnings === 2 || (matchObj.team2Score > 0 && matchObj.team1Score === 0);

    // 3. Extract Real-Time Scores (Prioritizing the high-speed 'result' object)
    let t1Score = isTeam2Batting ? (Number(matchObj.team1Score) || 0) : (Number(resultObj.score) || Number(matchObj.team1Score) || 0);
    let t1Wickets = isTeam2Batting ? (Number(matchObj.team1Wickets) || 0) : (Number(resultObj.wickets) || Number(matchObj.team1Wickets) || 0);
    let t1Overs = isTeam2Batting ? (matchObj.team1Overs?.toString() || '0.0') : (resultObj.overs?.toString() || matchObj.team1Overs?.toString() || '0.0');

    let t2Score = isTeam2Batting ? (Number(resultObj.score) || Number(matchObj.team2Score) || 0) : (Number(matchObj.team2Score) || 0);
    let t2Wickets = isTeam2Batting ? (Number(resultObj.wickets) || Number(matchObj.team2Wickets) || 0) : (Number(matchObj.team2Wickets) || 0);
    let t2Overs = isTeam2Batting ? (resultObj.overs?.toString() || matchObj.team2Overs?.toString() || '0.0') : (matchObj.team2Overs?.toString() || '0.0');

    // 4. Map to UI Layout (Batting team is typically "Team 1" in overlays)
    const bName = isTeam2Batting ? matchObj.team2Name : matchObj.team1Name;
    const bShort = isTeam2Batting ? matchObj.team2?.shortName : matchObj.team1?.shortName;
    const bScore = isTeam2Batting ? t2Score : t1Score;
    const bWickets = isTeam2Batting ? t2Wickets : t1Wickets;
    const bOvers = isTeam2Batting ? t2Overs : t1Overs;

    const fName = isTeam2Batting ? matchObj.team1Name : matchObj.team2Name;
    const fShort = isTeam2Batting ? matchObj.team1?.shortName : matchObj.team2?.shortName;
    const fScore = isTeam2Batting ? t1Score : t2Score;
    const fWickets = isTeam2Batting ? t1Wickets : t2Wickets;
    const fOvers = isTeam2Batting ? t1Overs : t2Overs;

    // 5. Convert 'overSummary' string into the Ball Array
    let parsedOverArray = [];
    const summaryStr = resultObj.overSummary || matchObj.overSummary || data.overSummary;
    if (summaryStr && typeof summaryStr === 'string') {
        parsedOverArray = summaryStr.trim().split(/\s+/).filter(b => b !== '').map(ballStr => {
            const upper = ballStr.toUpperCase();
            return {
                isWicket: upper.includes('W') && !upper.includes('WD'),
                isWide: upper.includes('WD'),
                isNoBall: upper.includes('NB'),
                runs: parseInt(upper.replace(/[^0-9]/g, '')) || 0,
                raw: upper === '0' ? '•' : upper
            };
        });
    }

    const rrr = Number(resultObj.requiredRunRate || matchObj.innings?.[1]?.requiredRunRate || 0);

    return {
        matchName: matchObj.name || 'Live Match',
        tournamentName: matchObj.tournamentName || 'SCOREX',

        // Standard Keys
        team1Name: bName || 'Team 1',
        team1ShortName: bShort || 'T1',
        team1Score: bScore,
        team1Wickets: bWickets,
        team1Overs: bOvers,

        team2Name: fName || 'Team 2',
        team2ShortName: fShort || 'T2',
        team2Score: fScore,
        team2Wickets: fWickets,
        team2Overs: fOvers,

        // 🔥 Failsafe Legacy Keys (Prevents Lvl 2 templates from crashing)
        score1: bScore, wickets1: bWickets, overs1: bOvers,
        score2: fScore, wickets2: fWickets, overs2: fOvers,
        t1Score: bScore, t2Score: fScore,
        battingTeamName: bName, bowlingTeamName: fName,

        // Current Over & Players
        thisOver: parsedOverArray,
        strikerName: matchObj.strikerName || '',
        strikerRuns: Number(resultObj.strikerMatchRuns) || 0,
        strikerBalls: Number(resultObj.strikerMatchBalls) || 0,
        nonStrikerName: matchObj.nonStrikerName || '',
        nonStrikerRuns: 0,
        nonStrikerBalls: 0,
        bowlerName: matchObj.currentBowlerName || '',
        bowlerRuns: 0,
        bowlerWickets: 0,
        bowlerOvers: '0.0',

        runRate: resultObj.runRate ? Number(resultObj.runRate).toFixed(2) : '0.00',
        target: matchObj.innings?.[1]?.targetScore || 0,
        requiredRunRate: rrr ? rrr.toFixed(2) : '0.00',
        status: matchObj.status || 'LIVE',
        _raw: data
    };
};

function getFallbackData() {
    return {
        matchName: 'Loading...', team1Name: 'Team 1', team1Score: 0, team1Wickets: 0, team1Overs: '0.0',
        team2Name: 'Team 2', team2Score: 0, team2Wickets: 0, team2Overs: '0.0', thisOver: []
    };
}

// ========== UNIVERSAL AUTO-BALL RENDERER ==========
window.renderCurrentOver = function(thisOverArray) {
    // 🔥 Expanded selectors to catch however you named it in Minimal Dark
    const selectors = '#this-over, .this-over, #balls-container, .balls-container, .over-balls, .ball-tracker, #current-over, .current-over, .balls, .over-timeline';
    const containers = document.querySelectorAll(selectors);
    if (!containers.length) return;

    const totalSpots = Math.max(6, thisOverArray.length);

    containers.forEach(container => {
        if (!container.dataset.ballTemplate) {
            const firstBall = container.children[0];
            container.dataset.ballTemplate = firstBall ? firstBall.outerHTML : '<div class="ball" style="display:flex;align-items:center;justify-content:center;font-weight:bold;"></div>';
        }

        const template = container.dataset.ballTemplate;
        let htmlContent = '';

        for (let i = 0; i < totalSpots; i++) {
            let ballData = thisOverArray[i];
            let tempDiv = document.createElement('div');
            tempDiv.innerHTML = template;
            let ballEl = tempDiv.firstElementChild;

            if (ballData) {
                ballEl.innerText = ballData.raw;

                // Color coding
                if (ballData.isWicket) {
                    ballEl.style.backgroundColor = '#ef4444';
                    ballEl.style.color = '#ffffff';
                    ballEl.style.borderColor = '#ef4444';
                } else if (ballData.isWide || ballData.isNoBall) {
                    ballEl.style.backgroundColor = 'transparent';
                } else if (ballData.runs === 4) {
                    ballEl.style.backgroundColor = '#3b82f6';
                    ballEl.style.color = '#ffffff';
                    ballEl.style.borderColor = '#3b82f6';
                } else if (ballData.runs === 6) {
                    ballEl.style.backgroundColor = '#10b981';
                    ballEl.style.color = '#ffffff';
                    ballEl.style.borderColor = '#10b981';
                }
            } else {
                ballEl.innerText = '';
            }
            htmlContent += ballEl.outerHTML;
        }

        container.innerHTML = htmlContent;
    });
};
