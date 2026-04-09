/**
 * Scorex Overlay Engine V3 (AUTO-DIRECTOR HYBRID ARCHITECTURE)
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};
  const matchId = config.matchId;
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  // --- PARSE GLOBAL CONFIG FROM URL ---
  const urlParams = new URLSearchParams(window.location.search);
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

      // Update the DOM Data
      window.postMessage({ type: 'UPDATE_SCORE', data: flatData, raw: rawMatch }, '*');

    } catch (err) {
      console.error('[Scorex Engine] Automation Error:', err);
    }
  }

  // --- SAFE FETCH & SOCKET LOGIC ---
  async function safeFetchMatchData() {
    if (!matchId) return safeUpdateState(getDemoData());
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, { headers: { 'Accept': 'application/json' } });
      const json = await res.json();
      safeUpdateState(json.data || json);
    } catch (err) { safeUpdateState(getDemoData()); }
  }

  function safeConnectSocket() {
    if (typeof io === 'undefined') return;
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
    socket.on('connect', () => { if (matchId) socket.emit('joinMatch', matchId); });
    socket.on('scoreUpdate', (data) => safeUpdateState(data));
    socket.on('disconnect', () => console.warn('[Scorex Engine] Disconnected, attempting reconnect...'));
  }



  function getDemoData() {
    return { match: { tossWinnerName: 'Team A', tossDecision: 'bat' }, team1Score: 0, team1Wickets: 0, team1Overs: '0.0', team1Name: 'PREM', team2Name: 'CHAL', strikerName: 'V. Kohli' };
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

