/**
 * Scorex Overlay Engine
 * Connects overlay templates to live match data via Socket.io + REST API.
 * Injected into every overlay by serveOverlay controller.
 * window.OVERLAY_CONFIG is injected before this script runs.
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};
  const matchId = config.matchId;
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  // ─── State ────────────────────────────────────────────────────────────────
  let matchData = null;
  let socket = null;
  let retryCount = 0;
  const MAX_RETRIES = 5;

  // ─── Public API (window.ScorexOverlay) ────────────────────────────────────
  window.ScorexOverlay = {
    getData: () => matchData,
    onUpdate: null,   // Set by template: window.ScorexOverlay.onUpdate = fn(data)
    refresh: fetchMatchData
  };

  // ─── REST fetch ───────────────────────────────────────────────────────────
  async function fetchMatchData() {
    if (!matchId) {
      console.warn('[Scorex Engine] No matchId configured.');
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const data = json.data || json;
      updateState(normalise(data));
    } catch (err) {
      console.error('[Scorex Engine] Fetch error:', err);
    }
  }

  // ─── Socket.io ────────────────────────────────────────────────────────────
  function connectSocket() {
    if (!window.io) {
      console.warn('[Scorex Engine] Socket.io not loaded, retrying...');
      if (retryCount++ < MAX_RETRIES) setTimeout(connectSocket, 1000);
      return;
    }

    socket = window.io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      console.log('[Scorex Engine] Socket connected:', socket.id);
      if (matchId) {
        socket.emit('join_match', matchId);
        socket.emit('joinMatch', matchId);
      }
    });

    // Primary score update event
    socket.on('scoreUpdate', (data) => {
      updateState(normalise(data));
    });

    // Match status changed (toss, start, end)
    socket.on('matchStatusUpdate', (data) => {
      if (data && (data._id === matchId || data.matchId === matchId)) {
        fetchMatchData(); // Re-fetch full data on status change
      }
    });

    socket.on('matchEnded', (data) => {
      updateState(normalise(data));
    });

    socket.on('disconnect', () => {
      console.warn('[Scorex Engine] Socket disconnected.');
    });

    socket.on('connect_error', (err) => {
      console.error('[Scorex Engine] Connection error:', err.message);
    });
  }

  // ─── Normalise match document into a flat, template-friendly shape ────────
  function normalise(raw) {
    if (!raw) return null;

    // Handle both populated objects and plain ID strings for teams
    const team1 = raw.team1 && typeof raw.team1 === 'object' ? raw.team1 : { _id: raw.team1, name: 'Team 1', shortName: 'T1' };
    const team2 = raw.team2 && typeof raw.team2 === 'object' ? raw.team2 : { _id: raw.team2, name: 'Team 2', shortName: 'T2' };
    const tossWinner = raw.tossWinner && typeof raw.tossWinner === 'object' ? raw.tossWinner : null;

    // Current innings index (0-based)
    const inningsIdx = (raw.currentInnings || 1) - 1;
    const battingInnings = raw.innings && raw.innings[inningsIdx];
    const completedInnings = raw.innings && raw.innings[0] && inningsIdx === 1 ? raw.innings[0] : null;

    // Determine batting/bowling team for current innings
    let battingTeam = team1;
    let bowlingTeam = team2;
    if (battingInnings && battingInnings.teamId) {
      const btid = battingInnings.teamId.toString ? battingInnings.teamId.toString() : battingInnings.teamId;
      const t1id = (team1._id || '').toString();
      if (btid !== t1id) {
        battingTeam = team2;
        bowlingTeam = team1;
      }
    }

    // Overs formatted as "X.Y"
    function fmtOvers(overs, balls) {
      if (overs !== undefined) return Number(overs).toFixed(1);
      if (balls !== undefined) return `${Math.floor(balls / 6)}.${balls % 6}`;
      return '0.0';
    }

    const currentScore = battingInnings
      ? { runs: battingInnings.score || 0, wickets: battingInnings.wickets || 0, overs: fmtOvers(battingInnings.overs, battingInnings.balls), runRate: (battingInnings.runRate || 0).toFixed(2) }
      : { runs: raw.team1Score || 0, wickets: raw.team1Wickets || 0, overs: fmtOvers(raw.team1Overs), runRate: '0.00' };

    const firstInningsScore = completedInnings
      ? { runs: completedInnings.score || 0, wickets: completedInnings.wickets || 0, overs: fmtOvers(completedInnings.overs, completedInnings.balls) }
      : null;

    // Required runs (2nd innings)
    const requiredRuns = battingInnings && battingInnings.requiredRuns != null ? battingInnings.requiredRuns : null;
    const requiredRunRate = battingInnings && battingInnings.requiredRunRate != null ? Number(battingInnings.requiredRunRate).toFixed(2) : null;
    const target = battingInnings && battingInnings.targetScore != null ? battingInnings.targetScore : null;

    // Current over balls
    const currentOverBalls = battingInnings && battingInnings.currentOverBalls
      ? battingInnings.currentOverBalls
      : [];

    // Extras
    const extras = battingInnings && battingInnings.extras
      ? battingInnings.extras
      : { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
    const totalExtras = (extras.wides || 0) + (extras.noBalls || 0) + (extras.byes || 0) + (extras.legByes || 0);

    return {
      // Match meta
      matchId: raw._id,
      matchName: raw.name || `${team1.name} vs ${team2.name}`,
      status: raw.status || 'upcoming',
      format: raw.format || 'T20',
      venue: raw.venue || 'TBD',
      currentInnings: raw.currentInnings || 1,

      // Teams
      team1: { id: team1._id, name: team1.name || 'Team 1', shortName: team1.shortName || 'T1', logo: team1.logo || '' },
      team2: { id: team2._id, name: team2.name || 'Team 2', shortName: team2.shortName || 'T2', logo: team2.logo || '' },
      battingTeam: { id: battingTeam._id, name: battingTeam.name, shortName: battingTeam.shortName, logo: battingTeam.logo || '' },
      bowlingTeam: { id: bowlingTeam._id, name: bowlingTeam.name, shortName: bowlingTeam.shortName, logo: bowlingTeam.logo || '' },

      // Toss
      toss: raw.tossDecision ? {
        winner: tossWinner ? tossWinner.name : (raw.tossWinner || ''),
        decision: raw.tossDecision
      } : null,

      // Scores
      score: currentScore,
      firstInnings: firstInningsScore,
      target,
      requiredRuns,
      requiredRunRate,

      // Ball-by-ball (current over)
      currentOverBalls,
      currentOver: raw.currentOver || 0,
      currentBall: raw.currentBall || 0,

      // Extras
      extras,
      totalExtras,

      // Full innings array (for scorecards)
      innings: raw.innings || [],

      // Result
      winner: raw.winner,
      resultType: raw.resultType,
      margin: raw.margin,

      // Raw doc in case template needs something specific
      _raw: raw
    };
  }

  // ─── State update + notify template ──────────────────────────────────────
  function updateState(normalised) {
    if (!normalised) return;
    matchData = normalised;
    if (typeof window.ScorexOverlay.onUpdate === 'function') {
      try {
        window.ScorexOverlay.onUpdate(matchData);
      } catch (err) {
        console.error('[Scorex Engine] onUpdate error:', err);
      }
    }
    // Also fire a DOM event so templates can use addEventListener
    window.dispatchEvent(new CustomEvent('scorex:update', { detail: matchData }));
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    if (!matchId) {
      console.warn('[Scorex Engine] No matchId - overlay will show static content.');
      return;
    }
    fetchMatchData();       // Get initial state via REST
    connectSocket();        // Then subscribe to live updates
    // Poll every 30s as fallback for missed socket events
    setInterval(fetchMatchData, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
