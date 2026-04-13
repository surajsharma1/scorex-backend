/**
 * ScoreX Overlay Engine v6 — LIVE UPDATES FIXED
 * - Robust socket reconnection that re-joins match room on every connect/reconnect
 * - HTTP polling fallback (every 5s) so OBS always stays current even if socket drops
 * - cache:'no-store' on all fetches to prevent stale browser cache
 * - postMessage passthrough for preview iframe parent triggers
 * - Full animation state machine from v5 preserved
 */
(function () {
  'use strict';

  var config      = window.OVERLAY_CONFIG || {};
  var urlParams   = new URLSearchParams(window.location.search);
  var matchId     = urlParams.get('matchId') || config.matchId;
  var apiBaseUrl  = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  var socketUrl   = apiBaseUrl.replace('/api/v1', '');

  // ── Parse ?cfg= JSON for configurable durations ───────────────────────────
  var globalCfg = {};
  try {
    var cfgParam = urlParams.get('cfg');
    if (cfgParam) globalCfg = JSON.parse(decodeURIComponent(cfgParam));
  } catch (e) {}

  var cfg = {
    vsDuration:           globalCfg.vsDuration           || 10,
    tossDuration:         globalCfg.tossDuration          || 8,
    squadDuration:        globalCfg.squadDuration         || 8,
    introDuration:        globalCfg.introDuration         || 8,
    fourDuration:         globalCfg.fourDuration          || 4,
    sixDuration:          globalCfg.sixDuration           || 5,
    wicketDuration:       globalCfg.wicketDuration        || 8,
    playerChangeDuration: globalCfg.playerChangeDuration  || 8,
    bowlerChangeDuration: globalCfg.bowlerChangeDuration  || 8,
    targetCardDuration:   globalCfg.targetCardDuration    || 10,
    matchSummaryDuration: globalCfg.matchSummaryDuration  || 20,
    autoBattingOvers:     globalCfg.autoBattingOvers      || 0,
    autoBowlingOvers:     globalCfg.autoBowlingOvers      || 0,
    summaryDuration:      globalCfg.summaryDuration       || 12,
    pollInterval:         globalCfg.pollInterval          || 5000,

    showVS:             globalCfg.showVS             !== false,
    showToss:           globalCfg.showToss            !== false,
    showSquads:         globalCfg.showSquads          !== false,
    showInningIntro:    globalCfg.showInningIntro     !== false,
    showFour:           globalCfg.showFour            !== false,
    showSix:            globalCfg.showSix             !== false,
    showWicket:         globalCfg.showWicket          !== false,
    showDecision:       globalCfg.showDecision        !== false,
    showPlayerChange:   globalCfg.showPlayerChange    !== false,
    showBowlerChange:   globalCfg.showBowlerChange    !== false,
    showBattingSummary: globalCfg.showBattingSummary  !== false,
    showBowlingSummary: globalCfg.showBowlingSummary  !== false,
    showTargetCard:     globalCfg.showTargetCard      !== false,
    showMatchEnd:       globalCfg.showMatchEnd        !== false,
  };

  // ── State ─────────────────────────────────────────────────────────────────
  var matchData         = null;
  var socket            = null;
  var state             = 'BOOTING';
  var animLock          = false;
  var animLockTimer     = null;
  var lastOverNumber    = -1;
  var inn1IntroPlayed   = false;
  var inn2IntroPlayed   = false;
  var matchEndFired     = false;
  var decisionPending   = false;
  var lastBallCount     = -1;
  var lastInnings       = 1;
  var pollTimer         = null;
  var lastPollSig       = null;

  // ── Dispatch helpers ──────────────────────────────────────────────────────
  function dispatch(type, data, duration) {
    var payload = { type: type, data: data || {}, duration: duration || 0 };
    console.log('[Engine] DISPATCH:', type);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: payload, _engineSelf: true }, '*');
  }

  function lock(seconds, callback) {
    if (animLockTimer) clearTimeout(animLockTimer);
    animLock = true;
    animLockTimer = setTimeout(function() {
      animLock = false;
      if (callback) callback();
    }, seconds * 1000);
  }

  function dispatchAndUnlock(type, data, duration, then) {
    dispatch(type, data, duration);
    lock(duration, function() {
      dispatch('RESTORE', {});
      if (then) then();
    });
  }

  // ── Main update handler ───────────────────────────────────────────────────
  function onData(raw) {
    try {
      if (!raw) return;

      var flat = typeof window.normalizeScoreData === 'function'
        ? window.normalizeScoreData(raw)
        : raw;

      matchData = flat;

      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw.match || raw, _engineSelf: true }, '*');

      if (typeof window.renderCurrentOver === 'function') {
        window.renderCurrentOver(flat.thisOver || []);
      }

      var matchObj    = raw.match || raw;
      var tossDone    = !!(matchObj.tossWinnerName || matchObj.tossDecision);
      var hasPlayers  = !!(flat.strikerName);
      var isMatchDone = matchObj.status === 'completed' || matchObj.status === 'ended';
      var currentInn  = matchObj.currentInnings || 1;

      if (raw.activeTrigger && state === 'LIVE') {
        handleTrigger(raw.activeTrigger, flat);
        return;
      }

      if (isMatchDone && !matchEndFired && cfg.showMatchEnd) {
        matchEndFired = true;
        state = 'MATCH_END';
        var summary = raw.matchSummary || flat.matchSummary || null;
        dispatch('MATCH_WIN', {
          winnerName: flat.winnerName || matchObj.winnerName || '',
          resultSummary: flat.resultSummary || matchObj.resultSummary || '',
          summary: summary
        }, cfg.matchSummaryDuration);
        lock(cfg.matchSummaryDuration, function() {
          dispatch('MATCH_SUMMARY', { summary: summary, data: flat }, cfg.matchSummaryDuration);
        });
        return;
      }

      if (state === 'BOOTING') {
        if (isMatchDone) { state = 'LIVE'; dispatch('RESTORE', {}); return; }
        if (!tossDone && cfg.showVS) {
          state = 'VS_SCREEN';
          dispatch('SHOW_VS_SCREEN', { team1Name: flat.team1Name, team2Name: flat.team2Name });
          return;
        }
        if (tossDone && !hasPlayers && cfg.showToss) { _doTossSequence(flat, matchObj); return; }
        state = 'LIVE';
        dispatch('RESTORE', {});
        return;
      }

      if (state === 'VS_SCREEN') {
        if (tossDone) {
          if (cfg.showToss) { _doTossSequence(flat, matchObj); }
          else { state = 'LIVE'; dispatch('RESTORE', {}); }
        }
        return;
      }

      if (state !== 'LIVE' || animLock) return;

      if (currentInn === 2 && !inn2IntroPlayed && hasPlayers && cfg.showInningIntro) {
        inn2IntroPlayed = true;
        var inn2 = matchObj.innings && matchObj.innings[1] ? matchObj.innings[1] : {};
        if ((inn2.balls || 0) < 2) {
          dispatchAndUnlock('INNING_START', {
            innings: 2, battingTeamName: flat.inn2TeamName || flat.team2Name,
            players: flat.team2Players || [], target: flat.target,
          }, cfg.introDuration);
          return;
        }
      }

      if (currentInn === 1 && !inn1IntroPlayed && hasPlayers && cfg.showInningIntro) {
        inn1IntroPlayed = true;
        var inn1 = matchObj.innings && matchObj.innings[0] ? matchObj.innings[0] : {};
        if ((inn1.balls || 0) < 2) {
          dispatchAndUnlock('INNING_START', {
            innings: 1, battingTeamName: flat.inn1TeamName || flat.team1Name,
            players: flat.team1Players || [],
          }, cfg.introDuration);
          return;
        }
      }

      if (lastInnings !== currentInn && currentInn === 2) {
        lastInnings = currentInn;
        if (cfg.showTargetCard) {
          dispatchAndUnlock('TARGET_CARD', {
            targetScore: flat.target || (flat.inn1Score + 1),
            inn1Score: flat.inn1Score, inn1Wickets: flat.inn1Wickets,
            inn1Overs: flat.inn1Overs, inn1TeamName: flat.inn1TeamName,
            battingSummary: flat.inn1Batting, bowlingSummary: flat.inn1Bowling,
          }, cfg.targetCardDuration, function() {
            if (cfg.showInningIntro && !inn2IntroPlayed) {
              inn2IntroPlayed = true;
              dispatchAndUnlock('INNING_START', {
                innings: 2, battingTeamName: flat.inn2TeamName || flat.team2Name,
                players: flat.team2Players || [], target: flat.target,
              }, cfg.introDuration);
            }
          });
          return;
        }
      }
      lastInnings = currentInn;

      var currentInnObj = matchObj.innings && matchObj.innings[currentInn - 1] ? matchObj.innings[currentInn - 1] : {};
      var currentBalls  = currentInnObj.balls || 0;
      var completedOvers = Math.floor(currentBalls / 6);
      if (currentBalls % 6 === 0 && completedOvers > 0 && completedOvers !== lastOverNumber) {
        lastOverNumber = completedOvers;
        if (cfg.autoBattingOvers > 0 && completedOvers % cfg.autoBattingOvers === 0 && cfg.showBattingSummary) {
          dispatchAndUnlock('BATTING_SUMMARY', { batsmen: flat.battingSummary, teamName: flat.battingTeamName, innings: currentInn }, cfg.summaryDuration);
          return;
        }
        if (cfg.autoBowlingOvers > 0 && completedOvers % cfg.autoBowlingOvers === 0 && cfg.showBowlingSummary) {
          dispatchAndUnlock('BOWLING_SUMMARY', { bowlers: flat.bowlingSummary, teamName: flat.bowlingTeamName, innings: currentInn }, cfg.summaryDuration);
          return;
        }
      }
      lastBallCount = currentBalls;

    } catch (err) {
      console.error('[Engine] Error in onData:', err);
    }
  }

  function _doTossSequence(flat, matchObj) {
    state = 'TOSS';
    dispatch('SHOW_TOSS', {
      tossWinnerName: matchObj.tossWinnerName || flat.tossWinnerName || '',
      tossDecision: matchObj.tossDecision || flat.tossDecision || '',
      team1Name: flat.team1Name, team2Name: flat.team2Name,
    });
    lock(cfg.tossDuration, function() {
      if (cfg.showSquads) {
        state = 'SQUADS';
        dispatch('SHOW_SQUADS', { team1Name: flat.team1Name, team2Name: flat.team2Name, team1Players: flat.team1Players, team2Players: flat.team2Players });
        lock(cfg.squadDuration, function() { state = 'LIVE'; dispatch('RESTORE', {}); });
      } else { state = 'LIVE'; dispatch('RESTORE', {}); }
    });
  }

  function handleTrigger(trigger, flat) {
    var t    = trigger.type  || trigger;
    var data = trigger.data  || trigger.payload || {};
    var dur  = trigger.duration || 6;
    var richData = Object.assign({}, flat, data);

    switch (t) {
      case 'FOUR':             if (!cfg.showFour)          return; dispatch('FOUR', richData, dur); break;
      case 'SIX':              if (!cfg.showSix)           return; dispatch('SIX', richData, dur); break;
      case 'WICKET':           if (!cfg.showWicket)        return; dispatch('WICKET', richData, dur); break;
      case 'DECISION_PENDING': if (!cfg.showDecision)      return; decisionPending = !decisionPending; dispatch('DECISION_PENDING', { active: decisionPending }, 0); break;
      case 'PLAYER_CHANGE':    if (!cfg.showPlayerChange)  return; dispatch('PLAYER_CHANGE', richData, dur); break;
      case 'BOWLER_CHANGE':    if (!cfg.showBowlerChange)  return; dispatch('BOWLER_CHANGE', richData, dur); break;
      case 'BATTING_SUMMARY':  if (!cfg.showBattingSummary) return; dispatchAndUnlock('BATTING_SUMMARY', richData, cfg.summaryDuration); break;
      case 'BOWLING_SUMMARY':  if (!cfg.showBowlingSummary) return; dispatchAndUnlock('BOWLING_SUMMARY', richData, cfg.summaryDuration); break;
      case 'BOTH_CARDS':
        if (cfg.showBattingSummary) {
          dispatchAndUnlock('BATTING_SUMMARY', richData, cfg.summaryDuration, function() {
            if (cfg.showBowlingSummary) dispatchAndUnlock('BOWLING_SUMMARY', richData, cfg.summaryDuration);
          });
        }
        break;
      case 'TARGET_CARD':   if (!cfg.showTargetCard) return; dispatch('TARGET_CARD', richData, cfg.targetCardDuration); break;
      case 'INNING_START':  dispatch('INNING_START', richData, cfg.introDuration); break;
      case 'SHOW_VS_SCREEN': dispatch('SHOW_VS_SCREEN', richData); break;
      case 'SHOW_TOSS':     dispatch('SHOW_TOSS', richData, cfg.tossDuration); break;
      case 'SHOW_SQUADS':   dispatch('SHOW_SQUADS', richData, cfg.squadDuration); break;
      case 'MATCH_WIN':     dispatch('MATCH_WIN', richData, cfg.matchSummaryDuration); break;
      case 'MATCH_SUMMARY': dispatch('MATCH_SUMMARY', richData, cfg.matchSummaryDuration); break;
      case 'RESTORE':       decisionPending = false; dispatch('RESTORE', {}); break;
      default:              dispatch(t, richData, dur);
    }
  }

  // ── Fetch with no-store cache ─────────────────────────────────────────────
  function fetchMatch(callback) {
    if (!matchId) { if (callback) callback(null); else onData(getDemoData()); return; }
    fetch(apiBaseUrl + '/matches/' + matchId, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(json) { var d = json.data || json; if (callback) callback(d); else onData(d); })
      .catch(function(err) { console.warn('[Engine] fetch failed:', err); if (!callback) onData(getDemoData()); });
  }

  // ── HTTP polling fallback — keeps OBS alive even if socket drops ──────────
  function startPolling() {
    if (!matchId || pollTimer) return;
    console.log('[Engine] Starting HTTP poll every', cfg.pollInterval, 'ms');
    pollTimer = setInterval(function() {
      if (state !== 'LIVE' && state !== 'BOOTING') return;
      fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(json) {
          if (!json) return;
          var data = json.data || json;
          var matchObj = data.match || data;
          var sig = JSON.stringify({
            s: matchObj.innings ? matchObj.innings.map(function(i) { return i.score + '/' + i.wickets + ':' + i.balls; }) : [],
            bn: matchObj.strikerName,
            st: matchObj.status,
          });
          if (sig !== lastPollSig) {
            lastPollSig = sig;
            var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(data) : data;
            matchData = flat;
            window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: matchObj, _engineSelf: true }, '*');
            if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);
            console.log('[Engine] Poll: score updated');
          }
        })
        .catch(function() {});
    }, cfg.pollInterval);
  }

  // ── Socket connection ─────────────────────────────────────────────────────
  function connectSocket() {
    if (typeof io === 'undefined') {
      console.warn('[Engine] Socket.IO not available — using HTTP polling only');
      startPolling();
      return;
    }

    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    function joinRoom() {
      if (matchId) {
        socket.emit('joinMatch', matchId);
        socket.emit('join_match', matchId);
        console.log('[Engine] Joined match room:', matchId);
      }
    }

    socket.on('connect', function() {
      console.log('[Engine] Socket connected');
      joinRoom();
    });

    // Re-join on every reconnect — critical for OBS long-running sessions
    socket.io.on('reconnect', function() {
      console.log('[Engine] Socket reconnected — re-joining room');
      joinRoom();
    });

    socket.on('scoreUpdate', function(payload) {
      console.log('[Engine] scoreUpdate');
      if (payload && payload.activeTrigger && !payload.match) {
        if (state === 'LIVE') handleTrigger(payload.activeTrigger, matchData || {});
        return;
      }
      onData(payload);
    });

    socket.on('overlayTrigger', function(trigger) {
      console.log('[Engine] overlayTrigger:', trigger.type);
      if (state === 'LIVE' || trigger.type === 'TARGET_CARD' || trigger.type === 'INNING_START') {
        handleTrigger(trigger, matchData || {});
      }
    });

    socket.on('inningsEnded', function(payload) {
      console.log('[Engine] inningsEnded');
      state = 'LIVE'; animLock = false;
      onData(payload);
    });

    socket.on('matchEnded', function(payload) {
      console.log('[Engine] matchEnded');
      if (!matchEndFired && cfg.showMatchEnd) {
        matchEndFired = true;
        var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(payload) : {};
        state = 'MATCH_END';
        dispatch('MATCH_WIN', {
          winnerName: payload.winnerName || flat.winnerName || '',
          resultSummary: payload.resultSummary || flat.resultSummary || '',
          summary: payload.matchSummary || null,
        }, cfg.matchSummaryDuration);
        lock(cfg.matchSummaryDuration, function() {
          dispatch('MATCH_SUMMARY', { summary: payload.matchSummary, data: flat }, cfg.matchSummaryDuration);
        });
      }
    });

    socket.on('disconnect', function(reason) {
      console.warn('[Engine] Socket disconnected:', reason);
    });
  }

  // ── postMessage from parent page (preview iframe) ─────────────────────────
  window.addEventListener('message', function(e) {
    if (!e.data || e.data._engineSelf) return;

    if (e.data.type === 'UPDATE_SCORE' && e.data.data) {
      var flat = e.data.data;
      matchData = flat;
      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: flat, _engineSelf: true }, '*');
      if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);
    }

    if (e.data.type === 'OVERLAY_TRIGGER' && e.data.payload) {
      handleTrigger(e.data.payload, matchData || {});
    }
  });

  // ── Demo data ─────────────────────────────────────────────────────────────
  function getDemoData() {
    return {
      match: {
        name: 'ScoreX Demo', status: 'live', currentInnings: 1,
        team1Name: 'SCOREX XI', team2Name: 'CHALLENGERS',
        strikerName: 'V. Kohli', nonStrikerName: 'R. Sharma',
        currentBowlerName: 'J. Bumrah',
        innings: [{
          teamName: 'SCOREX XI', score: 124, wickets: 3, balls: 96, runRate: 7.75,
          batsmen: [
            { name: 'V. Kohli',  runs: 68, balls: 45, fours: 7, sixes: 2, isStriker: true,  isOut: false },
            { name: 'R. Sharma', runs: 32, balls: 28, fours: 4, sixes: 1, isStriker: false, isOut: false },
          ],
          bowlers: [{ name: 'J. Bumrah', balls: 18, runs: 22, wickets: 2, economy: 7.33 }],
          ballHistory: [{runs:1},{runs:4},{runs:0},{wicket:true},{runs:6},{runs:2}],
        }],
      },
      result: { score: 124, wickets: 3, overs: '16.0', strikerMatchRuns: 68, strikerMatchBalls: 45, runRate: '7.75' },
      overSummary: '1 4 W 6 0 2',
    };
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function init() {
    var isPreview = urlParams.get('preview') === 'true';

    if (isPreview && !matchId) {
      // Pure preview mode — show demo, wait for postMessage from parent
      console.log('[Engine] Preview mode (no matchId) — showing demo');
      onData(getDemoData());
      return;
    }

    // Fetch immediately + start socket + start polling
    fetchMatch(function(data) { onData(data || getDemoData()); });
    connectSocket();
    startPolling();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
