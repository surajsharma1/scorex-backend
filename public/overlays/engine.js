/**
 * Scorex Overlay Engine
 * Connects overlay templates to live match data via Socket.io + REST API.
 * Injected into every overlay by serveOverlay controller.
 */
(function () {
  'use strict';

  // Ensure config matches what overlayController injects
  const config = window.OVERLAY_CONFIG || {};
  const matchId = config.matchId;
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  // ─── State ────────────────────────────────────────────────────────────────
  let matchData = null;
  let socket = null;

  // ─── Public API (window.ScorexOverlay) ────────────────────────────────────
  window.ScorexOverlay = {
    getData: () => matchData,
    onUpdate: null, 
    refresh: fetchMatchData
  };

  // ─── REST fetch (Initial Load) ────────────────────────────────────────────
  async function fetchMatchData() {
    if (!matchId) {
      console.warn('[Scorex Engine] No matchId configured. Overlay will remain blank.');
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      
      // Handle backend wrapper { success: true, data: {...} }
      const rawMatch = json.data ? json.data : json;
      console.log('[DEBUG ENGINE] Fetched match data:', rawMatch ? {name: rawMatch.name, team1Name: rawMatch.team1Name, team2Name: rawMatch.team2Name} : 'NO DATA');

      updateState(rawMatch);
    } catch (err) {
      console.error('[Scorex Engine] Fetch error:', err);
    }
  }

  // ─── Socket.io (Live Updates) ─────────────────────────────────────────────
  function connectSocket() {
    if (typeof io === 'undefined') {
        console.error('[Scorex Engine] Socket.io script not loaded!');
        return;
    }
    
    socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      console.log('[Scorex Engine] Socket connected! Joining room for Match:', matchId);
      // CRITICAL: Tell the server to send us updates for this specific match
      if (matchId) {
          socket.emit('joinMatch', matchId); 
      }
    });

    // Primary score update event
    socket.on('scoreUpdate', (data) => {
      // Unwrap the 'match' object from the payload
      const matchDoc = data.match ? data.match : data;
      updateState(matchDoc);
    });

    // Match status changed (toss, start, end)
    socket.on('matchStatusUpdate', (data) => {
      if (data && (data._id === matchId || data.matchId === matchId)) {
        fetchMatchData(); // Re-fetch full data on status change
      }
    });

    socket.on('matchEnded', (data) => {
      const matchDoc = data.match ? data.match : data;
      updateState(matchDoc);
    });
  }

  // ─── State update + Notify template ───────────────────────────────────────
  function updateState(rawDocument) {
    if (!rawDocument) return;
    matchData = rawDocument;
    
    if (typeof window.ScorexOverlay.onUpdate === 'function') {
      try {
        window.ScorexOverlay.onUpdate(matchData);
      } catch (err) {
        console.error('[Scorex Engine] onUpdate error:', err);
      }
    }
    
    // Fire a DOM event for modern templates
    window.dispatchEvent(new CustomEvent('scorex:update', { detail: matchData }));

    // ─── THE MAGIC BRIDGE FOR LEGACY HTML TEMPLATES ───
    // Flatten the raw Mongoose document using overlay-utils.js
    let flatData = matchData;
    if (typeof window.normalizeScoreData === 'function') {
        flatData = window.normalizeScoreData(matchData);
    }
console.log('[DEBUG ENGINE] ✅ About to postMessage normalized data with matchName:', flatData.matchName);

    // SINGLE normalization call (removed duplicate)
    window.postMessage({ 
      type: 'UPDATE_SCORE', 
      data: flatData 
    }, '*');

    console.log('[DEBUG ENGINE] ✅ postMessage sent to template');

    // Trick the HTML template into thinking it received a postMessage from a parent window
    window.postMessage({ 
      type: 'UPDATE_SCORE', 
      data: flatData 
    }, '*');
  }

// ─── DEBUG LOGGING ──────────────────────────────────────────────────────
console.log('[DEBUG ENGINE] Config:', config);
console.log('[DEBUG ENGINE] matchId:', matchId);

// ─── Boot ─────────────────────────────────────────────────────────────────

  function init() {
    console.log('[Scorex Engine] Starting...', { matchId, tournamentId: config.tournamentId, apiBaseUrl, socketUrl });
    
    if (!matchId) {
      if (config.tournamentId) {
        console.warn('[Scorex Engine] ❌ No matchId but tournamentId present:', config.tournamentId, 
                     '- Check serveOverlay auto-detection or use ?matchId=xxx');
      } else {
        console.error('[Scorex Engine] ❌ No matchId or tournamentId! Using demo data fallback.');
      }
      // Fallback demo data
      updateState({
        team1Name: 'Demo Team A', team1Score: 45, team1Wickets: 2, team1Overs: '8.3',
        strikerName: 'Player X (25*)', strikerRuns: 25, strikerBalls: 18,
        nonStrikerName: 'Player Y (18)', nonStrikerRuns: 18, nonStrikerBalls: 15,
        bowlerName: 'Bowler Z', bowlerRuns: 32, bowlerWickets: 1, bowlerOvers: '2.0'
      });
      return;
    }
    
    fetchMatchData();       // Initial REST fetch
    connectSocket();        // Live updates
    
    // Aggressive polling fallback (every 5s if no data for 30s)
    let noDataCount = 0;
    const pollInterval = setInterval(() => {
      fetchMatchData();
      noDataCount++;
      if (noDataCount > 6) {  // After 30s no data
        console.error('[Scorex Engine] No live data after 30s - check matchId/backend');
      }
    }, 5000);
    
    // Stop polling once we get real data
    const stopPolling = () => {
      clearInterval(pollInterval);
      noDataCount = 0;
    };
    // Trigger on first successful update
    window.addEventListener('scorex:update', stopPolling, { once: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
