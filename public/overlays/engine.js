/**
 * Scorex Overlay Engine V3 (AUTO-DIRECTOR HYBRID ARCHITECTURE)
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};
  
  // 🔥 THE FIX: Grab the matchId directly from the URL first!
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId') || config.matchId;
  
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  // --- PARSE GLOBAL CONFIG FROM URL ---
  let globalCfg = {};
  try {
    const cfgParam = urlParams.get('cfg');
    if (cfgParam) globalCfg = JSON.parse(decodeURIComponent(cfgParam));
  } catch(e) { console.error("Could not parse config", e); }

  const overlaySettings = {
    tossDuration: globalCfg.tossDuration || 8,
    squadDuration: globalCfg.squadDuration || 12,
    introDuration: globalCfg.introDuration || 12,
    autoStatsOvers: globalCfg.autoStatsOvers !== undefined ? globalCfg.autoStatsOvers : 5, 
    autoStatsType: globalCfg.autoStatsType || 'BOTH_CARDS',
    autoStatsDuration: globalCfg.autoStatsDuration || 10
  };

  let matchData = null;
  let socket = null;
  
  let currentState = 'BOOTING'; 
  let hasPlayedIntro = false;
  let lastAutoStatOver = -1;
  let animationLock = false;

  function dispatchTrigger(triggerObj) {
    console.log(`[Scorex Auto-Director] 🎬 Firing: ${triggerObj.type}`, triggerObj);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: triggerObj }, '*');
  }

  function safeUpdateState(rawDoc) {
    try {
      if (!rawDoc) return;
      const trigger = rawDoc.activeTrigger || null;
      const rawMatch = rawDoc.match || rawDoc;
      let flatData = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(rawMatch) : rawMatch;

// --- NORMALIZE SCORE DATA (NEW: Flatten nested backend payloads) ---
window.normalizeScoreData = window.normalizeScoreData || function(raw) {
  const flat = {};

  // Helper to safely get nested values
  const getNested = (obj, path, fallback = '') => {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined ? o[key] : fallback), obj) || fallback;
  };

  // Team/Score (handle team1/teamA/batting.team, match.teams[0], etc.)
  flat.team1Name = getNested(raw, 'team1Name') || getNested(raw, 'match.team1.name') || getNested(raw, 'batting.team1.name') || getNested(raw, 'teams.0.name') || 'TEAM';
  flat.team1ShortName = flat.team1Name.substring(0, 3).toUpperCase();
  flat.team1Score = parseInt(getNested(raw, 'team1Score')) || parseInt(getNested(raw, 'match.team1.score')) || parseInt(getNested(raw, 'batting.team1.total_runs')) || parseInt(getNested(raw, 'teams.0.score')) || 0;
  flat.team1Wickets = parseInt(getNested(raw, 'team1Wickets')) || parseInt(getNested(raw, 'match.team1.wickets')) || parseInt(getNested(raw, 'batting.team1.wickets')) || parseInt(getNested(raw, 'teams.0.wickets')) || 0;
  flat.team1Overs = getNested(raw, 'team1Overs') || getNested(raw, 'match.team1.overs') || getNested(raw, 'batting.team1.overs') || '0.0';

  // Players
  flat.strikerName = getNested(raw, 'strikerName') || getNested(raw, 'batting.striker.name') || getNested(raw, 'match.batting.striker.name') || 'Striker';
  flat.strikerRuns = parseInt(getNested(raw, 'strikerRuns')) || parseInt(getNested(raw, 'batting.striker.runs')) || 0;
  flat.strikerBalls = parseInt(getNested(raw, 'strikerBalls')) || parseInt(getNested(raw, 'batting.striker.balls')) || 0;
  flat.nonStrikerName = getNested(raw, 'nonStrikerName') || getNested(raw, 'batting.nonStriker.name') || getNested(raw, 'match.batting.nonstriker.name') || 'Non-Striker';
  flat.nonStrikerRuns = parseInt(getNested(raw, 'nonStrikerRuns')) || parseInt(getNested(raw, 'batting.nonStriker.runs')) || 0;
  flat.nonStrikerBalls = parseInt(getNested(raw, 'nonStrikerBalls')) || parseInt(getNested(raw, 'batting.nonStriker.balls')) || 0;

  // Bowler
  flat.bowlerName = getNested(raw, 'bowlerName') || getNested(raw, 'batting.bowler.name') || getNested(raw, 'match.bowling.currentBowler') || 'Bowler';
  flat.bowlerRuns = parseInt(getNested(raw, 'bowlerRuns')) || parseInt(getNested(raw, 'batting.bowler.runs')) || 0;
  flat.bowlerWickets = parseInt(getNested(raw, 'bowlerWickets')) || parseInt(getNested(raw, 'batting.bowler.wickets')) || 0;
  flat.bowlerOvers = getNested(raw, 'bowlerOvers') || getNested(raw, 'batting.bowler.overs') || '0.0';

  // Current over balls (array of outcomes)
  flat.thisOver = getNested(raw, 'thisOver') || getNested(raw, 'batting.currentOver.balls') || [];

  // Fallback: copy any direct flat props
  Object.keys(raw).forEach(key => {
    if (!flat.hasOwnProperty(key) && ['string', 'number'].includes(typeof raw[key])) {
      flat[key] = raw[key];
    }
  });

  console.log('[ScoreX Normalizer] Flattened data:', flat);
  return flat;
};

// Re-normalize if not already flat
flatData = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(rawMatch) : rawMatch;

// --- TRUNCATION & ANTI-CLIPPING LOGIC ---
// Limit team names to 4 characters max to prevent UI clipping in all overlays
if (flatData.team1Name && flatData.team1Name.length > 4) {
    flatData.team1Name = flatData.team1Name.substring(0, 4).toUpperCase();
}
if (flatData.team2Name && flatData.team2Name.length > 4) {
    flatData.team2Name = flatData.team2Name.substring(0, 4).toUpperCase();
}

      matchData = flatData;

      const isMatchNew = flatData.team1Score === 0 && (flatData.team1Overs === "0.0" || flatData.team1Overs === 0) && flatData.team1Wickets === 0;
      const tossDone = !!rawMatch.tossWinnerName;
      const hasPlayers = !!flatData.strikerName;

      // --- 1. BROADCAST SEQUENCING ---
      if (currentState === 'BOOTING' || currentState === 'VS_SCREEN') {
        if (!tossDone) {
          // Stay on VS screen until toss is decided
          if (currentState !== 'VS_SCREEN') {
            currentState = 'VS_SCREEN';
            dispatchTrigger({ type: 'SHOW_VS_SCREEN' });
          }
        } 
        else if (tossDone && isMatchNew && !hasPlayers) {
          // Toss just happened, cascade through the sequence
          currentState = 'TOSS_SCREEN';
          dispatchTrigger({ type: 'SHOW_TOSS' });
          
          setTimeout(() => {
            currentState = 'SQUAD_SCREEN';
            dispatchTrigger({ type: 'SHOW_SQUADS' });
            
            setTimeout(() => {
              currentState = 'LIVE';
              dispatchTrigger({ type: 'RESTORE' });
            }, overlaySettings.squadDuration * 1000);
          }, overlaySettings.tossDuration * 1000);
        } else {
          // Fallback if match is already in progress
          currentState = 'LIVE';
          dispatchTrigger({ type: 'RESTORE' });
        }
      }

      // --- 2. INNINGS START AUTOMATION ---
      if (currentState === 'LIVE' && hasPlayers && isMatchNew && !hasPlayedIntro && !animationLock) {
        hasPlayedIntro = true;
        animationLock = true;
        dispatchTrigger({ type: 'START_INNINGS_INTRO' });
        setTimeout(() => {
          animationLock = false;
          dispatchTrigger({ type: 'RESTORE' });
        }, overlaySettings.introDuration * 1000);
      }

      // --- 3. AUTO-STATS AT END OF OVERS ---
      if (currentState === 'LIVE' && overlaySettings.autoStatsOvers > 0 && !animationLock) {
        const currentOversFloat = parseFloat(flatData.team1Overs);
        const isOverComplete = Number.isInteger(currentOversFloat) && currentOversFloat > 0;
        
        if (isOverComplete && (currentOversFloat % overlaySettings.autoStatsOvers === 0) && currentOversFloat !== lastAutoStatOver) {
          lastAutoStatOver = currentOversFloat;
          animationLock = true;
          dispatchTrigger({ type: overlaySettings.autoStatsType });
          setTimeout(() => {
            animationLock = false;
            dispatchTrigger({ type: 'RESTORE' });
          }, overlaySettings.autoStatsDuration * 1000);
        }
      }

      if (currentState === 'LIVE' && trigger) {
        dispatchTrigger(trigger);
      }

      // 🔴 ADD THIS LINE: Fire the universal ball renderer with the parsed data
      if (typeof window.renderCurrentOver === 'function') {
        window.renderCurrentOver(flatData.thisOver);
      }

      // Update the DOM Data
      window.postMessage({ type: 'UPDATE_SCORE', data: flatData, raw: rawMatch }, '*');

    } catch (err) {
      console.error('[Scorex Engine] Automation Error:', err);
    }
  }

// --- SAFE FETCH & SOCKET LOGIC ---
  // --- SAFE FETCH & SOCKET LOGIC ---
  async function safeFetchMatchData() {
    if (!matchId) return safeUpdateState(getDemoData());
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('API fetch failed');
      const json = await res.json();
      // 🔥 FIX: Pass the FULL payload, do not strip away the result or overSummary
      safeUpdateState(json.data || json); 
    } catch (err) { 
      console.error('[Scorex Engine] Initial fetch error:', err);
      safeUpdateState(getDemoData()); 
    }
  }

  function safeConnectSocket() {
    if (typeof io === 'undefined') return;
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
    
    socket.on('connect', () => { 
      console.log('[Scorex Engine] 🟢 Connected to Live Socket!');
      if (matchId) {
        socket.emit('joinMatch', matchId); 
        socket.emit('join_match', matchId); 
      }
    });

    // 🔥 FIX: Pass the FULL payload so the balls and live scores survive
    socket.on('scoreUpdate', (payload) => {
      console.log('[Scorex Engine] ⚡ Received scoreUpdate:', payload);
      safeUpdateState(payload);
    });

    socket.on('match_updated', (payload) => {
      safeUpdateState(payload);
    });

    socket.on('disconnect', () => console.warn('[Scorex Engine] 🔴 Disconnected, attempting reconnect...'));
  }



  function getDemoData() {
    return { 
      matchId: "demo-123",
      team1Name: 'PREM', 
      team2Name: 'CHAL', 
      team1Score: 184, 
      team1Wickets: 4, 
      team1Overs: '18.2', 
      strikerName: 'V. Kohli',
      strikerRuns: 78,
      strikerBalls: 45,
      nonStrikerName: 'S. Yadav',
      nonStrikerRuns: 32,
      nonStrikerBalls: 18,
      bowlerName: 'J. Bumrah',
      bowlerWickets: 2,
      bowlerRuns: 24,
      bowlerOvers: '3.2'
    };
  }

  function init() {
    const params = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === 'true';
    if (isPreview && !config.matchId) { 
      safeUpdateState(getDemoData()); 
      return; 
    }
    safeFetchMatchData(); 
    safeConnectSocket();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

