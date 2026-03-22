/**
 * Scorex Overlay Engine (ERROR-GUARDED)
 * Connects overlay templates to live match data via Socket.io + REST API.
 * CRASH-PREVENTION: try-catch around all data updates.
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};
  const matchId = config.matchId;
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  let matchData = null;
  let socket = null;

  window.ScorexOverlay = {
    getData: () => matchData,
    onUpdate: null, 
    refresh: () => safeFetchMatchData()
  };

  // 🛡️ SAFE FETCH WITH FALLBACK
  async function safeFetchMatchData() {
    if (!matchId) {
      console.warn('[Scorex Engine] No matchId - using demo fallback');
      safeUpdateState(getDemoData());
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const rawMatch = json.data || json;
      safeUpdateState(rawMatch);
    } catch (err) {
      console.error('[Scorex Engine] Fetch failed:', err);
      safeUpdateState(getDemoData());
    }
  }

  // 🛡️ SAFE SOCKET
  function safeConnectSocket() {
    if (typeof io === 'undefined') {
      console.error('[Scorex Engine] Socket.io missing');
      return;
    }
    
    socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      console.log('[Scorex Engine] Socket OK, joining:', matchId);
      if (matchId) socket.emit('joinMatch', matchId);
    });

    socket.on('scoreUpdate', (data) => safeUpdateState(data.match || data));
    socket.on('matchStatusUpdate', safeFetchMatchData);
    socket.on('matchEnded', (data) => safeUpdateState(data.match || data));
    
    socket.on('error', (err) => console.error('[Scorex Engine] Socket error:', err));
    socket.on('disconnect', () => console.log('[Scorex Engine] Socket disconnected'));
  }

  // 🛡️ CORE UPDATE WITH FULL GUARDS
  function safeUpdateState(rawDoc) {
    try {
      if (!rawDoc) {
        console.warn('[Scorex Engine] Empty doc - skipping');
        return;
      }

      // NORMALIZE FIRST (with built-in guards)
      let flatData = rawDoc;
      if (typeof window.normalizeScoreData === 'function') {
        flatData = window.normalizeScoreData(rawDoc);
        if (!flatData) {
          console.error('[Scorex Engine] Normalizer returned null');
          flatData = getDemoData();
        }
      }

      matchData = flatData;
      
      // SAFE CALLBACKS
      if (typeof window.ScorexOverlay.onUpdate === 'function') {
        try {
          window.ScorexOverlay.onUpdate(flatData);
        } catch (cbErr) {
          console.error('[Scorex Engine] onUpdate failed:', cbErr);
        }
      }
      
      // SAFE DOM EVENT
      try {
        window.dispatchEvent(new CustomEvent('scorex:update', { detail: flatData }));
      } catch (eventErr) {
        console.error('[Scorex Engine] DOM event failed:', eventErr);
      }

      // SAFE postMessage (iframe communication)
      try {
        window.postMessage({ type: 'UPDATE_SCORE', data: flatData }, '*');
      } catch (postErr) {
        console.error('[Scorex Engine] postMessage failed:', postErr);
      }

      console.log('[Scorex Engine] ✅ Update OK:', flatData.matchName);

    } catch (stateErr) {
      console.error('[Scorex Engine] CRITICAL updateState error:', stateErr);
      // FALLBACK: Send demo data
      const demo = getDemoData();
      try {
        window.postMessage({ type: 'UPDATE_SCORE', data: demo }, '*');
      } catch {}
    }
  }

  // FALLBACK DEMO DATA
function getDemoData() {
    return {
      matchName: 'ScoreX Premium Showcase',
      tournamentName: 'MEMBERSHIP DEMO',
      team1Name: 'PREMIUM BATS',
      team1Score: 124, team1Wickets: 3, team1Overs: '14.2',
      strikerName: 'V Kohli', strikerRuns: 68, strikerBalls: 42,
      nonStrikerName: 'R Sharma', nonStrikerRuns: 32, nonStrikerBalls: 28,
      bowlerName: 'J Anderson', bowlerRuns: 45, bowlerWickets: 2, bowlerOvers: '3.4',
      target: 180, runRate: '8.44', requiredRunRate: '9.23'
    };
  }

  // BOOT
  function init() {
    console.log('[Scorex Engine] Starting (guarded)...', { matchId });
    
    safeFetchMatchData();
    safeConnectSocket();
    
    // POLLING FALLBACK
    let noDataCount = 0;
    const poll = setInterval(() => {
      safeFetchMatchData();
      if (++noDataCount > 6) console.error('[Scorex Engine] No data 30s - check backend');
    }, 5000);
    
    window.addEventListener('scorex:update', () => {
      clearInterval(poll);
      noDataCount = 0;
    }, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[Scorex Engine] Guards loaded');
})();

