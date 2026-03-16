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

    // Trick the HTML template into thinking it received a postMessage from a parent window
    window.postMessage({ 
      type: 'UPDATE_SCORE', 
      data: flatData 
    }, '*');
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────
  function init() {
    if (!matchId) {
      console.warn('[Scorex Engine] No matchId - overlay will show static content.');
      return;
    }
    fetchMatchData();       // Get initial state via REST
    connectSocket();        // Subscribe to live updates
    
    // Fallback polling just in case socket drops
    setInterval(fetchMatchData, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();