/**
 * ScoreX Overlay Engine v10 — PERFECT BOOT & QUEUE SYNC
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
    showInningIntro:    userCfg.showInningIntro     !== false,
    showFour:           userCfg.showFour            !== false,
    showSix:            userCfg.showSix             !== false,
    showWicket:         userCfg.showWicket          !== false,
    showDecision:       userCfg.showDecision        !== false,
    showPlayerChange:   userCfg.showPlayerChange    !== false,
    showBowlerChange:   userCfg.showBowlerChange    !== false,
    showBattingSummary: userCfg.showBattingSummary  !== false,
    showBowlingSummary: userCfg.showBowlingSummary  !== false,
    showTargetCard:     userCfg.showTargetCard      !== false,
    showMatchEnd:       userCfg.showMatchEnd        !== false,
    autoBattingOvers:   userCfg.autoBattingOvers    || 0,
    autoBowlingOvers:   userCfg.autoBowlingOvers    || 0,
  };

  var matchData         = null;
  var socket            = null;
  var state             = 'BOOTING'; // CRITICAL: Restored Boot State
  
  var animQueue         = [];
  var isPlayingAnim     = false;
  var decisionPending   = false;
  var pollTimer         = null;

  function dispatch(type, data, duration) {
    var payload = { type: type, data: data || {}, duration: duration || 0 };
    console.log('[Engine] DISPATCH:', type);
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: payload, _engineSelf: true }, '*');
  }

  function processQueue() {
    if (isPlayingAnim || animQueue.length === 0) return;
    
    var nextAnim = animQueue.shift();
    isPlayingAnim = true;
    var dur = nextAnim.duration > 0 ? nextAnim.duration : 8;
    
    dispatch(nextAnim.type, nextAnim.data, dur);
    
    setTimeout(function() {
      dispatch('RESTORE', {});
      isPlayingAnim = false;
      if (nextAnim.then) nextAnim.then();
      processQueue(); 
    }, dur * 1000);
  }

  function queueAnimation(type, data, duration, then) {
    // PRIORITY FIX: Force Bowler & Player changes to play BEFORE the Summary Card
    if (type === 'BOWLER_CHANGE' || type === 'PLAYER_CHANGE') {
      var summaryIdx = animQueue.findIndex(function(a) { return a.type.indexOf('SUMMARY') !== -1; });
      if (summaryIdx !== -1) {
        animQueue.splice(summaryIdx, 0, { type: type, data: data, duration: duration, then: then });
        if (!isPlayingAnim) processQueue();
        return;
      }
    }
    
    animQueue.push({ type: type, data: data, duration: duration, then: then });
    if (!isPlayingAnim) processQueue();
  }

  function _doTossSequence(flat, matchObj) {
    state = 'TOSS';
    dispatch('SHOW_TOSS', {
      tossWinnerName: matchObj.tossWinnerName || flat.tossWinnerName || '',
      tossDecision: matchObj.tossDecision || flat.tossDecision || '',
      team1Name: flat.team1Name, team2Name: flat.team2Name,
    });
    setTimeout(function() {
      if (cfg.showSquads) {
        state = 'SQUADS';
        dispatch('SHOW_SQUADS', { team1Name: flat.team1Name, team2Name: flat.team2Name, team1Players: flat.team1Players, team2Players: flat.team2Players });
        setTimeout(function() { 
          state = 'LIVE'; dispatch('RESTORE', {}); 
          if (cfg.showInningIntro) queueAnimation('INNING_START', flat, cfg.introDuration);
        }, cfg.squadDuration * 1000);
      } else { 
        state = 'LIVE'; dispatch('RESTORE', {}); 
        if (cfg.showInningIntro) queueAnimation('INNING_START', flat, cfg.introDuration);
      }
    }, cfg.tossDuration * 1000);
  }

  function onData(raw) {
    try {
      if (!raw) return;
      var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(raw) : raw;
      
      // Inject rich arrays directly into flat map so HTML templates can find them
      if (raw.battingSummary) flat.batsmen = raw.battingSummary;
      if (raw.bowlingSummary) flat.bowlers = raw.bowlingSummary;

      matchData = flat;
      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw.match || raw, _engineSelf: true }, '*');
      if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);

      var matchObj    = raw.match || raw;
      var tossDone    = !!(matchObj.tossWinnerName || matchObj.tossDecision);
      var hasPlayers  = !!(flat.strikerName);
      var isMatchDone = matchObj.status === 'completed' || matchObj.status === 'ended';

      // CRITICAL: Restored Boot Logic for VS Screen and Toss
      if (state === 'BOOTING') {
        if (isMatchDone) { state = 'LIVE'; dispatch('RESTORE', {}); return; }
        if (!tossDone && cfg.showVS) {
          state = 'VS_SCREEN';
          dispatch('SHOW_VS_SCREEN', { team1Name: flat.team1Name, team2Name: flat.team2Name });
          return;
        }
        if (tossDone && !hasPlayers && cfg.showToss) { 
          _doTossSequence(flat, matchObj);
          return; 
        }
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

      // If we're fully booted and live, listen for triggers
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
    var richData = Object.assign({}, flat, data); // Ensure all required HTML tags exist

    switch (t) {
      case 'FOUR':             if (!cfg.showFour) return; queueAnimation('FOUR', richData, cfg.fourDuration); break;
      case 'SIX':              if (!cfg.showSix) return; queueAnimation('SIX', richData, cfg.sixDuration); break;
      case 'WICKET':           if (!cfg.showWicket) return; queueAnimation('WICKET', richData, cfg.wicketDuration); break;
      case 'RETIRED_PLAYER':   queueAnimation('PLAYER_CHANGE', richData, cfg.playerChangeDuration); break;
      
      case 'DECISION_PENDING': 
        if (!cfg.showDecision) return; 
        decisionPending = data.active; 
        if(decisionPending) { 
          isPlayingAnim = true; 
          dispatch('DECISION_PENDING', richData, 0); // 0 = Infinite Lock
        } else { 
          isPlayingAnim = false; 
          dispatch('RESTORE', {}); 
          processQueue(); // Unlock queue
        }
        break;

      case 'OVER_COMPLETE':
        var over = data.overNumber || 0;
        if (cfg.autoBattingOvers > 0 && over % cfg.autoBattingOvers === 0 && cfg.showBattingSummary) {
          queueAnimation('BATTING_SUMMARY', richData, cfg.summaryDuration);
        }
        if (cfg.autoBowlingOvers > 0 && over % cfg.autoBowlingOvers === 0 && cfg.showBowlingSummary) {
          queueAnimation('BOWLING_SUMMARY', richData, cfg.summaryDuration);
        }
        break;

      case 'PLAYER_CHANGE':    if (!cfg.showPlayerChange) return; queueAnimation('PLAYER_CHANGE', richData, cfg.playerChangeDuration); break;
      case 'BOWLER_CHANGE':    if (!cfg.showBowlerChange) return; queueAnimation('BOWLER_CHANGE', richData, cfg.bowlerChangeDuration); break;
      case 'BATTING_SUMMARY':  queueAnimation('BATTING_SUMMARY', richData, cfg.summaryDuration); break;
      case 'BOWLING_SUMMARY':  queueAnimation('BOWLING_SUMMARY', richData, cfg.summaryDuration); break;
      
      case 'BOTH_CARDS':
        queueAnimation('BATTING_SUMMARY', richData, cfg.summaryDuration, function() {
          queueAnimation('BOWLING_SUMMARY', richData, cfg.summaryDuration);
        });
        break;

      case 'BATSMAN_PROFILE':  queueAnimation('BATSMAN_PROFILE', richData, dur); break;
      case 'BOWLER_PROFILE':   queueAnimation('BOWLER_PROFILE', richData, dur); break;
      
      case 'SHOW_VS_SCREEN':   queueAnimation('SHOW_VS_SCREEN', richData, cfg.vsDuration); break;
      case 'SHOW_TOSS':        queueAnimation('SHOW_TOSS', richData, cfg.tossDuration); break;
      
      case 'TARGET_CARD':      
        if (!cfg.showTargetCard) return; 
        queueAnimation('TARGET_CARD', richData, cfg.targetCardDuration, function() {
          if (cfg.showInningIntro) queueAnimation('INNING_START', richData, cfg.introDuration); // Chained perfectly
        }); 
        break;

      case 'INNING_START':     queueAnimation('INNING_START', richData, cfg.introDuration); break;

      case 'MATCH_WIN':        
        if (!cfg.showMatchEnd) return;
        queueAnimation('MATCH_WIN', richData, cfg.matchSummaryDuration, function() {
          queueAnimation('MATCH_SUMMARY', richData, cfg.matchSummaryDuration);
        }); 
        break;

      case 'RESTORE':          
        decisionPending = false; isPlayingAnim = false; animQueue = []; dispatch('RESTORE', {}); 
        break;

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
          onData(data);
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