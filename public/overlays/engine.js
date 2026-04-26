/**
 * ScoreX Overlay Engine v16 — CLEAN REWRITE
 *
 * KEY DESIGN:
 * 1. _safeShared() queues all calls to sharedHandleTrigger until overlay-handlers.js is ready
 * 2. Manual triggers (DECISION_PENDING, BATSMAN_PROFILE, BOWLER_PROFILE) have their own path
 *    and never go through handleAutoTrigger
 * 3. scoreUpdate with activeTrigger only fires handleAutoTrigger for score-driven animations
 * 4. No postMessage used for trigger routing — all triggers go direct to sharedHandleTrigger
 * 5. Legacy socket events supported for backward compat
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

  // Types that must ONLY go through handleManualTrigger, never handleAutoTrigger
  var MANUAL_ONLY = {
    DECISION_PENDING: true,
    BATSMAN_PROFILE:  true,
    BOWLER_PROFILE:   true,
    SHOW_TOSS:        true,
    SHOW_SQUADS:      true,
    VS_SCREEN:        true,
  };

  var matchData     = null;
  var socket        = null;
  var engineState   = 'BOOTING';
  var animQueue     = [];
  var isPlayingAnim = false;
  var pollTimer     = null;

  // ─── _safeShared ──────────────────────────────────────────────────────────────
  // Queue-and-retry wrapper around window.sharedHandleTrigger.
  // Guarantees delivery even if overlay-handlers.js loads after a trigger fires.
  var _pendingShared = [];
  var _sharedTimer   = null;

  function _safeShared(type, data, durSec) {
    if (typeof window.sharedHandleTrigger === 'function') {
      window.sharedHandleTrigger(type, data || {}, durSec != null ? durSec : 0);
      return;
    }
    _pendingShared.push([type, data || {}, durSec != null ? durSec : 0]);
    if (_sharedTimer) return;
    _sharedTimer = setInterval(function () {
      if (typeof window.sharedHandleTrigger !== 'function') return;
      clearInterval(_sharedTimer); _sharedTimer = null;
      var q = _pendingShared.splice(0);
      q.forEach(function (args) { window.sharedHandleTrigger(args[0], args[1], args[2]); });
    }, 50);
    setTimeout(function () {
      if (!_sharedTimer) return;
      clearInterval(_sharedTimer); _sharedTimer = null; _pendingShared = [];
      console.error('[Engine] FATAL: overlay-handlers.js never loaded. Animations disabled.');
    }, 10000);
  }

  // ─── Score push ───────────────────────────────────────────────────────────────
  function _postScore(flat, raw) {
    window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw || flat, _engineSelf: true }, '*');
    if (flat.sponsors && flat.sponsors.length) {
      window.postMessage({ type: 'UPDATE_SPONSORS', sponsors: flat.sponsors, _engineSelf: true }, '*');
    }
    if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);
  }

  // ─── Animation queue ──────────────────────────────────────────────────────────
  function processQueue() {
    if (isPlayingAnim || !animQueue.length) return;
    var item = animQueue.shift();
    isPlayingAnim = true;
    var durMs = (item.duration > 0 ? item.duration : 8) * 1000;
    _safeShared(item.type, item.data, item.duration > 0 ? item.duration : 8);
    if (item.duration !== 0) {
      setTimeout(function () {
        isPlayingAnim = false;
        if (typeof item.then === 'function') item.then();
        processQueue();
      }, durMs);
    }
  }

  function queueAnimation(type, data, duration, then) {
    if (type === 'NEW_BOWLER' || type === 'BATSMAN_CHANGE' || type === 'WICKET_SWITCH') {
      var idx = animQueue.findIndex(function (a) {
        return a.type === 'BATTING_CARD' || a.type === 'BOWLING_CARD' || a.type === 'BOTH_CARDS';
      });
      if (idx !== -1) {
        animQueue.splice(idx, 0, { type: type, data: data, duration: duration, then: then });
        if (!isPlayingAnim) processQueue();
        return;
      }
    }
    animQueue.push({ type: type, data: data, duration: duration, then: then });
    if (!isPlayingAnim) processQueue();
  }

  // ─── Inning intro ─────────────────────────────────────────────────────────────
  var _introPending  = false;
  var _introInterval = null;

  function _fireInningIntro(flat) {
    _safeShared('START_INNINGS_INTRO', {
      striker:    flat.strikerName   || '',
      nonStriker: flat.nonStrikerName || '',
      bowler:     flat.currentBowlerName || flat.bowlerName || '',
    }, cfg.introDuration);
  }

  function _waitForInningIntro() {
    if (_introPending) return;
    _introPending = true;
    clearInterval(_introInterval);
    var d = matchData || {};
    if (d.strikerName && (d.currentBowlerName || d.bowlerName) && !isPlayingAnim) {
      _introPending = false; _fireInningIntro(d); return;
    }
    _introInterval = setInterval(function () {
      var d2 = matchData || {};
      if (d2.strikerName && (d2.currentBowlerName || d2.bowlerName) && !isPlayingAnim) {
        clearInterval(_introInterval); _introPending = false; _fireInningIntro(d2);
      }
    }, 600);
    setTimeout(function () { if (_introPending) { clearInterval(_introInterval); _introPending = false; } }, 300000);
  }

  // ─── Toss sequence ────────────────────────────────────────────────────────────
  function _doTossSequence(flat, matchObj) {
    var t1n = (matchObj.team1 && matchObj.team1.name) || flat.team1Name || 'Team 1';
    var t2n = (matchObj.team2 && matchObj.team2.name) || flat.team2Name || 'Team 2';
    var t1p = (matchObj.team1 && matchObj.team1.players) || flat.team1Players || [];
    var t2p = (matchObj.team2 && matchObj.team2.players) || flat.team2Players || [];
    var winner = matchObj.tossWinnerName || flat.tossWinnerName || '';
    var decision = matchObj.tossDecision || flat.tossDecision || '';
    engineState = 'TOSS';
    _safeShared('SHOW_TOSS', {
      text: winner + ' WON THE TOSS', tossWinnerName: winner, tossDecision: decision,
      team1Name: t1n, team2Name: t2n, team1Players: t1p, team2Players: t2p,
    }, cfg.tossDuration);
    setTimeout(function () {
      if (cfg.showSquads) {
        engineState = 'SQUADS';
        _safeShared('SHOW_SQUADS', { team1Name: t1n, team2Name: t2n, team1Players: t1p, team2Players: t2p }, cfg.squadDuration);
        setTimeout(function () {
          engineState = 'LIVE'; _safeShared('RESTORE', {}, 0);
          if (cfg.showInningIntro) _waitForInningIntro();
        }, cfg.squadDuration * 1000);
      } else {
        engineState = 'LIVE'; _safeShared('RESTORE', {}, 0);
        if (cfg.showInningIntro) _waitForInningIntro();
      }
    }, cfg.tossDuration * 1000);
  }

  // ─── onData ───────────────────────────────────────────────────────────────────
  function onData(raw) {
    try {
      if (!raw) return;
      var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(raw) : raw;
      if (raw.battingSummary) flat.batsmen = raw.battingSummary;
      if (raw.bowlingSummary) flat.bowlers = raw.bowlingSummary;
      matchData = flat;
      _postScore(flat, raw.match || raw);

      var matchObj    = raw.match || raw;
      var tossDone    = !!(matchObj.tossWinnerName || matchObj.tossDecision);
      var hasPlayers  = !!(flat.strikerName);
      var isMatchDone = matchObj.status === 'completed' || matchObj.status === 'ended';

      if (engineState === 'BOOTING') {
        if (isMatchDone) { engineState = 'LIVE'; return; }
        if (!tossDone && cfg.showVS) {
          engineState = 'VS_SCREEN';
          _safeShared('VS_SCREEN', {
            team1: (matchObj.team1 && matchObj.team1.name) || flat.team1Name,
            team2: (matchObj.team2 && matchObj.team2.name) || flat.team2Name,
          }, cfg.vsDuration);
          return;
        }
        if (tossDone && !hasPlayers && cfg.showToss) { _doTossSequence(flat, matchObj); return; }
        engineState = 'LIVE'; return;
      }

      if (engineState === 'VS_SCREEN') {
        if (tossDone) {
          if (cfg.showToss) _doTossSequence(flat, matchObj);
          else { engineState = 'LIVE'; _safeShared('RESTORE', {}, 0); }
        }
        return;
      }

      // Only process activeTrigger in LIVE state, and only non-manual types
      if (raw.activeTrigger && engineState === 'LIVE') {
        var trig = raw.activeTrigger;
        var trigType = trig.type || trig;
        var isManualData = trig.data && trig.data.isManual;
        if (!MANUAL_ONLY[trigType] && !isManualData) {
          handleAutoTrigger(trig, flat);
        }
      }
    } catch (err) { console.error('[Engine] onData error:', err); }
  }

  // ─── handleAutoTrigger ────────────────────────────────────────────────────────
  function handleAutoTrigger(trigger, flat) {
    var t    = trigger.type || trigger;
    var data = trigger.data || trigger.payload || {};
    var rich = Object.assign({}, flat, data);
    switch (t) {
      case 'FOUR':          if (cfg.showFour)          queueAnimation('FOUR',          rich, cfg.fourDuration);          break;
      case 'SIX':           if (cfg.showSix)           queueAnimation('SIX',           rich, cfg.sixDuration);           break;
      case 'WICKET':        if (cfg.showWicket)        queueAnimation('WICKET',        rich, cfg.wicketDuration);        break;
      case 'WICKET_SWITCH': if (cfg.showWicket)        queueAnimation('WICKET_SWITCH', rich, cfg.wicketDuration);        break;
      case 'BATSMAN_CHANGE':if (cfg.showPlayerChange)  queueAnimation('BATSMAN_CHANGE',rich, cfg.playerChangeDuration);  break;
      case 'NEW_BOWLER':    if (cfg.showBowlerChange)  queueAnimation('NEW_BOWLER',    rich, cfg.bowlerChangeDuration);  break;
      case 'OVER_COMPLETE': {
        var over = data.overNumber || 0;
        var wB = cfg.autoBattingOvers  > 0 && over % cfg.autoBattingOvers  === 0 && cfg.showBattingSummary;
        var wW = cfg.autoBowlingOvers  > 0 && over % cfg.autoBowlingOvers  === 0 && cfg.showBowlingSummary;
        if (wB && wW) queueAnimation('BOTH_CARDS',   rich, cfg.summaryDuration);
        else if (wB)  queueAnimation('BATTING_CARD', rich, cfg.summaryDuration);
        else if (wW)  queueAnimation('BOWLING_CARD', rich, cfg.summaryDuration);
        break;
      }
      case 'INNINGS_BREAK':
        if (cfg.showTargetCard) {
          queueAnimation('INNINGS_BREAK', rich, cfg.targetCardDuration, function () {
            if (cfg.showInningIntro) _waitForInningIntro();
          });
        }
        break;
      case 'MATCH_END':
        if (cfg.showMatchEnd) _fireMatchEnd(rich, flat, data);
        break;
      default:
        window.postMessage({ type: 'OVERLAY_TRIGGER', payload: { type: t, data: rich, duration: trigger.duration || 0 }, _engineSelf: true }, '*');
        break;
    }
  }

  // ─── handleManualTrigger ──────────────────────────────────────────────────────
  function handleManualTrigger(trigger) {
    var t    = trigger.type || trigger;
    var data = trigger.data || trigger.payload || {};
    var dur  = trigger.duration;
    var flat = matchData || {};

    if (t === 'RESTORE') {
      animQueue = []; isPlayingAnim = false;
      _introPending = false; clearInterval(_introInterval);
      _safeShared('RESTORE', {}, 0);
      window.postMessage({ type: 'OVERLAY_TRIGGER', payload: { type: 'RESTORE', data: {}, duration: 0 }, _engineSelf: true }, '*');
      return;
    }

    if (t === 'DECISION_PENDING') {
      _safeShared('DECISION_PENDING', {}, 6000);
      return;
    }

    var enriched = Object.assign({}, flat, data);

    if (t === 'BATSMAN_PROFILE') {
      var bName = data.playerName || flat.strikerName || '';
      enriched = Object.assign({ playerName: bName, runs: 0, balls: 0, fours: 0, sixes: 0, sr: '0.0' },
        _getBatterStats(bName, flat), data);
      if (!enriched.playerName) enriched.playerName = bName;
    }

    if (t === 'BOWLER_PROFILE') {
      var blName = data.playerName || flat.currentBowlerName || flat.bowlerName || '';
      enriched = Object.assign({ playerName: blName, overs: '0.0', wickets: 0, runs: 0, economy: '0.00' },
        _getBowlerStats(blName, flat), data);
      if (!enriched.playerName) enriched.playerName = blName;
    }

    if (t === 'START_INNINGS_INTRO') {
      enriched = {
        striker:    data.striker    || flat.strikerName        || '',
        nonStriker: data.nonStriker || flat.nonStrikerName     || '',
        bowler:     data.bowler     || flat.currentBowlerName  || flat.bowlerName || '',
      };
    }

    var durSec = (dur !== undefined && dur !== null) ? dur : _defaultDur(t);
    _safeShared(t, enriched, durSec);

    if (t === 'INNINGS_BREAK' && cfg.showInningIntro) {
      setTimeout(function () { _waitForInningIntro(); }, durSec * 1000 + 400);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function _defaultDur(type) {
    return ({ BATSMAN_PROFILE: cfg.introDuration, BOWLER_PROFILE: cfg.introDuration,
              START_INNINGS_INTRO: cfg.introDuration, INNINGS_BREAK: cfg.targetCardDuration,
              BATTING_CARD: cfg.summaryDuration, BOWLING_CARD: cfg.summaryDuration,
              BOTH_CARDS: cfg.summaryDuration, WICKET_SWITCH: cfg.wicketDuration,
              BATSMAN_CHANGE: cfg.playerChangeDuration, NEW_BOWLER: cfg.bowlerChangeDuration,
              MATCH_END: cfg.matchSummaryDuration, SHOW_TOSS: cfg.tossDuration,
              SHOW_SQUADS: cfg.squadDuration, VS_SCREEN: cfg.vsDuration })[type] || 8;
  }

  function _getBatterStats(name, flat) {
    var arr = flat.battingSummary || flat.batsmen || [];
    var b = arr.find(function (x) { return x.name === name; }) || {};
    return { runs: b.runs||0, balls: b.balls||0, fours: b.fours||0, sixes: b.sixes||0,
             sr: b.strikeRate || (b.balls > 0 ? ((b.runs/b.balls)*100).toFixed(1) : '0.0') };
  }

  function _getBowlerStats(name, flat) {
    var arr = flat.bowlingSummary || flat.bowlers || [];
    var b = arr.find(function (x) { return x.name === name; }) || {};
    var bl = b.balls || 0;
    return { overs: b.overs || (Math.floor(bl/6)+'.'+bl%6), wickets: b.wickets||0, runs: b.runs||0,
             economy: b.economy || (bl > 0 ? ((b.runs/bl)*6).toFixed(2) : '0.00') };
  }

  function _fireMatchEnd(rich, flat, data) {
    var rawM = data.match || flat;
    var inn1 = (rawM.innings && rawM.innings[0]) || {};
    var inn2 = (rawM.innings && rawM.innings[1]) || {};
    function bt(name, bats, bowls) {
      return { name: name||'', batsmen: (bats||[]).map(function(b){ return {name:b.name,runs:b.runs||0,balls:b.balls||0,fours:b.fours||0,sixes:b.sixes||0,sr:b.strikeRate||0,isOut:b.isOut||false}; }),
        bowlers: (bowls||[]).map(function(b){ var bl=b.balls||0; return {name:b.name,overs:b.overs||(Math.floor(bl/6)+'.'+bl%6),maidens:b.maidens||0,runs:b.runs||0,wickets:b.wickets||0,economy:b.economy||0}; }) };
    }
    _safeShared('MATCH_END', Object.assign({}, rich, {
      winnerTeam: data.winnerTeam||rich.winnerTeam||flat.winnerName||'',
      winMargin:  data.winMargin||rich.winMargin||flat.resultSummary||'',
      team1: rich.team1 || bt(inn1.teamName||flat.team1Name||'', inn1.batsmen||[], inn1.bowlers||[]),
      team2: rich.team2 || bt(inn2.teamName||flat.team2Name||'', inn2.batsmen||[], inn2.bowlers||[]),
    }), cfg.matchSummaryDuration);
  }

  // ─── Socket ───────────────────────────────────────────────────────────────────
  // De-dup guard: tracks last trigger stamp to avoid double-firing from legacy
  // triple-emit (server sends scoreUpdate + overlayTrigger + manualOverlayTrigger)
  var _lastTrigStamp = '';
  function _dedupManual(trig) {
    var stamp = (trig.type||'') + '|' + (trig._ts||Date.now());
    if (stamp === _lastTrigStamp) return;
    _lastTrigStamp = stamp;
    handleManualTrigger(trig);
  }

  function connectSocket() {
    if (typeof io === 'undefined') { startPolling(); return; }
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect', function () {
      if (matchId) { socket.emit('joinMatch', matchId); socket.emit('join_match', matchId); }
    });
    socket.on('scoreUpdate',          function (p) { onData(p); });
    socket.on('inningsEnded',         function (p) { onData(p); });
    socket.on('matchEnded',           function (p) { onData(p); });
    // New clean event (server update required)
    socket.on('overlayManual',        function (t) { _dedupManual(t); });
    // Legacy events — kept for backward compat
    socket.on('overlayTrigger',       function (t) { _dedupManual(t); });
    socket.on('manualOverlayTrigger', function (p) { _dedupManual(p.trigger || p); });
  }

  // ─── Polling ──────────────────────────────────────────────────────────────────
  function fetchMatch(cb) {
    if (!matchId) return;
    fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { var d = j.data||j; if (cb) cb(d); else onData(d); })
      .catch(function () {});
  }

  function startPolling() {
    if (!matchId || pollTimer) return;
    pollTimer = setInterval(function () {
      fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) { if (j) onData(j.data||j); })
        .catch(function () {});
    }, cfg.pollInterval);
  }

  // ─── postMessage listener ────────────────────────────────────────────────────
  window.addEventListener('message', function (e) {
    if (!e.data || e.data._engineSelf) return;
    if (e.data.type === 'UPDATE_SCORE' && e.data.data) { matchData = e.data.data; return; }
    if (e.data.type === 'OVERLAY_TRIGGER' && e.data.payload) {
      var p = e.data.payload;
      var t = p.type;
      if (MANUAL_ONLY[t] || (p.data && p.data.isManual)) {
        handleManualTrigger({ type: t, data: p.data||{}, duration: p.duration });
      } else {
        handleAutoTrigger(p, matchData || {});
      }
    }
  });

  // ─── Init ─────────────────────────────────────────────────────────────────────
  function init() { fetchMatch(function (d) { onData(d); }); connectSocket(); startPolling(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }

})();
