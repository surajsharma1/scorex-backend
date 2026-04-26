/**
 * ScoreX Overlay Engine v15 — DIRECT SHARED PANEL FOR MANUAL TRIGGERS
 */
(function () {
  'use strict';

  var baseConfig  = window.OVERLAY_CONFIG || {};
  var userCfg     = baseConfig.config || {}; 
  var urlParams   = new URLSearchParams(window.location.search);
  var matchId     = urlParams.get('matchId') || baseConfig.matchId;
  var apiBaseUrl  = baseConfig.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  var socketUrl   = apiBaseUrl.replace('/api/v1', '');

  var cfg = {
    vsDuration:           userCfg.vsDuration           || 10,
    tossDuration:         userCfg.tossDuration          || 8,
    squadDuration:        userCfg.squadDuration         || 8,
    introDuration:        userCfg.introDuration         || 8,
    fourDuration:         userCfg.fourDuration          || 4,
    sixDuration:          userCfg.sixDuration           || 5,
    wicketDuration:       userCfg.wicketDuration        || 8,
    playerChangeDuration: userCfg.playerChangeDuration  || 8,
    bowlerChangeDuration: userCfg.bowlerChangeDuration  || 8,
    targetCardDuration:   userCfg.targetCardDuration    || 10,
    matchSummaryDuration: userCfg.matchSummaryDuration  || 20,
    summaryDuration:      userCfg.summaryDuration       || 12,
    pollInterval:         userCfg.pollInterval          || 5000,

    showVS:             userCfg.showVS             !== false,
    showToss:           userCfg.showToss            !== false,
    showSquads:         userCfg.showSquads          !== false,
    showInningIntro:    userCfg.showInningIntro     !== false,
    showFour:           userCfg.showFour            !== false,
    showSix:            userCfg.showSix             !== false,
    showWicket:         userCfg.showWicket          !== false,
    showPlayerChange:   userCfg.showPlayerChange    !== false,
    showBowlerChange:   userCfg.showBowlerChange    !== false,
    showBattingSummary: userCfg.showBattingSummary  !== false,
    showBowlingSummary: userCfg.showBowlingSummary  !== false,
    showTargetCard:     userCfg.showTargetCard      !== false,
    showMatchEnd:       userCfg.showMatchEnd        !== false,
    autoBattingOvers:   userCfg.autoBattingOvers    || 0,
    autoBowlingOvers:   userCfg.autoBowlingOvers    || 0,
  };

  var matchData     = null;
  var socket        = null;
  var state         = 'BOOTING'; 
  var animQueue     = [];
  var isPlayingAnim = false;
  var pollTimer     = null;
  // Decision pending state — tracked separately, not in animQueue

  // ─── dispatch: postMessage to overlay template's own handler ─────────────────
  function dispatch(type, data, duration) {
    var payload = { type: type, data: data || {}, duration: duration || 0 };
    console.log('[Engine] DISPATCH:', type);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: payload, _engineSelf: true }, '*');
  }

  // ─── shared: directly call sharedHandleTrigger if available ──────────────────
  // This bypasses the overlay's own broken native handlers and goes straight to
  // the __shared-panel__ which always works.
  function shared(type, data, durationSec) {
    var dur = durationSec || 0;
    // Also dispatch so overlay's own scoreboard elements update
    dispatch(type, data, dur);
    // Call shared handler directly if available (loaded from overlay-handlers.js)
    if (typeof window.sharedHandleTrigger === 'function') {
      window.sharedHandleTrigger(type, data || {}, dur);
    }
  }

  // ─── processQueue ─────────────────────────────────────────────────────────────
  function processQueue() {
    if (isPlayingAnim || animQueue.length === 0) return;
    var nextAnim = animQueue.shift();
    isPlayingAnim = true;
    var dur = nextAnim.duration > 0 ? nextAnim.duration : 8;
    dispatch(nextAnim.type, nextAnim.data, dur);
    if (nextAnim.duration !== 0) {
      setTimeout(function() {
        dispatch('RESTORE', {});
        isPlayingAnim = false;
        if (typeof nextAnim.then === 'function') nextAnim.then();
        processQueue();
      }, dur * 1000);
    }
  }

  function queueAnimation(type, data, duration, then) {
    if (type === 'NEW_BOWLER' || type === 'BATSMAN_CHANGE' || type === 'WICKET_SWITCH') {
      var summaryIdx = animQueue.findIndex(function(a) { return a.type.indexOf('CARD') !== -1; });
      if (summaryIdx !== -1) {
        animQueue.splice(summaryIdx, 0, { type: type, data: data, duration: duration, then: then });
        if (!isPlayingAnim) processQueue();
        return;
      }
    }
    animQueue.push({ type: type, data: data, duration: duration, then: then });
    if (!isPlayingAnim) processQueue();
  }

  // ─── Inning intro sequencing ──────────────────────────────────────────────────
  // Uses setInterval polling so it works regardless of whether player data arrives
  // before or after the toss/target-card animation finishes.
  var _pendingInningIntro = false;
  var _introInterval = null;

  function _fireInningIntro(flat) {
    var d = flat || matchData || {};
    // Use shared() so it goes through sharedHandleTrigger → showPanel directly
    shared('START_INNINGS_INTRO', {
      striker:    d.strikerName    || '',
      nonStriker: d.nonStrikerName || '',
      bowler:     d.currentBowlerName || ''
    }, cfg.introDuration);
  }

  function _waitAndQueueInningIntro() {
    // Already waiting — don't start a second poll
    if (_pendingInningIntro) return;
    _pendingInningIntro = true;
    clearInterval(_introInterval);

    // Check immediately first
    var d = matchData || {};
    if (d.strikerName && d.currentBowlerName && !isPlayingAnim) {
      _pendingInningIntro = false;
      _fireInningIntro(d);
      return;
    }

    // Poll every 600ms until:
    // (a) player names available in matchData AND
    // (b) no animation currently playing
    _introInterval = setInterval(function() {
      var d2 = matchData || {};
      if (d2.strikerName && d2.currentBowlerName && !isPlayingAnim) {
        clearInterval(_introInterval);
        _pendingInningIntro = false;
        _fireInningIntro(d2);
      }
    }, 600);

    // Give up after 5 minutes
    setTimeout(function() {
      if (_pendingInningIntro) {
        clearInterval(_introInterval);
        _pendingInningIntro = false;
      }
    }, 300000);
  }

  // ─── Toss sequence ────────────────────────────────────────────────────────────
  function _doTossSequence(flat, matchObj) {
    var t1p = (matchObj.team1 && matchObj.team1.players) ? matchObj.team1.players : (flat.team1Players || []);
    var t2p = (matchObj.team2 && matchObj.team2.players) ? matchObj.team2.players : (flat.team2Players || []);
    var t1n = (matchObj.team1 && matchObj.team1.name) ? matchObj.team1.name
            : (flat.team1Name || matchObj.team1Name || 'Team 1');
    var t2n = (matchObj.team2 && matchObj.team2.name) ? matchObj.team2.name
            : (flat.team2Name || matchObj.team2Name || 'Team 2');
    var winnerName   = matchObj.tossWinnerName || flat.tossWinnerName || '';
    var tossDecision = matchObj.tossDecision   || flat.tossDecision   || '';

    state = 'TOSS';

    // Step 1: Show toss result
    shared('SHOW_TOSS', {
      text:          winnerName + ' WON THE TOSS',
      tossWinnerName: winnerName,
      tossDecision:   tossDecision,
      team1Name: t1n, team2Name: t2n,
      team1Players: t1p, team2Players: t2p
    }, cfg.tossDuration);

    // Step 2: After toss, show squads (if enabled), then inning intro
    setTimeout(function() {
      if (cfg.showSquads) {
        state = 'SQUADS';
        shared('SHOW_SQUADS', {
          team1Name: t1n, team2Name: t2n,
          team1Players: t1p, team2Players: t2p
        }, cfg.squadDuration);

        setTimeout(function() {
          state = 'LIVE';
          shared('RESTORE', {}, 0);
          // Step 3: Inning intro after squads
          if (cfg.showInningIntro) _waitAndQueueInningIntro();
        }, cfg.squadDuration * 1000);
      } else {
        state = 'LIVE';
        shared('RESTORE', {}, 0);
        // Step 3: Inning intro directly after toss
        if (cfg.showInningIntro) _waitAndQueueInningIntro();
      }
    }, cfg.tossDuration * 1000);
  }

  // ─── onData ───────────────────────────────────────────────────────────────────
  function onData(raw) {
    try {
      if (!raw) return;
      var flat = typeof window.normalizeScoreData === 'function'
        ? window.normalizeScoreData(raw) : raw;

      if (raw.battingSummary) flat.batsmen = raw.battingSummary;
      if (raw.bowlingSummary) flat.bowlers = raw.bowlingSummary;

      matchData = flat;

      // Push score to overlay template
      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw.match || raw, _engineSelf: true }, '*');
      if (flat.sponsors && flat.sponsors.length > 0) {
        window.postMessage({ type: 'UPDATE_SPONSORS', sponsors: flat.sponsors, _engineSelf: true }, '*');
      }
      if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);

      var matchObj   = raw.match || raw;
      var tossDone   = !!(matchObj.tossWinnerName || matchObj.tossDecision);
      var hasPlayers = !!(flat.strikerName);
      var isMatchDone = matchObj.status === 'completed' || matchObj.status === 'ended';

      if (state === 'BOOTING') {
        if (isMatchDone) { state = 'LIVE'; dispatch('RESTORE', {}); return; }
        if (!tossDone && cfg.showVS) {
          state = 'VS_SCREEN';
          var t1n2 = (matchObj.team1 && matchObj.team1.name) ? matchObj.team1.name : flat.team1Name;
          var t2n2 = (matchObj.team2 && matchObj.team2.name) ? matchObj.team2.name : flat.team2Name;
          shared('VS_SCREEN', { team1: t1n2, team2: t2n2 }, cfg.vsDuration);
          return;
        }
        if (tossDone && !hasPlayers && cfg.showToss) { _doTossSequence(flat, matchObj); return; }
        state = 'LIVE'; dispatch('RESTORE', {}); return;
      }

      if (state === 'VS_SCREEN') {
        if (tossDone) {
          if (cfg.showToss) { _doTossSequence(flat, matchObj); }
          else { state = 'LIVE'; dispatch('RESTORE', {}); }
        }
        return;
      }

      // Normal live scoring — check for auto-triggers from activeTrigger
      if (raw.activeTrigger && state === 'LIVE') {
        handleAutoTrigger(raw.activeTrigger, flat);
      }
    } catch (err) { console.error('[Engine] onData error:', err); }
  }

  // ─── handleAutoTrigger — for score-update-driven animations (FOUR, SIX, WICKET etc)
  // These go through the overlay's OWN handler (dispatch) since those animations
  // are designed in the overlay template (border flash, text pop etc).
  function handleAutoTrigger(trigger, flat) {
    var t    = trigger.type || trigger;
    var data = trigger.data || trigger.payload || {};
    var dur  = trigger.duration || 6;
    var richData = Object.assign({}, flat, data);

    switch (t) {
      case 'FOUR':          if (cfg.showFour)          queueAnimation('FOUR',          richData, cfg.fourDuration); break;
      case 'SIX':           if (cfg.showSix)           queueAnimation('SIX',           richData, cfg.sixDuration);  break;
      case 'WICKET':        if (cfg.showWicket)        queueAnimation('WICKET',        richData, cfg.wicketDuration); break;
      case 'WICKET_SWITCH': if (cfg.showWicket)        queueAnimation('WICKET_SWITCH', richData, cfg.wicketDuration); break;
      case 'BATSMAN_CHANGE':if (cfg.showPlayerChange)  queueAnimation('BATSMAN_CHANGE',richData, cfg.playerChangeDuration); break;
      case 'NEW_BOWLER':    if (cfg.showBowlerChange)  queueAnimation('NEW_BOWLER',    richData, cfg.bowlerChangeDuration); break;
      case 'OVER_COMPLETE':
        var over = data.overNumber || 0;
        var wantBat  = cfg.autoBattingOvers  > 0 && over % cfg.autoBattingOvers  === 0 && cfg.showBattingSummary;
        var wantBowl = cfg.autoBowlingOvers > 0 && over % cfg.autoBowlingOvers === 0 && cfg.showBowlingSummary;
        if (wantBat && wantBowl) queueAnimation('BOTH_CARDS', richData, cfg.summaryDuration);
        else if (wantBat)        queueAnimation('BATTING_CARD', richData, cfg.summaryDuration);
        else if (wantBowl)       queueAnimation('BOWLING_CARD', richData, cfg.summaryDuration);
        break;
      case 'INNINGS_BREAK':
        if (cfg.showTargetCard) {
          queueAnimation('INNINGS_BREAK', richData, cfg.targetCardDuration, function() {
            if (cfg.showInningIntro) _waitAndQueueInningIntro();
          });
        }
        break;
      case 'MATCH_END':
        if (cfg.showMatchEnd) _fireMatchEnd(richData, flat, data);
        break;
      default:
        dispatch(t, richData, dur);
        break;
    }
  }

  // ─── handleManualTrigger — single entry point for ALL manually fired triggers
  // Sources: socket manualOverlayTrigger, socket overlayTrigger, engine message listener
  // ALL types route through window.sharedHandleTrigger (in overlay-handlers.js).
  // engine.js does NOT render anything itself — it only enriches data from matchData.
  function handleManualTrigger(trigger) {
    var t    = trigger.type || trigger;
    var data = trigger.data || trigger.payload || {};
    var dur  = trigger.duration;
    var flat = matchData || {};

    console.log('[Engine] MANUAL:', t);

    // ── DECISION PENDING — show for 6000s (100 min). RESTORE kills it. ──────
    // No state tracking needed. Button ON fires this. Button OFF fires RESTORE.
    if (t === 'DECISION_PENDING') {
      if (typeof window.sharedHandleTrigger === 'function') {
        window.sharedHandleTrigger('DECISION_PENDING', {}, 6000);
      }
      return;
    }

    // ── RESTORE — clear queue, stop animation, hide everything ──────────────
    if (t === 'RESTORE') {
      isPlayingAnim = false;
      animQueue = [];
      if (typeof window.sharedHandleTrigger === 'function') {
        window.sharedHandleTrigger('RESTORE', {}, 0);
      }
      dispatch('RESTORE', {}, 0); // also tell overlay's native elements
      return;
    }

    // ── All panel animations — enrich data from matchData then show ──────────
    // Clear any queued animation so manual trigger shows immediately
    isPlayingAnim = false;
    animQueue = [];

    var enriched = Object.assign({}, flat, data);

    // For profile cards, pull live stats from matchData innings if not provided
    if (t === 'BATSMAN_PROFILE') {
      var bName = flat.strikerName || data.playerName || '';
      enriched = Object.assign({ playerName: bName, runs:0, balls:0, fours:0, sixes:0, sr:'0.0' },
        _getBatterStats(bName, flat), data);
      enriched.playerName = enriched.playerName || bName;
    }
    if (t === 'BOWLER_PROFILE') {
      var blName = flat.currentBowlerName || data.playerName || '';
      enriched = Object.assign({ playerName: blName, overs:'0.0', wickets:0, runs:0, economy:'0.00' },
        _getBowlerStats(blName, flat), data);
      enriched.playerName = enriched.playerName || blName;
    }
    if (t === 'START_INNINGS_INTRO') {
      enriched = {
        striker:    data.striker    || flat.strikerName        || '',
        nonStriker: data.nonStriker || flat.nonStrikerName     || '',
        bowler:     data.bowler     || flat.currentBowlerName  || ''
      };
    }

    var durSec = dur || _defaultDur(t);

    if (typeof window.sharedHandleTrigger === 'function') {
      window.sharedHandleTrigger(t, enriched, durSec);
    }

    // After INNINGS_BREAK panel closes, start waiting for inning intro
    if (t === 'INNINGS_BREAK' && cfg.showInningIntro) {
      setTimeout(function () { _waitAndQueueInningIntro(); }, durSec * 1000 + 400);
    }
  }

  function _defaultDur(type) {
    var map = {
      'BATSMAN_PROFILE': cfg.introDuration, 'BOWLER_PROFILE': cfg.introDuration,
      'START_INNINGS_INTRO': cfg.introDuration, 'INNINGS_BREAK': cfg.targetCardDuration,
      'BATTING_CARD': cfg.summaryDuration, 'BOWLING_CARD': cfg.summaryDuration,
      'BOTH_CARDS': cfg.summaryDuration, 'WICKET_SWITCH': cfg.wicketDuration,
      'BATSMAN_CHANGE': cfg.playerChangeDuration, 'NEW_BOWLER': cfg.bowlerChangeDuration,
      'MATCH_END': cfg.matchSummaryDuration
    };
    return map[type] || 8;
  }

  // Pull live batter stats from matchData innings
  function _getBatterStats(name, flat) {
    var innings = flat._innings || flat.innings || [];
    var currentInn = innings[flat.currentInnings - 1] || {};
    var batsmen = currentInn.batsmen || flat.batsmen || [];
    var b = batsmen.find(function(x) { return x.name === name; }) || {};
    return { runs: b.runs||0, balls: b.balls||0, fours: b.fours||0, sixes: b.sixes||0, sr: b.strikeRate||'0.0' };
  }

  // Pull live bowler stats from matchData innings
  function _getBowlerStats(name, flat) {
    var innings = flat._innings || flat.innings || [];
    var currentInn = innings[flat.currentInnings - 1] || {};
    var bowlers = currentInn.bowlers || flat.bowlers || [];
    var b = bowlers.find(function(x) { return x.name === name; }) || {};
    var balls = b.balls || 0;
    return { overs: Math.floor(balls/6)+'.'+balls%6, wickets: b.wickets||0, runs: b.runs||0, economy: b.economy||'0.00' };
  }

  function _fireMatchEnd(richData, flat, data) {
    var rawMatch = (data.match) || flat;
    var inn1 = (rawMatch.innings && rawMatch.innings[0]) || {};
    var inn2 = (rawMatch.innings && rawMatch.innings[1]) || {};
    var buildTeam = function(name, bats, bowls) {
      return {
        name: name || '',
        batsmen: (bats||[]).map(function(b) { return { name:b.name, runs:b.runs||0, balls:b.balls||0, fours:b.fours||0, sixes:b.sixes||0, sr:b.strikeRate||0, isOut:b.isOut||false }; }),
        bowlers: (bowls||[]).map(function(b) { return { name:b.name, overs:b.overs||(b.balls?(Math.floor(b.balls/6)+'.'+b.balls%6):'0.0'), maidens:b.maidens||0, runs:b.runs||0, wickets:b.wickets||0, economy:b.economy||0 }; })
      };
    };
    var matchEndData = Object.assign({}, richData, {
      winnerTeam: data.winnerTeam || richData.winnerTeam || flat.winnerName || '',
      winMargin:  data.winMargin  || richData.winMargin  || flat.resultSummary || '',
      team1: richData.team1 || buildTeam(inn1.teamName||flat.team1Name||'', inn1.batsmen||[], inn1.bowlers||[]),
      team2: richData.team2 || buildTeam(inn2.teamName||flat.team2Name||'', inn2.batsmen||[], inn2.bowlers||[])
    });
    if (typeof window.sharedHandleTrigger === 'function') window.sharedHandleTrigger('MATCH_END', matchEndData, cfg.matchSummaryDuration);
  }

  // ─── Socket + polling ─────────────────────────────────────────────────────────
  function fetchMatch(callback) {
    if (!matchId) return;
    fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(json) { var d = json.data || json; if (callback) callback(d); else onData(d); })
      .catch(function() {});
  }

  function startPolling() {
    if (!matchId || pollTimer) return;
    pollTimer = setInterval(function() {
      fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(json) { if (json) onData(json.data || json); })
        .catch(function() {});
    }, cfg.pollInterval);
  }

  function connectSocket() {
    if (typeof io === 'undefined') { startPolling(); return; }
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect', function() {
      if (matchId) { socket.emit('joinMatch', matchId); socket.emit('join_match', matchId); }
    });
    socket.on('scoreUpdate',          function(payload) { onData(payload); });
    socket.on('overlayTrigger',       function(trigger) { handleManualTrigger(trigger); });
    socket.on('inningsEnded',         function(payload) { onData(payload); });
    socket.on('matchEnded',           function(payload) { onData(payload); });
    // manualOverlayTrigger is what the server emits when LiveScoring fires fireTrigger()
    socket.on('manualOverlayTrigger', function(payload) {
      handleManualTrigger(payload.trigger || payload);
    });
  }

  window.addEventListener('message', function(e) {
    if (!e.data || e.data._engineSelf) return;
    if (e.data.type === 'UPDATE_SCORE' && e.data.data) { matchData = e.data.data; }
    if (e.data.type === 'OVERLAY_TRIGGER' && e.data.payload) {
      // Only handle non-manual triggers here (manual already handled by handleManualTrigger)
      var payload = e.data.payload;
      if (!payload.data || !payload.data.isManual) {
        handleAutoTrigger(payload, matchData || {});
      }
    }
  });

  function init() { fetchMatch(function(data) { onData(data); }); connectSocket(); startPolling(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
