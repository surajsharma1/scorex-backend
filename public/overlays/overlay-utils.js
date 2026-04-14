// ========== SCOREX DATA NORMALIZER v4 — BULLETPROOF PAYLOAD MATCHING ==========
// Handles: initial fetch, socket scoreUpdate, refresh reconnect, innings 1 & 2
window.normalizeScoreData = function(data) {
  if (!data) return getFallbackData();

  var matchObj  = data.match || data;
  var resultObj = data.result || {};

  var currentInnings = matchObj.currentInnings || 1;
  var isInn2 = currentInnings === 2;

  // Pull innings arrays directly — these survive MongoDB refresh
  var inn1 = (matchObj.innings && matchObj.innings[0]) ? matchObj.innings[0] : {};
  var inn2 = (matchObj.innings && matchObj.innings[1]) ? matchObj.innings[1] : {};

  // ── Scores ──────────────────────────────────────────────────────────────────
  var t1Score    = Number(inn1.score   != null ? inn1.score   : (matchObj.team1Score   || 0));
  var t1Wickets  = Number(inn1.wickets != null ? inn1.wickets : (matchObj.team1Wickets || 0));
  var t1Balls    = Number(inn1.balls   || 0);
  var t1OversStr = t1Balls ? (Math.floor(t1Balls/6) + '.' + (t1Balls%6)) : (matchObj.team1Overs || '0.0');

  var t2Score    = Number(inn2.score   != null ? inn2.score   : (matchObj.team2Score   || 0));
  var t2Wickets  = Number(inn2.wickets != null ? inn2.wickets : (matchObj.team2Wickets || 0));
  var t2Balls    = Number(inn2.balls   || 0);
  var t2OversStr = t2Balls ? (Math.floor(t2Balls/6) + '.' + (t2Balls%6)) : (matchObj.team2Overs || '0.0');

  // ── Batting team context ──────────────────────────────────────────────────
  var battingInn = isInn2 ? inn2 : inn1;
  var bTeamName  = battingInn.teamName || (isInn2 ? matchObj.team2Name : matchObj.team1Name) || 'Team';
  var bScore     = isInn2 ? t2Score    : t1Score;
  var bWickets   = isInn2 ? t2Wickets  : t1Wickets;
  var bOvers     = isInn2 ? t2OversStr : t1OversStr;
  var bShort     = bTeamName.substring(0,4).toUpperCase();

  var fTeamName  = isInn2 ? (matchObj.team1Name || '') : (matchObj.team2Name || '');
  var fScore     = isInn2 ? t1Score    : t2Score;
  var fWickets   = isInn2 ? t1Wickets  : t2Wickets;
  var fOvers     = isInn2 ? t1OversStr : t2OversStr;

  // ── Player stats — from innings arrays (DB-persisted, survive refresh) ──────
  var batsmen    = battingInn.batsmen  || [];
  var bowlers    = battingInn.bowlers  || [];

  var strikerName    = matchObj.strikerName        || '';
  var nonStrikerName = matchObj.nonStrikerName     || '';
  var bowlerName     = matchObj.currentBowlerName  || '';

  var strikerObj     = batsmen.find(function(b){ return b.name === strikerName; })    || {};
  var nonStrikerObj  = batsmen.find(function(b){ return b.name === nonStrikerName; }) || {};
  var bowlerObj      = bowlers.find(function(b){ return b.name === bowlerName; })     || {};

  var strikerRuns    = Number(resultObj.strikerMatchRuns  != null ? resultObj.strikerMatchRuns  : (strikerObj.runs    || matchObj.strikerRuns    || 0));
  var strikerBalls   = Number(resultObj.strikerMatchBalls != null ? resultObj.strikerMatchBalls : (strikerObj.balls   || matchObj.strikerBalls   || 0));
  var strikerFours   = Number(strikerObj.fours   || matchObj.strikerFours  || 0);
  var strikerSixes   = Number(strikerObj.sixes   || matchObj.strikerSixes  || 0);
  var strikerSR      = strikerBalls > 0 ? ((strikerRuns/strikerBalls)*100).toFixed(1) : '0.0';

  var nonStrikerRuns  = Number(nonStrikerObj.runs  || matchObj.nonStrikerRuns  || 0);
  var nonStrikerBalls = Number(nonStrikerObj.balls || matchObj.nonStrikerBalls || 0);

  var bowlerBalls    = Number(bowlerObj.balls   || 0);
  var bowlerRuns     = Number(bowlerObj.runs    || matchObj.bowlerRuns    || 0);
  var bowlerWickets  = Number(bowlerObj.wickets || matchObj.bowlerWickets || 0);
  var bowlerEcon     = bowlerObj.economy ? Number(bowlerObj.economy).toFixed(2) : '0.00';
  var bowlerOvers    = bowlerBalls ? (Math.floor(bowlerBalls/6)+'.'+bowlerBalls%6) : (matchObj.bowlerOvers||'0.0');

  // ── This over ─────────────────────────────────────────────────────────────
  var thisOver = [];
  if (Array.isArray(matchObj.thisOver) && matchObj.thisOver.length > 0) {
    thisOver = matchObj.thisOver.map(normalizeOneBall);
  } else {
    var ovrStr = resultObj.overSummary || matchObj.overSummary || data.overSummary || '';
    if (ovrStr) {
      thisOver = parseOverSummary(ovrStr);
    } else if (Array.isArray(battingInn.ballHistory) && battingInn.ballHistory.length > 0) {
      var balls = battingInn.balls || 0;
      var mod = balls % 6;
      var validCnt = 0;
      var overBalls = [];
      var hist = battingInn.ballHistory;
      for (var i = hist.length-1; i >= 0; i--) {
        var bh = hist[i];
        var isExt = bh.extras==='wide'||bh.wide||bh.extras==='nb'||bh.noBall||bh.extras==='noBall';
        overBalls.unshift(bh);
        if (!isExt) validCnt++;
        if (validCnt >= (mod||6)) break;
      }
      thisOver = overBalls.map(normalizeOneBall);
    }
  }

  // ── Summary arrays ────────────────────────────────────────────────────────
  var battingSummary = data.battingSummary || batsmen.map(function(b){
    var isRetired = b.outType === 'retired_hurt' || b.outType === 'retired';
    return { name:b.name, runs:b.runs||0, balls:b.balls||0, fours:b.fours||0, sixes:b.sixes||0, isOut: isRetired ? false : (b.isOut||false), outType:b.outType||'' };
  });
  var bowlingSummary = data.bowlingSummary || bowlers.map(function(b){
    return { name:b.name, overs:b.balls?(Math.floor(b.balls/6)+'.'+b.balls%6):'0.0', runs:b.runs||0, wickets:b.wickets||0, economy:b.economy||0 };
  });

  var inn1Batting = (inn1.batsmen||[]).map(function(b){ var isRetired = b.outType==='retired_hurt'||b.outType==='retired'; return { name:b.name, runs:b.runs||0, balls:b.balls||0, fours:b.fours||0, sixes:b.sixes||0, isOut: isRetired ? false : (b.isOut||false), outType:b.outType||'' }; });
  var inn1Bowling = (inn1.bowlers||[]).map(function(b){ return { name:b.name, overs:b.balls?(Math.floor(b.balls/6)+'.'+b.balls%6):'0.0', runs:b.runs||0, wickets:b.wickets||0, economy:b.economy||0 }; });
  var inn2Batting = (inn2.batsmen||[]).map(function(b){ var isRetired = b.outType==='retired_hurt'||b.outType==='retired'; return { name:b.name, runs:b.runs||0, balls:b.balls||0, fours:b.fours||0, sixes:b.sixes||0, isOut: isRetired ? false : (b.isOut||false), outType:b.outType||'' }; });
  var inn2Bowling = (inn2.bowlers||[]).map(function(b){ return { name:b.name, overs:b.balls?(Math.floor(b.balls/6)+'.'+b.balls%6):'0.0', runs:b.runs||0, wickets:b.wickets||0, economy:b.economy||0 }; });

  var team1Players = (matchObj.team1&&matchObj.team1.players ? matchObj.team1.players : []).map(function(p){ return p.name||p; });
  var team2Players = (matchObj.team2&&matchObj.team2.players ? matchObj.team2.players : []).map(function(p){ return p.name||p; });

  return {
    matchName:       matchObj.name || 'Live Match',
    tournamentName:  matchObj.tournamentName || (matchObj.tournamentId&&matchObj.tournamentId.name) || 'SCOREX',
    matchId:         matchObj._id || '',
    status:          matchObj.status || 'live',
    currentInnings:  currentInnings,

    team1Name:       matchObj.team1Name || (matchObj.team1&&matchObj.team1.name) || 'Team 1',
    team2Name:       matchObj.team2Name || (matchObj.team2&&matchObj.team2.name) || 'Team 2',
    team1ShortName:  (matchObj.team1&&matchObj.team1.shortName) || (matchObj.team1Name||'T1').substring(0,4).toUpperCase(),
    team2ShortName:  (matchObj.team2&&matchObj.team2.shortName) || (matchObj.team2Name||'T2').substring(0,4).toUpperCase(),

    team1Score:t1Score, team1Wickets:t1Wickets, team1Overs:t1OversStr,
    team2Score:t2Score, team2Wickets:t2Wickets, team2Overs:t2OversStr,

    battingTeamName:bTeamName, bowlingTeamName:fTeamName,
    teamName:bShort, teamScore:bScore, teamWickets:bWickets, teamOvers:bOvers,
    score1:bScore, wickets1:bWickets, overs1:bOvers,
    score2:fScore, wickets2:fWickets, overs2:fOvers,
    t1Score:bScore, t2Score:fScore,

    strikerName, strikerRuns, strikerBalls, strikerFours, strikerSixes, strikerSR,
    nonStrikerName, nonStrikerRuns, nonStrikerBalls,
    bowlerName, bowlerRuns, bowlerWickets, bowlerOvers, bowlerEconomy:bowlerEcon,

    thisOver,
    runRate: Number(battingInn.runRate || resultObj.runRate || matchObj.runRate || 0).toFixed(2),
    target:  Number(matchObj.target || battingInn.targetScore || 0),
    requiredRuns:    Number(matchObj.requiredRuns || battingInn.requiredRuns || 0),
    requiredRunRate: Number(matchObj.requiredRunRate || battingInn.requiredRunRate || 0).toFixed(2),

    extras:     Number(battingInn.extras&&battingInn.extras.total != null ? battingInn.extras.total : (matchObj.extras||0)),
    totalFours: Number(battingInn.fours || matchObj.totalFours || 0),
    totalSixes: Number(battingInn.sixes || matchObj.totalSixes || 0),

    battingSummary, bowlingSummary,
    inn1Batting, inn1Bowling, inn2Batting, inn2Bowling,
    inn1Score:t1Score, inn1Wickets:t1Wickets, inn1Overs:t1OversStr, inn1TeamName:inn1.teamName||matchObj.team1Name||'',
    inn2Score:t2Score, inn2Wickets:t2Wickets, inn2Overs:t2OversStr, inn2TeamName:inn2.teamName||matchObj.team2Name||'',

    team1Players, team2Players,
    tossWinnerName:matchObj.tossWinnerName||'', tossDecision:matchObj.tossDecision||'',
    winnerName:matchObj.winnerName||'', resultSummary:matchObj.resultSummary||'',
    matchSummary:data.matchSummary||null,
    sponsors:matchObj.sponsors||(matchObj.tournamentId&&matchObj.tournamentId.sponsors)||[],
    _raw:data,
  };
};

function normalizeOneBall(b) {
  if (!b) return { runs:0, isWicket:false, isWide:false, isNoBall:false, isFour:false, isSix:false, raw:'•', wicket:false, isBoundary:false };
  var isWide   = b.extras==='wide'||b.wide||b.isWide||false;
  var isNoBall = b.extras==='nb'||b.noBall||b.isNoBall||b.extras==='noBall'||false;
  var isWicket = !isWide&&!isNoBall&&(b.wicket||b.isWicket||false);
  var runs     = Number(b.runs||0);
  var isFour   = runs===4&&!isWicket&&!isWide&&!isNoBall;
  var isSix    = runs===6&&!isWicket&&!isWide&&!isNoBall;
  var raw;
  if (isWicket)       raw='W';
  else if (isWide)    raw='Wd';
  else if (isNoBall)  raw='Nb';
  else if (runs===0)  raw='•';
  else                raw=String(runs);
  return { runs, isWicket, isWide, isNoBall, isFour, isSix, raw, wicket:isWicket, isBoundary:isFour||isSix };
}

function parseOverSummary(summaryStr) {
  if (!summaryStr||typeof summaryStr!=='string') return [];
  return summaryStr.trim().split(/\s+/).filter(function(b){ return b!==''; }).map(function(bs){
    var u=bs.toUpperCase();
    var isWide=u==='WD'||u.startsWith('WD');
    var isNoBall=u==='NB'||u.startsWith('NB');
    var isWicket=!isWide&&!isNoBall&&(u==='W'||u.includes('W'));
    var runs=parseInt(u.replace(/[^0-9]/g,''),10)||0;
    var isFour=runs===4&&!isWicket&&!isWide&&!isNoBall;
    var isSix=runs===6&&!isWicket&&!isWide&&!isNoBall;
    var raw;
    if (isWicket)       raw='W';
    else if (isWide)    raw='Wd';
    else if (isNoBall)  raw='Nb';
    else if (runs===0)  raw='•';
    else                raw=String(runs);
    return { isWicket, isWide, isNoBall, isFour, isSix, runs, raw, wicket:isWicket, isBoundary:isFour||isSix };
  });
}

function getFallbackData() {
  return {
    matchName:'Loading…', tournamentName:'SCOREX', status:'live', currentInnings:1,
    team1Name:'Team 1', team1ShortName:'T1', team1Score:0, team1Wickets:0, team1Overs:'0.0',
    team2Name:'Team 2', team2ShortName:'T2', team2Score:0, team2Wickets:0, team2Overs:'0.0',
    teamName:'TEAM', teamScore:0, teamWickets:0, teamOvers:'0.0',
    battingTeamName:'', bowlingTeamName:'',
    thisOver:[],
    strikerName:'', strikerRuns:0, strikerBalls:0, strikerFours:0, strikerSixes:0, strikerSR:'0.0',
    nonStrikerName:'', nonStrikerRuns:0, nonStrikerBalls:0,
    bowlerName:'', bowlerRuns:0, bowlerWickets:0, bowlerOvers:'0.0', bowlerEconomy:'0.00',
    runRate:'0.00', target:0, requiredRuns:0, requiredRunRate:'0.00',
    extras:0, totalFours:0, totalSixes:0,
    battingSummary:[], bowlingSummary:[], inn1Batting:[], inn1Bowling:[], inn2Batting:[], inn2Bowling:[],
    inn1Score:0, inn1Wickets:0, inn1Overs:'0.0', inn1TeamName:'',
    inn2Score:0, inn2Wickets:0, inn2Overs:'0.0', inn2TeamName:'',
    team1Players:[], team2Players:[],
    tossWinnerName:'', tossDecision:'', winnerName:'', resultSummary:'', matchSummary:null,
    sponsors:[], _raw:{},
  };
}

// ========== UNIVERSAL AUTO-BALL RENDERER ==========
window.renderCurrentOver = function(thisOverArray) {
  if (!Array.isArray(thisOverArray)) return;
  var selectors = ['#this-over','#this-over-balls','.this-over','#balls-container','.balls-container','.ball-container','.over-balls','.ball-tracker','#current-over','.current-over','.balls','.over-timeline','.yellow-pill'].join(', ');
  var containers = document.querySelectorAll(selectors);
  if (!containers.length) return;
  var totalSpots = Math.max(6, thisOverArray.length);
  containers.forEach(function(container) {
    if (!container.dataset.ballTemplate) {
      var firstBall = container.querySelector('.ball-dot, .silver-ball, [class*="ball"]');
      if (firstBall) {
        var clone = firstBall.cloneNode(true);
        clone.innerText=''; clone.removeAttribute('style');
        clone.className=clone.className.replace(/\b(fill|wicket-color|boundary-color|extra-color|ball-b|ball-w|ball-6|active)\b/g,'').trim();
        container.dataset.ballTemplate=clone.outerHTML;
      } else { container.dataset.ballTemplate='<div class="ball-dot"></div>'; }
    }
    var template=container.dataset.ballTemplate, html='';
    for (var i=0; i<totalSpots; i++) {
      var ball=thisOverArray[i];
      var tmp=document.createElement('div'); tmp.innerHTML=template;
      var el=tmp.firstElementChild;
      if (ball) {
        el.innerText=ball.raw;
        if      (ball.isWicket)              { el.style.background='#ef4444'; el.style.color='#fff'; el.style.borderColor='#ef4444'; }
        else if (ball.isSix)                 { el.style.background='#10b981'; el.style.color='#fff'; el.style.borderColor='#10b981'; }
        else if (ball.isFour)                { el.style.background='#3b82f6'; el.style.color='#fff'; el.style.borderColor='#3b82f6'; }
        else if (ball.isWide||ball.isNoBall) { el.style.background='transparent'; el.style.color='#f59e0b'; el.style.borderColor='#f59e0b'; }
        else if (ball.runs>0)                { el.style.background='rgba(255,255,255,0.15)'; }
        else                                 { el.style.background='transparent'; }
      } else { el.innerText=''; el.style.opacity='0.35'; el.style.background='transparent'; }
      html+=el.outerHTML;
    }
    container.innerHTML=html;
  });
};