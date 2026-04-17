/**
 * ScoreX Overlay Engine v14 — UNCONDITIONAL MANUAL OVERRIDES
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
  var state             = 'BOOTING'; 
  
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
    
    // Duration 0 means lock indefinitely (e.g. Decision Pending)
    if (nextAnim.duration !== 0) {
      setTimeout(function() {
        dispatch('RESTORE', {});
        isPlayingAnim = false;
        if (nextAnim.then) nextAnim.then();
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

  // Called by _doTossSequence after toss/squad animations complete.
  // Waits for the first data update that has BOTH strikerName AND currentBowlerName
  // before queuing START_INNINGS_INTRO — avoids blank bowler name.
  var _pendingInningIntro = false;
  function _waitAndQueueInningIntro() {
    if (_pendingInningIntro) return; // already waiting
    var d = matchData || {};
    if (d.strikerName && d.currentBowlerName) {
      // Players already confirmed — queue now
      queueAnimation('START_INNINGS_INTRO', {
        striker:    d.strikerName,
        nonStriker: d.nonStrikerName || '',
        bowler:     d.currentBowlerName
      }, cfg.introDuration);
      return;
    }
    // Not yet — set flag so next onData call will queue it
    _pendingInningIntro = true;
  }


  function _doTossSequence(flat, matchObj) {
    var t1p = (matchObj.team1 && matchObj.team1.players) ? matchObj.team1.players : (flat.team1Players || []);
    var t2p = (matchObj.team2 && matchObj.team2.players) ? matchObj.team2.players : (flat.team2Players || []);
    var t1n = (matchObj.team1 && matchObj.team1.name) ? matchObj.team1.name : flat.team1Name;
    var t2n = (matchObj.team2 && matchObj.team2.name) ? matchObj.team2.name : flat.team2Name;

    state = 'TOSS';
    dispatch('SHOW_TOSS', { text: (matchObj.tossWinnerName || flat.tossWinnerName || '') + " WON TOSS", team1Players: t1p, team2Players: t2p });
    
    setTimeout(function() {
      if (cfg.showSquads) {
        state = 'SQUADS';
        dispatch('SHOW_SQUADS', { team1Name: t1n, team2Name: t2n, team1Players: t1p, team2Players: t2p });
        
        setTimeout(function() { 
          state = 'LIVE'; dispatch('RESTORE', {}); 
          if (cfg.showInningIntro) _waitAndQueueInningIntro();
        }, cfg.squadDuration * 1000);
      } else { 
        state = 'LIVE'; dispatch('RESTORE', {}); 
        if (cfg.showInningIntro) _waitAndQueueInningIntro();
      }
    }, cfg.tossDuration * 1000);
  }

  function onData(raw) {
    try {
      if (!raw) return;
      var flat = typeof window.normalizeScoreData === 'function' ? window.normalizeScoreData(raw) : raw;
      
      if (raw.battingSummary) flat.batsmen = raw.battingSummary;
      if (raw.bowlingSummary) flat.bowlers = raw.bowlingSummary;

      matchData = flat;
      window.postMessage({ type: 'UPDATE_SCORE', data: flat, raw: raw.match || raw, _engineSelf: true }, '*');
      // Push sponsors so the carousel in the template auto-populates
      if (flat.sponsors && flat.sponsors.length > 0) {
        window.postMessage({ type: 'UPDATE_SPONSORS', sponsors: flat.sponsors, _engineSelf: true }, '*');
      }
      if (typeof window.renderCurrentOver === 'function') window.renderCurrentOver(flat.thisOver || []);

      // If we're waiting for players to be confirmed after toss, check now
      if (_pendingInningIntro && flat.strikerName && flat.currentBowlerName) {
        _pendingInningIntro = false;
        queueAnimation('START_INNINGS_INTRO', {
          striker:    flat.strikerName,
          nonStriker: flat.nonStrikerName || '',
          bowler:     flat.currentBowlerName
        }, cfg.introDuration);
      }

      var matchObj    = raw.match || raw;
      var tossDone    = !!(matchObj.tossWinnerName || matchObj.tossDecision);
      var hasPlayers  = !!(flat.strikerName);
      var isMatchDone = matchObj.status === 'completed' || matchObj.status === 'ended';

      if (state === 'BOOTING') {
        if (isMatchDone) { state = 'LIVE'; dispatch('RESTORE', {}); return; }
        if (!tossDone && cfg.showVS) {
          state = 'VS_SCREEN';
          var t1n = (matchObj.team1 && matchObj.team1.name) ? matchObj.team1.name : flat.team1Name;
          var t2n = (matchObj.team2 && matchObj.team2.name) ? matchObj.team2.name : flat.team2Name;
          dispatch('VS_SCREEN', { team1: t1n, team2: t2n });
          return;
        }
        if (tossDone && !hasPlayers && cfg.showToss) { _doTossSequence(flat, matchObj); return; }
        state = 'LIVE'; dispatch('RESTORE', {}); return;
      }

      if (state === 'VS_SCREEN') {
        if (tossDone) { if (cfg.showToss) { _doTossSequence(flat, matchObj); } else { state = 'LIVE'; dispatch('RESTORE', {}); } }
        return;
      }

      if (raw.activeTrigger && state === 'LIVE') { handleTrigger(raw.activeTrigger, flat); }
    } catch (err) { console.error('[Engine] Error in onData:', err); }
  }

  function handleTrigger(trigger, flat) {
    var t    = trigger.type  || trigger;
    var data = trigger.data  || trigger.payload || {};
    var dur  = trigger.duration || 6;
    var richData = Object.assign({}, flat, data); 
    var isManual = richData.isManual === true; // CRITICAL: Bypasses config if true

    switch (t) {
      case 'FOUR':             if (!cfg.showFour && !isManual) return; queueAnimation('FOUR', richData, cfg.fourDuration); break;
      case 'SIX':              if (!cfg.showSix && !isManual) return; queueAnimation('SIX', richData, cfg.sixDuration); break;
      case 'WICKET':           if (!cfg.showWicket && !isManual) return; queueAnimation('WICKET', richData, cfg.wicketDuration); break;
      case 'WICKET_SWITCH':    if (!cfg.showWicket && !isManual) return; queueAnimation('WICKET_SWITCH', richData, cfg.wicketDuration); break;
      case 'BATSMAN_CHANGE':   if (!cfg.showPlayerChange && !isManual) return; queueAnimation('BATSMAN_CHANGE', richData, cfg.playerChangeDuration); break;
      case 'NEW_BOWLER':       if (!cfg.showBowlerChange && !isManual) return; queueAnimation('NEW_BOWLER', richData, cfg.bowlerChangeDuration); break;
      
      case 'BATTING_CARD':     queueAnimation('BATTING_CARD', richData, dur); break;
      case 'BOWLING_CARD':     queueAnimation('BOWLING_CARD', richData, dur); break;
      case 'BOTH_CARDS':       queueAnimation('BOTH_CARDS', richData, dur); break; 

      case 'OVER_COMPLETE':
        var over = data.overNumber || 0;
        var wantBat  = cfg.autoBattingOvers  > 0 && over % cfg.autoBattingOvers  === 0 && cfg.showBattingSummary;
        var wantBowl = cfg.autoBowlingOvers > 0 && over % cfg.autoBowlingOvers === 0 && cfg.showBowlingSummary;
        if (wantBat && wantBowl) {
          queueAnimation('BOTH_CARDS', richData, cfg.summaryDuration);
        } else if (wantBat) {
          queueAnimation('BATTING_CARD', richData, cfg.summaryDuration);
        } else if (wantBowl) {
          queueAnimation('BOWLING_CARD', richData, cfg.summaryDuration);
        }
        break;

      case 'DECISION_PENDING': 
        if (!cfg.showDecision && !isManual) return; 
        // Use explicit active flag if provided, otherwise toggle current state
        decisionPending = (typeof data.active !== 'undefined') ? !!data.active : !decisionPending;
        if (decisionPending) { 
          animQueue = []; isPlayingAnim = true; dispatch('DECISION_PENDING', richData, 0); // Indefinite lock
        } else { 
          isPlayingAnim = false; dispatch('RESTORE', {}); processQueue(); 
        }
        break;

      case 'BATSMAN_PROFILE':  queueAnimation('BATSMAN_PROFILE', richData, dur); break;
      case 'BOWLER_PROFILE':   queueAnimation('BOWLER_PROFILE', richData, dur); break;
      
      case 'VS_SCREEN':        queueAnimation('VS_SCREEN', richData, dur); break;
      case 'SHOW_TOSS':        queueAnimation('SHOW_TOSS', richData, dur); break;
      case 'SHOW_SQUADS':      queueAnimation('SHOW_SQUADS', richData, dur); break;

      case 'INNINGS_BREAK':      
        if (!cfg.showTargetCard && !isManual) return; 
        queueAnimation('INNINGS_BREAK', richData, cfg.targetCardDuration);
        // NOTE: Do NOT auto-queue START_INNINGS_INTRO here — players haven't been selected yet.
        // The inning intro will be triggered when the next innings actually starts via _doTossSequence
        // or manually once players are confirmed.
        break;

      case 'START_INNINGS_INTRO':
        // Ensure striker/nonStriker/bowler are populated from flat match data if not in trigger payload
        var introData = Object.assign(
          { striker: flat.strikerName || '', nonStriker: flat.nonStrikerName || '', bowler: flat.currentBowlerName || '' },
          richData
        );
        queueAnimation('START_INNINGS_INTRO', introData, dur); break;

      case 'MATCH_END':        
        if (!cfg.showMatchEnd && !isManual) return;
        // Build team1/team2 from innings data so template flip() has batsmen & bowlers
        (function() {
          // flat._raw is the original raw payload stored by overlay-utils; use it to get innings arrays
          var rawMatch = (data.match) || (flat._raw && (flat._raw.match || flat._raw)) || flat;
          var inn1 = (rawMatch.innings && rawMatch.innings[0]) || {};
          var inn2 = (rawMatch.innings && rawMatch.innings[1]) || {};
          // Also try overlay-utils pre-built arrays as fallback
          var inn1Bat  = inn1.batsmen  || flat.inn1Batting  || [];
          var inn1Bowl = inn1.bowlers  || flat.inn1Bowling  || [];
          var inn2Bat  = inn2.batsmen  || flat.inn2Batting  || [];
          var inn2Bowl = inn2.bowlers  || flat.inn2Bowling  || [];
          var buildTeam = function(name, bats, bowls) {
            return {
              name: name || '',
              batsmen: bats.map(function(b) {
                return { name: b.name, runs: b.runs||0, balls: b.balls||0, fours: b.fours||0, sixes: b.sixes||0, sr: b.strikeRate||b.sr||0, isOut: b.isOut||false };
              }),
              bowlers: bowls.map(function(b) {
                return { name: b.name, overs: b.overs || (b.balls ? (Math.floor(b.balls/6)+'.'+b.balls%6) : '0.0'), maidens: b.maidens||0, runs: b.runs||0, wickets: b.wickets||0, economy: b.economy||0 };
              })
            };
          };
          var t1Name = inn1.teamName || flat.inn1TeamName || flat.team1Name || '';
          var t2Name = inn2.teamName || flat.inn2TeamName || flat.team2Name || '';
          var matchEndData = Object.assign({}, richData, {
            // Map winnerName/resultSummary (from overlay-utils) to what the template reads
            winnerTeam: data.winnerTeam || richData.winnerTeam || flat.winnerName || '',
            winMargin:  data.winMargin  || richData.winMargin  || flat.resultSummary || '',
            team1: richData.team1 || buildTeam(t1Name, inn1Bat, inn1Bowl),
            team2: richData.team2 || buildTeam(t2Name, inn2Bat, inn2Bowl)
          });
          queueAnimation('MATCH_END', matchEndData, cfg.matchSummaryDuration);
        })();
        break;

      case 'RESTORE':          
        _pendingInningIntro = false;
        decisionPending = false; isPlayingAnim = false; animQueue = []; dispatch('RESTORE', {}); break;

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
    if (e.data.type === 'UPDATE_SPONSORS' && e.data.sponsors) {
      // Relay to template's own listener
      window.postMessage({ type: 'UPDATE_SPONSORS', sponsors: e.data.sponsors, _engineSelf: true }, '*');
    }
    if (e.data.type === 'OVERLAY_TRIGGER' && e.data.payload) { handleTrigger(e.data.payload, matchData || {}); }
  });

  function init() { fetchMatch(function(data) { onData(data); }); connectSocket(); startPolling(); }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();