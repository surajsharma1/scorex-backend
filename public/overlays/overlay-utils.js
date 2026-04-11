// ========== SCOREX DATA NORMALIZER (BULLETPROOF PAYLOAD MATCHING) ==========
window.normalizeScoreData = function(data) {
    if (!data) return getFallbackData();

    const matchObj = data.match || data;
    const resultObj = data.result || {};

    let isTeam2Batting = matchObj.currentInnings === 2 || (matchObj.team2Score > 0 && matchObj.team1Score === 0);

    let t1Score    = isTeam2Batting ? (Number(matchObj.team1Score) || 0)   : (Number(resultObj.score)   || Number(matchObj.team1Score)   || 0);
    let t1Wickets  = isTeam2Batting ? (Number(matchObj.team1Wickets) || 0) : (Number(resultObj.wickets) || Number(matchObj.team1Wickets) || 0);
    let t1Overs    = isTeam2Batting ? (matchObj.team1Overs?.toString() || '0.0') : (resultObj.overs?.toString() || matchObj.team1Overs?.toString() || '0.0');

    let t2Score    = isTeam2Batting ? (Number(resultObj.score)   || Number(matchObj.team2Score)   || 0) : (Number(matchObj.team2Score)   || 0);
    let t2Wickets  = isTeam2Batting ? (Number(resultObj.wickets) || Number(matchObj.team2Wickets) || 0) : (Number(matchObj.team2Wickets) || 0);
    let t2Overs    = isTeam2Batting ? (resultObj.overs?.toString() || matchObj.team2Overs?.toString() || '0.0') : (matchObj.team2Overs?.toString() || '0.0');

    const bName    = isTeam2Batting ? matchObj.team2Name : matchObj.team1Name;
    const bShort   = isTeam2Batting ? matchObj.team2?.shortName : matchObj.team1?.shortName;
    const bScore   = isTeam2Batting ? t2Score   : t1Score;
    const bWickets = isTeam2Batting ? t2Wickets : t1Wickets;
    const bOvers   = isTeam2Batting ? t2Overs   : t1Overs;

    const fName    = isTeam2Batting ? matchObj.team1Name : matchObj.team2Name;
    const fShort   = isTeam2Batting ? matchObj.team1?.shortName : matchObj.team2?.shortName;
    const fScore   = isTeam2Batting ? t1Score   : t2Score;
    const fWickets = isTeam2Batting ? t1Wickets : t2Wickets;
    const fOvers   = isTeam2Batting ? t1Overs   : t2Overs;

    const parsedOverArray = parseOverSummary(
        resultObj.overSummary || matchObj.overSummary || data.overSummary
    );

    const rrr = Number(resultObj.requiredRunRate || matchObj.innings?.[1]?.requiredRunRate || 0);
    const shortBat = bShort || (bName ? bName.substring(0, 4).toUpperCase() : 'TEAM');

    return {
        matchName:        matchObj.name || 'Live Match',
        tournamentName:   matchObj.tournamentName || 'SCOREX',

        // Standard keys
        team1Name:        bName || 'Team 1',
        team1ShortName:   bShort || (bName ? bName.substring(0, 3).toUpperCase() : 'T1'),
        team1Score:       bScore,
        team1Wickets:     bWickets,
        team1Overs:       bOvers,

        team2Name:        fName || 'Team 2',
        team2ShortName:   fShort || (fName ? fName.substring(0, 3).toUpperCase() : 'T2'),
        team2Score:       fScore,
        team2Wickets:     fWickets,
        team2Overs:       fOvers,

        // Legacy / alias keys so no template ever crashes
        score1: bScore,   wickets1: bWickets, overs1: bOvers,
        score2: fScore,   wickets2: fWickets, overs2: fOvers,
        t1Score: bScore,  t2Score: fScore,
        battingTeamName:  bName,
        bowlingTeamName:  fName,
        teamName:         shortBat,
        teamScore:        bScore,
        teamWickets:      bWickets,
        teamOvers:        bOvers,

        // Current over (normalized ball array)
        thisOver:         parsedOverArray,

        // Player stats
        strikerName:      matchObj.strikerName || '',
        strikerRuns:      Number(resultObj.strikerMatchRuns)  || 0,
        strikerBalls:     Number(resultObj.strikerMatchBalls) || 0,
        nonStrikerName:   matchObj.nonStrikerName || '',
        nonStrikerRuns:   0,
        nonStrikerBalls:  0,
        bowlerName:       matchObj.currentBowlerName || '',
        bowlerRuns:       0,
        bowlerWickets:    0,
        bowlerOvers:      '0.0',

        runRate:          resultObj.runRate ? Number(resultObj.runRate).toFixed(2) : '0.00',
        target:           matchObj.innings?.[1]?.targetScore || 0,
        requiredRunRate:  rrr ? rrr.toFixed(2) : '0.00',
        status:           matchObj.status || 'LIVE',
        _raw:             data
    };
};

// ========== OVER SUMMARY PARSER ==========
// Converts "1 4 W 0 6 WD NB" into a normalized ball array consumed by all overlays.
function parseOverSummary(summaryStr) {
    if (!summaryStr || typeof summaryStr !== 'string') return [];
    return summaryStr.trim().split(/\s+/).filter(function(b) { return b !== ''; }).map(function(ballStr) {
        var upper    = ballStr.toUpperCase();
        var isWide   = upper === 'WD' || upper.startsWith('WD');
        var isNoBall = upper === 'NB' || upper.startsWith('NB');
        var isWicket = !isWide && !isNoBall && (upper === 'W' || upper.includes('W'));
        var runs     = parseInt(upper.replace(/[^0-9]/g, ''), 10) || 0;
        var isFour   = runs === 4 && !isWicket && !isWide && !isNoBall;
        var isSix    = runs === 6 && !isWicket && !isWide && !isNoBall;

        var label;
        if (isWicket)       label = 'W';
        else if (isWide)    label = 'Wd';
        else if (isNoBall)  label = 'Nb';
        else if (runs === 0) label = '\u2022'; // bullet dot
        else                label = String(runs);

        return {
            isWicket: isWicket,
            isWide:   isWide,
            isNoBall: isNoBall,
            isFour:   isFour,
            isSix:    isSix,
            runs:     runs,
            raw:      label,
            // Legacy aliases
            wicket:     isWicket,
            isBoundary: isFour || isSix
        };
    });
}

function getFallbackData() {
    return {
        matchName: 'Loading...', tournamentName: 'SCOREX',
        team1Name: 'Team 1', team1ShortName: 'T1', team1Score: 0, team1Wickets: 0, team1Overs: '0.0',
        team2Name: 'Team 2', team2ShortName: 'T2', team2Score: 0, team2Wickets: 0, team2Overs: '0.0',
        teamName: 'TEAM', teamScore: 0, teamWickets: 0, teamOvers: '0.0',
        thisOver: [],
        strikerName: '', strikerRuns: 0, strikerBalls: 0,
        nonStrikerName: '', nonStrikerRuns: 0, nonStrikerBalls: 0,
        bowlerName: '', bowlerRuns: 0, bowlerWickets: 0, bowlerOvers: '0.0',
        runRate: '0.00', requiredRunRate: '0.00', target: 0,
        battingTeamName: '', bowlingTeamName: '', status: 'LIVE'
    };
}

// ========== UNIVERSAL AUTO-BALL RENDERER ==========
// Works across ALL overlay templates. Expands automatically when extras push balls > 6.
window.renderCurrentOver = function(thisOverArray) {
    if (!Array.isArray(thisOverArray)) return;

    // Every ball-container ID/class used across all overlays
    var selectors = [
        '#this-over',
        '#this-over-balls',
        '.this-over',
        '#balls-container',
        '.balls-container',
        '.ball-container',
        '.over-balls',
        '.ball-tracker',
        '#current-over',
        '.current-over',
        '.balls',
        '.over-timeline',
        '.yellow-pill'
    ].join(', ');

    var containers = document.querySelectorAll(selectors);
    if (!containers.length) return;

    // Show at least 6 slots; grow automatically for extras
    var totalSpots = Math.max(6, thisOverArray.length);

    containers.forEach(function(container) {
        // Cache a clean template from the container's first ball child
        if (!container.dataset.ballTemplate) {
            var firstBall = container.querySelector('.ball-dot, .silver-ball, [class*="ball"]');
            if (firstBall) {
                var clone = firstBall.cloneNode(true);
                clone.innerText = '';
                clone.removeAttribute('style');
                // Remove state classes so template is always blank
                clone.className = clone.className
                    .replace(/\b(fill|wicket-color|boundary-color|extra-color|ball-b|ball-w|ball-6|active)\b/g, '')
                    .trim();
                container.dataset.ballTemplate = clone.outerHTML;
            } else {
                container.dataset.ballTemplate = '<div class="ball-dot"></div>';
            }
        }

        var template = container.dataset.ballTemplate;
        var html = '';

        for (var i = 0; i < totalSpots; i++) {
            var ball = thisOverArray[i];
            var tmp  = document.createElement('div');
            tmp.innerHTML = template;
            var el = tmp.firstElementChild;

            if (ball) {
                el.innerText = ball.raw;

                if (ball.isWicket) {
                    el.style.background  = '#ef4444';
                    el.style.color       = '#ffffff';
                    el.style.borderColor = '#ef4444';
                } else if (ball.isSix) {
                    el.style.background  = '#10b981';
                    el.style.color       = '#ffffff';
                    el.style.borderColor = '#10b981';
                } else if (ball.isFour) {
                    el.style.background  = '#3b82f6';
                    el.style.color       = '#ffffff';
                    el.style.borderColor = '#3b82f6';
                } else if (ball.isWide || ball.isNoBall) {
                    el.style.background  = 'transparent';
                    el.style.color       = '#f59e0b';
                    el.style.borderColor = '#f59e0b';
                } else if (ball.runs > 0) {
                    el.style.background  = 'rgba(255,255,255,0.15)';
                    el.style.color       = '';
                    el.style.borderColor = '';
                } else {
                    // dot ball
                    el.style.background  = 'transparent';
                    el.style.color       = '';
                    el.style.borderColor = '';
                }
            } else {
                // Empty future slot
                el.innerText         = '';
                el.style.opacity     = '0.35';
                el.style.background  = 'transparent';
            }

            html += el.outerHTML;
        }

        container.innerHTML = html;
    });
};
