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
    
    // NEW: Advanced Auto-Stats Configuration
    enableAutoBatting: globalCfg.enableAutoBatting ?? true,
    autoBattingOvers: globalCfg.autoBattingOvers || 2,
    enableAutoBowling: globalCfg.enableAutoBowling ?? true,
    autoBowlingOvers: globalCfg.autoBowlingOvers || 3,
    simultaneousStats: globalCfg.simultaneousStats ?? true,
    autoStatsDuration: Math.min(12, globalCfg.autoStatsDuration || 10) // Hard cap at 12 seconds
  };

  let matchData = null;
  let socket = null;
  
  // Advanced State Machine Trackers
  let currentState = 'BOOTING'; 
  let hasPlayedIntro = false;
  let lastAutoStatOver = -1;
  let animationLock = false; // prevents auto-triggers from overwriting active manual triggers

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
      matchData = flatData;

      const isMatchNew = flatData.team1Score === 0 && flatData.team1Overs === "0.0" && flatData.team1Wickets === 0;
      const tossDone = !!rawMatch.tossWinnerName;
      const hasPlayers = !!flatData.strikerName;

      // --- 1. BOOT SEQUENCE AUTOMATIONS ---
      if (currentState === 'BOOTING') {
        if (!tossDone) {
          currentState = 'VS_SCREEN';
          dispatchTrigger({ type: 'SHOW_VS_SCREEN' });
        } 
        else if (tossDone && isMatchNew && !hasPlayers) {
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
          currentState = 'LIVE';
        }
      }

      // --- 2. INNINGS START AUTOMATION (Player Cards) ---
      if (currentState === 'LIVE' && hasPlayers && isMatchNew && !hasPlayedIntro && !animationLock) {
        hasPlayedIntro = true;
        animationLock = true;
        dispatchTrigger({ type: 'START_INNINGS_INTRO' });
        setTimeout(() => {
          animationLock = false;
          dispatchTrigger({ type: 'RESTORE' });
        }, overlaySettings.introDuration * 1000);
      }

      // --- 3. AUTO-STATS AT END OF OVERS (DYNAMIC OVERS LOGIC) ---
      if (currentState === 'LIVE' && !animationLock) {
        const currentOversFloat = parseFloat(flatData.team1Overs);
        const isOverComplete = Number.isInteger(currentOversFloat) && currentOversFloat > 0;
        
        // Ensure we only trigger once per over
        if (isOverComplete && currentOversFloat !== lastAutoStatOver) {
          
          const triggerBatting = overlaySettings.enableAutoBatting && (currentOversFloat % overlaySettings.autoBattingOvers === 0);
          const triggerBowling = overlaySettings.enableAutoBowling && (currentOversFloat % overlaySettings.autoBowlingOvers === 0);

          if (triggerBatting || triggerBowling) {
            lastAutoStatOver = currentOversFloat;
            animationLock = true;
            const durationMs = overlaySettings.autoStatsDuration * 1000;

            if (triggerBatting && triggerBowling) {
              // Both cards need to show on this over
              if (overlaySettings.simultaneousStats) {
                // Show together
                dispatchTrigger({ type: 'BOTH_CARDS' });
                setTimeout(() => {
                  animationLock = false;
                  dispatchTrigger({ type: 'RESTORE' });
                }, durationMs);
              } else {
                // Show Sequentially (Batting first, then Bowling)
                dispatchTrigger({ type: 'BATTING_CARD' });
                setTimeout(() => {
                  dispatchTrigger({ type: 'BOWLING_CARD' });
                  setTimeout(() => {
                    animationLock = false;
                    dispatchTrigger({ type: 'RESTORE' });
                  }, durationMs);
                }, durationMs);
              }
            } else if (triggerBatting) {
              // Only Batting
              dispatchTrigger({ type: 'BATTING_CARD' });
              setTimeout(() => {
                animationLock = false;
                dispatchTrigger({ type: 'RESTORE' });
              }, durationMs);
            } else if (triggerBowling) {
              // Only Bowling
              dispatchTrigger({ type: 'BOWLING_CARD' });
              setTimeout(() => {
                animationLock = false;
                dispatchTrigger({ type: 'RESTORE' });
              }, durationMs);
            }
          }
        }
      }

      // --- 4. BACKEND/MANUAL TRIGGERS ---
      if (currentState === 'LIVE' && trigger) {
        dispatchTrigger(trigger);
      }

      // Keep underlying text data updated
      window.postMessage({ type: 'UPDATE_SCORE', data: flatData, raw: rawMatch }, '*');

    } catch (err) {
      console.error('[Scorex Engine] Automation Error:', err);
    }
  }

  // 🛡️ SAFE FETCH & SOCKET LOGIC 
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
    socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => { if (matchId) socket.emit('joinMatch', matchId); });
    socket.on('scoreUpdate', (data) => safeUpdateState(data));
  }

  function getDemoData() {
    return { match: { tossWinnerName: 'Team A', tossDecision: 'bat' }, team1Score: 0, team1Wickets: 0, team1Overs: '0.0', team1Name: 'PREMIUM BATS', team2Name: 'ROYAL CHALLENGERS', strikerName: 'V. Kohli' };
  }

  function init() {
    const isPreview = new URLSearchParams(window.location.search).get('preview') === 'true';
    if (isPreview) { safeUpdateState(getDemoData()); return; }
    safeFetchMatchData(); safeConnectSocket();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

