/**
 * Scorex Overlay Engine V3 (AUTO-DIRECTOR HYBRID ARCHITECTURE)
 * normalizeScoreData and renderCurrentOver are provided by overlay-utils.js
 * which must be loaded BEFORE this file.
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};

  // Grab matchId from URL first, then fall back to config
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('matchId') || config.matchId;

  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl  = apiBaseUrl.replace('/api/v1', '');

  // Parse optional JSON config from URL ?cfg=...
  let globalCfg = {};
  try {
    const cfgParam = urlParams.get('cfg');
    if (cfgParam) globalCfg = JSON.parse(decodeURIComponent(cfgParam));
  } catch (e) { console.error('[Scorex Engine] Could not parse cfg param', e); }

  const overlaySettings = {
    tossDuration:    globalCfg.tossDuration    || 8,
    squadDuration:   globalCfg.squadDuration   || 12,
    introDuration:   globalCfg.introDuration   || 12,
    autoStatsOvers:  globalCfg.autoStatsOvers  !== undefined ? globalCfg.autoStatsOvers : 5,
    autoStatsType:   globalCfg.autoStatsType   || 'BOTH_CARDS',
    autoStatsDuration: globalCfg.autoStatsDuration || 10
  };

  let matchData      = null;
  let socket         = null;
  let currentState   = 'BOOTING';
  let hasPlayedIntro = false;
  let lastAutoStatOver = -1;
  let animationLock  = false;

  function dispatchTrigger(triggerObj) {
    console.log('[Scorex Auto-Director] 🎬 Firing:', triggerObj.type, triggerObj);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: triggerObj }, '*');
  }

  function safeUpdateState(rawDoc) {
    try {
      if (!rawDoc) return;

      const trigger  = rawDoc.activeTrigger || null;
      const rawMatch = rawDoc.match || rawDoc;

      // Use overlay-utils.js normalizer; fall back to raw payload if not loaded
      let flatData = typeof window.normalizeScoreData === 'function'
        ? window.normalizeScoreData(rawDoc)
        : rawDoc;

      matchData = flatData;

      const isMatchNew = flatData.team1Score === 0
        && (flatData.team1Overs === '0.0' || flatData.team1Overs === 0)
        && flatData.team1Wickets === 0;
      const tossDone  = !!rawMatch.tossWinnerName;
      const hasPlayers = !!flatData.strikerName;

      // ── 1. BROADCAST SEQUENCING ──────────────────────────────────────────
      if (currentState === 'BOOTING' || currentState === 'VS_SCREEN') {
        if (!tossDone) {
          if (currentState !== 'VS_SCREEN') {
            currentState = 'VS_SCREEN';
            dispatchTrigger({ type: 'SHOW_VS_SCREEN' });
          }
        } else if (tossDone && isMatchNew && !hasPlayers) {
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
          dispatchTrigger({ type: 'RESTORE' });
        }
      }

      // ── 2. INNINGS START INTRO ───────────────────────────────────────────
      if (currentState === 'LIVE' && hasPlayers && isMatchNew && !hasPlayedIntro && !animationLock) {
        hasPlayedIntro = true;
        animationLock  = true;
        dispatchTrigger({ type: 'START_INNINGS_INTRO' });
        setTimeout(() => {
          animationLock = false;
          dispatchTrigger({ type: 'RESTORE' });
        }, overlaySettings.introDuration * 1000);
      }

      // ── 3. AUTO-STATS AT END OF OVERS ────────────────────────────────────
      if (currentState === 'LIVE' && overlaySettings.autoStatsOvers > 0 && !animationLock) {
        const oversFloat  = parseFloat(flatData.team1Overs);
        const isComplete  = Number.isInteger(oversFloat) && oversFloat > 0;
        if (isComplete && (oversFloat % overlaySettings.autoStatsOvers === 0) && oversFloat !== lastAutoStatOver) {
          lastAutoStatOver = oversFloat;
          animationLock    = true;
          dispatchTrigger({ type: overlaySettings.autoStatsType });
          setTimeout(() => {
            animationLock = false;
            dispatchTrigger({ type: 'RESTORE' });
          }, overlaySettings.autoStatsDuration * 1000);
        }
      }

      // ── 4. MANUAL TRIGGER PASSTHROUGH ────────────────────────────────────
      if (currentState === 'LIVE' && trigger) {
        dispatchTrigger(trigger);
      }

      // ── 5. BALL RENDERER ─────────────────────────────────────────────────
      if (typeof window.renderCurrentOver === 'function') {
        window.renderCurrentOver(flatData.thisOver);
      }

      // ── 6. BROADCAST SCORE UPDATE ────────────────────────────────────────
      window.postMessage({ type: 'UPDATE_SCORE', data: flatData, raw: rawMatch }, '*');

    } catch (err) {
      console.error('[Scorex Engine] Automation Error:', err);
    }
  }

  // ── FETCH ─────────────────────────────────────────────────────────────────
  async function safeFetchMatchData() {
    if (!matchId) return safeUpdateState(getDemoData());
    try {
      const res  = await fetch(`${apiBaseUrl}/matches/${matchId}`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('API fetch failed');
      const json = await res.json();
      safeUpdateState(json.data || json);
    } catch (err) {
      console.error('[Scorex Engine] Initial fetch error:', err);
      safeUpdateState(getDemoData());
    }
  }

  // ── SOCKET ────────────────────────────────────────────────────────────────
  function safeConnectSocket() {
    if (typeof io === 'undefined') return;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity
    });

    socket.on('connect', () => {
      console.log('[Scorex Engine] 🟢 Connected to Live Socket!');
      if (matchId) {
        socket.emit('joinMatch', matchId);
        socket.emit('join_match', matchId);
      }
    });

    socket.on('scoreUpdate',    (payload) => {
      console.log('[Scorex Engine] ⚡ scoreUpdate received:', payload);
      safeUpdateState(payload);
    });
    socket.on('match_updated',  (payload) => safeUpdateState(payload));
    socket.on('disconnect',     ()        => console.warn('[Scorex Engine] 🔴 Disconnected, reconnecting...'));
  }

  // ── DEMO DATA ─────────────────────────────────────────────────────────────
  function getDemoData() {
    return {
      match: {
        team1Name: 'PREM', team2Name: 'CHAL',
        team1Score: 184, team1Wickets: 4, team1Overs: '18.2',
        team2Score: 0,   team2Wickets: 0, team2Overs: '0.0',
        currentInnings: 1,
        strikerName: 'V. Kohli', nonStrikerName: 'S. Yadav',
        currentBowlerName: 'J. Bumrah'
      },
      result: {
        score: 184, wickets: 4, overs: '18.2',
        strikerMatchRuns: 78, strikerMatchBalls: 45,
        runRate: '10.11',
        overSummary: '1 4 W 0 6 1'
      },
      overSummary: '1 4 W 0 6 1'
    };
  }

  // ── INIT ──────────────────────────────────────────────────────────────────
  function init() {
    const params    = new URLSearchParams(window.location.search);
    const isPreview = params.get('preview') === 'true';
    if (isPreview && !config.matchId) {
      safeUpdateState(getDemoData());
      return;
    }
    safeFetchMatchData();
    safeConnectSocket();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();