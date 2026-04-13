/**
 * ScoreX Overlay Engine v6.2 — STRICT QUEUE SYSTEM
 */
(function () {
  'use strict';

  var config      = window.OVERLAY_CONFIG || {};
  var urlParams   = new URLSearchParams(window.location.search);
  var matchId     = urlParams.get('matchId') || config.matchId;
  var apiBaseUrl  = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  var socketUrl   = apiBaseUrl.replace('/api/v1', '');

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
    summaryDuration:      globalCfg.summaryDuration       || 12,
    pollInterval:         globalCfg.pollInterval          || 5000,

    showVS:             globalCfg.showVS             !== false,
    showToss:           globalCfg.showToss            !== false,
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

  var matchData         = null;
  var socket            = null;
  var state             = 'BOOTING';
  
  // Strict Animation Queue
  var animQueue         = [];
  var isPlayingAnim     = false;

  var matchEndFired     = false;
  var decisionPending   = false;
  var pollTimer         = null;
  var lastPollSig       = null;

  function dispatch(type, data, duration) {
    var payload = { type: type, data: data || {}, duration: duration || 0 };
    console.log('[Engine] DISPATCH:', type);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: payload, _engineSelf: true }, '*');
  }

  function processQueue() {
    if (isPlayingAnim || animQueue.length === 0) return;
    
    var nextAnim = animQueue.shift();
    isPlayingAnim = true;
    
    dispatch(nextAnim.type, nextAnim.data, nextAnim.duration);
    
    setTimeout(function() {
      dispatch('RESTORE', {});
      isPlayingAnim = false;
      if (nextAnim.then) nextAnim.then();
      processQueue(); 
    }, nextAnim.duration * 1000);
  }

  function queueAnimation(type, data, duration, then) {
    animQueue.push({ type: type, data: data, duration: duration, then: then });
    processQueue();
  }

  function onData(raw) {
    try {
      if (!raw) return;
      var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(raw) : raw;
      matchData = flat;
      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw.match || raw, _engineSelf: true }, '*');
      if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);

      if (raw.activeTrigger && state === 'LIVE') {
        handleTrigger(raw.activeTrigger, flat);
      }
    } catch (err) {
      console.error('[Engine] Error in onData:', err);
    }
  }

  function handleTrigger(trigger, flat) {
    var t    = trigger.type  || trigger;
    var data = trigger.data  || trigger.payload || {};
    var dur  = trigger.duration || 6;
    var richData = Object.assign({}, flat, data);

    // Completely mapped sequential routing
    switch (t) {
      case 'FOUR':             if (!cfg.showFour)          return; queueAnimation('FOUR', richData, dur); break;
      case 'SIX':              if (!cfg.showSix)           return; queueAnimation('SIX', richData, dur); break;
      case 'WICKET':           if (!cfg.showWicket)        return; queueAnimation('WICKET', richData, dur); break;
      case 'RETIRED_PLAYER':   queueAnimation('RETIRED', richData, dur); break;
      case 'DECISION_PENDING': 
        if (!cfg.showDecision) return; 
        decisionPending = data.active; 
        if(decisionPending) { isPlayingAnim = true; dispatch('DECISION_PENDING', richData, 0); }
        else { dispatch('RESTORE', {}); isPlayingAnim = false; processQueue(); }
        break;
      case 'PLAYER_CHANGE':    if (!cfg.showPlayerChange)  return; queueAnimation('PLAYER_CHANGE', richData, dur); break;
      case 'BOWLER_CHANGE':    if (!cfg.showBowlerChange)  return; queueAnimation('BOWLER_CHANGE', richData, dur); break;
      case 'BATTING_SUMMARY':  if (!cfg.showBattingSummary) return; queueAnimation('BATTING_SUMMARY', richData, cfg.summaryDuration); break;
      case 'BOWLING_SUMMARY':  if (!cfg.showBowlingSummary) return; queueAnimation('BOWLING_SUMMARY', richData, cfg.summaryDuration); break;
      case 'BOTH_CARDS':
        queueAnimation('BATTING_SUMMARY', richData, cfg.summaryDuration, function() {
          queueAnimation('BOWLING_SUMMARY', richData, cfg.summaryDuration);
        });
        break;
      case 'BATSMAN_PROFILE':  queueAnimation('BATSMAN_PROFILE', richData, dur); break;
      case 'BOWLER_PROFILE':   queueAnimation('BOWLER_PROFILE', richData, dur); break;
      case 'TARGET_CARD':      if (!cfg.showTargetCard) return; queueAnimation('TARGET_CARD', richData, cfg.targetCardDuration); break;
      case 'INNING_START':     queueAnimation('INNING_START', richData, cfg.introDuration); break;
      case 'SHOW_VS_SCREEN':   queueAnimation('VS_SCREEN', richData, cfg.vsDuration); break;
      case 'SHOW_TOSS':        queueAnimation('TOSS', richData, cfg.tossDuration); break;
      case 'MATCH_WIN':        queueAnimation('MATCH_WIN', richData, cfg.matchSummaryDuration); break;
      case 'MATCH_SUMMARY':    queueAnimation('MATCH_SUMMARY', richData, cfg.matchSummaryDuration); break;
      case 'RESTORE':          decisionPending = false; isPlayingAnim = false; dispatch('RESTORE', {}); processQueue(); break;
      default:                 dispatch(t, richData, dur);
    }
  }

  function fetchMatch(callback) {
    if (!matchId) return;
    fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function(r) { return r.json(); })
      .then(function(json) { var d = json.data || json; if (callback) callback(d); else onData(d); })
      .catch(function(err) {});
  }

  function startPolling() {
    if (!matchId || pollTimer) return;
    pollTimer = setInterval(function() {
      fetch(apiBaseUrl + '/matches/' + matchId, { headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(function(r) { return r.ok ? r.json() : null; })
        .then(function(json) {
          if (!json) return;
          var data = json.data || json;
          var matchObj = data.match || data;
          var sig = JSON.stringify({ st: matchObj.status, s: matchObj.innings ? matchObj.innings.map(function(i) { return i.score + '/' + i.wickets + ':' + i.balls; }) : [] });
          if (sig !== lastPollSig) { lastPollSig = sig; onData(data); }
        })
        .catch(function() {});
    }, cfg.pollInterval);
  }

  function connectSocket() {
    if (typeof io === 'undefined') { startPolling(); return; }
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('connect', function() { if (matchId) { socket.emit('joinMatch', matchId); socket.emit('join_match', matchId); }});
    socket.on('scoreUpdate', function(payload) { onData(payload); });
    socket.on('overlayTrigger', function(trigger) { handleTrigger(trigger, matchData || {}); });
    socket.on('inningsEnded', function(payload) { onData(payload); });
    socket.on('matchEnded', function(payload) { onData(payload); });
    socket.on('manualOverlayTrigger', function(payload) { handleTrigger(payload.trigger || payload, matchData || {}); });
  }

  window.addEventListener('message', function(e) {
    if (!e.data || e.data._engineSelf) return;
    if (e.data.type === 'UPDATE_SCORE' && e.data.data) { matchData = e.data.data; }
    if (e.data.type === 'OVERLAY_TRIGGER' && e.data.payload) { handleTrigger(e.data.payload, matchData || {}); }
  });

  function init() { fetchMatch(function(data) { onData(data); }); connectSocket(); startPolling(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();