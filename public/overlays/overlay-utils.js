// ========== SCOREX DATA NORMALIZER (PAYLOAD MATCHED) ==========
window.normalizeScoreData = function(data) {
    if (!data) return getFallbackData();

    // 1. Map root-level scores directly from your console payload
    let t1Score = Number(data.team1Score) || 0;
    let t1Wickets = Number(data.team1Wickets) || 0;
    let t1Overs = data.team1Overs != null ? String(data.team1Overs) : '0.0';

    let t2Score = Number(data.team2Score) || 0;
    let t2Wickets = Number(data.team2Wickets) || 0;
    let t2Overs = data.team2Overs != null ? String(data.team2Overs) : '0.0';

    // 2. Determine who is actively batting (to map primary vs secondary scores)
    let isTeam2Batting = (data.currentInnings === 2) || (t2Score > 0 && t1Score === 0);
    
    // 3. Convert the overSummary string ("1 W 4 WD") into the array format
    let parsedOverArray = [];
    if (data.overSummary && typeof data.overSummary === 'string') {
        parsedOverArray = data.overSummary.trim().split(/\s+/).filter(b => b !== '').map(ballStr => {
            const upper = ballStr.toUpperCase();
            return {
                isWicket: upper.includes('W') && upper !== 'WD',
                isWide: upper.includes('WD'),
                isNoBall: upper.includes('NB'),
                runs: parseInt(upper) || 0,
                raw: upper
            };
        });
    }

    return {
        matchName: data.name || 'Live Match',
        tournamentName: data.tournamentName || 'SCOREX',
        
        // Dynamic Mapping: Put the batting team as Team 1 for the UI
        team1Name: isTeam2Batting ? (data.team2Name || 'Team 2') : (data.team1Name || 'Team 1'),
        team1ShortName: isTeam2Batting ? (data.team2?.shortName || '') : (data.team1?.shortName || ''),
        team1Score: isTeam2Batting ? t2Score : t1Score,
        team1Wickets: isTeam2Batting ? t2Wickets : t1Wickets,
        team1Overs: isTeam2Batting ? t2Overs : t1Overs,

        team2Name: isTeam2Batting ? (data.team1Name || 'Team 1') : (data.team2Name || 'Team 2'),
        team2ShortName: isTeam2Batting ? (data.team1?.shortName || '') : (data.team2?.shortName || ''),
        team2Score: isTeam2Batting ? t1Score : t2Score,
        team2Wickets: isTeam2Batting ? t1Wickets : t2Wickets,
        team2Overs: isTeam2Batting ? t1Overs : t2Overs,

        // Attach the converted array for the ball renderer
        thisOver: parsedOverArray,

        // Player Data
        strikerName: data.strikerName || '',
        strikerRuns: Number(data.result?.strikerMatchRuns) || 0,
        strikerBalls: Number(data.result?.strikerMatchBalls) || 0,
        
        nonStrikerName: data.nonStrikerName || '',
        // Note: Payload didn't show non-striker runs, defaulting to 0
        nonStrikerRuns: 0, 
        nonStrikerBalls: 0,

        bowlerName: data.currentBowlerName || '',
        bowlerRuns: 0,
        bowlerWickets: 0,
        bowlerOvers: '0.0',
        
        runRate: data.result?.runRate ? Number(data.result.runRate).toFixed(2) : '0.00',
        target: 0, requiredRunRate: '0.00',
        status: data.status || 'LIVE', 
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
    const containers = document.querySelectorAll('#this-over, .this-over, #balls-container, .balls-container');
    if (!containers.length) return;

    // Minimum 6 spots, expands automatically if more balls exist
    const totalSpots = Math.max(6, thisOverArray.length);

    containers.forEach(container => {
        // Clone original CSS shape
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
                // Apply the string directly (e.g. "1", "W", "WD")
                ballEl.innerText = ballData.raw === '0' ? '•' : ballData.raw;
                
                // Color coding while keeping your exact CSS shapes
                if (ballData.isWicket) {
                    ballEl.style.backgroundColor = '#ef4444';
                    ballEl.style.color = '#ffffff';
                    ballEl.style.borderColor = '#ef4444';
                } else if (ballData.isWide || ballData.isNoBall) {
                    ballEl.style.backgroundColor = 'transparent';
                } else if (ballData.raw === '4') {
                    ballEl.style.backgroundColor = '#3b82f6';
                    ballEl.style.color = '#ffffff';
                    ballEl.style.borderColor = '#3b82f6';
                } else if (ballData.raw === '6') {
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