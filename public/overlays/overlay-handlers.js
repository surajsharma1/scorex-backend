/**
 * ScoreX Overlay Handlers v3 — CLEAN REWRITE
 *
 * This file:
 * 1. Defines window.sharedHandleTrigger — called directly by engine.js
 * 2. Creates and manages the shared panel DOM element (#__sp__)
 * 3. Handles: DECISION_PENDING, BATSMAN_PROFILE, BOWLER_PROFILE,
 *    START_INNINGS_INTRO, INNINGS_BREAK, WICKET_SWITCH, BATSMAN_CHANGE,
 *    NEW_BOWLER, BATTING_CARD, BOWLING_CARD, BOTH_CARDS, MATCH_END, RESTORE
 *
 * IMPORTANT: engine.js must load AFTER this file so that sharedHandleTrigger
 * is defined before engine starts. If engine loads first, _safeShared() in
 * engine.js will queue calls until this file sets window.sharedHandleTrigger.
 */
(function () {
  'use strict';

  var PANEL_ID    = '__sp__';
  var STYLE_ID    = '__sp_style__';
  var _panelTimer = null;
  var _panel      = null;

  // ─── Panel DOM ────────────────────────────────────────────────────────────────
  function _ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = [
      '#' + PANEL_ID + '{',
        'position:fixed;inset:0;z-index:99999;',
        'display:none;align-items:center;justify-content:center;',
        'background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);',
        '-webkit-backdrop-filter:blur(8px);',
      '}',
      '#' + PANEL_ID + '.sp-in{',
        'display:flex !important;',
        'animation:__spIn .35s cubic-bezier(.22,.61,.36,1) forwards;',
      '}',
      '#' + PANEL_ID + '.sp-out{',
        'display:flex !important;',
        'animation:__spOut .3s ease forwards;',
      '}',
      '@keyframes __spIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}',
      '@keyframes __spOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(1.06)}}',
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function _ensurePanel() {
    if (_panel && document.body.contains(_panel)) return _panel;
    _ensureStyles();
    var existing = document.getElementById(PANEL_ID);
    if (existing) { _panel = existing; return _panel; }
    _panel = document.createElement('div');
    _panel.id = PANEL_ID;
    document.body.appendChild(_panel);
    return _panel;
  }

  function showPanel(html, durationMs) {
    var panel = _ensurePanel();
    clearTimeout(_panelTimer);

    // Remove animation classes and reset
    panel.className = '';
    panel.innerHTML = html;

    // Force reflow so animation always restarts cleanly
    void panel.offsetHeight;

    panel.className = 'sp-in';

    if (durationMs > 0) {
      _panelTimer = setTimeout(function () { hidePanel(); }, durationMs);
    }
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (!panel) return;
    clearTimeout(_panelTimer);
    _panelTimer = null;

    // Check if panel is actually visible (class sp-in means it's showing)
    if (!panel.className || panel.className === '' || panel.className === 'sp-out') {
      // Already hidden or hiding
      panel.className = '';
      panel.innerHTML = '';
      return;
    }

    panel.className = 'sp-out';
    setTimeout(function () {
      var p = document.getElementById(PANEL_ID);
      if (p) { p.className = ''; p.innerHTML = ''; }
    }, 320);
  }


  // ─── Color palette ────────────────────────────────────────────────────────────
  var C = {
    accent:  '#00ff88',
    red:     '#ff4444',
    amber:   '#f59e0b',
    blue:    '#38bdf8',
    purple:  '#a855f7',
    bg:      'rgba(7,13,15,0.97)',
    card:    'rgba(12,20,24,0.98)',
    border:  '#1a2e35',
    text:    '#e8f5f0',
    muted:   '#4a6560',
  };

  // ─── Stat cell ────────────────────────────────────────────────────────────────
  function _stat(label, value) {
    return (
      '<div style="background:rgba(255,255,255,0.04);border:1px solid ' + C.border + ';' +
      'border-radius:12px;padding:14px 18px">' +
        '<div style="color:' + C.muted + ';font-size:11px;letter-spacing:2px;font-weight:700;">' + label + '</div>' +
        '<div style="color:' + C.text + ';font-size:28px;font-weight:900;margin-top:4px;' +
        'font-family:\'Oswald\',sans-serif">' + value + '</div>' +
      '</div>'
    );
  }

  // ─── Templates ───────────────────────────────────────────────────────────────

  function tpl_DECISION_PENDING() {
    return (
      '<div style="text-align:center;padding:52px 80px;' +
      'background:rgba(15,10,0,0.98);' +
      'border:3px solid ' + C.amber + ';border-radius:24px;' +
      'box-shadow:0 0 80px rgba(245,158,11,0.5);">' +
        '<style>' +
          '@keyframes __dpPulse{0%,100%{box-shadow:0 0 60px rgba(245,158,11,0.3)}' +
          '50%{box-shadow:0 0 140px rgba(245,158,11,0.8)}}' +
          '#' + PANEL_ID + ' > div{animation:__dpPulse 1.4s ease-in-out infinite}' +
        '</style>' +
        '<div style="font-size:64px;margin-bottom:16px;">⚖️</div>' +
        '<div style="color:' + C.amber + ';font-size:16px;letter-spacing:6px;font-weight:900;' +
        'margin-bottom:12px;font-family:\'Segoe UI\',sans-serif;">THIRD UMPIRE REVIEW</div>' +
        '<div style="color:#fff;font-size:52px;font-weight:900;letter-spacing:4px;' +
        'font-family:\'Oswald\',\'Segoe UI\',sans-serif;line-height:1;">DECISION<br>PENDING</div>' +
        '<div style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:16px;letter-spacing:3px;">' +
          'AWAITING OFFICIAL DECISION' +
        '</div>' +
      '</div>'
    );
  }

  function tpl_BATSMAN_PROFILE(data) {
    var name, rows;
    if (data.stats && Array.isArray(data.stats)) {
      var ne = data.stats.find(function (s) { return /batsman|player|name/i.test(s.label); });
      name = ne ? ne.value : (data.title || '');
      rows = data.stats
        .filter(function (s) { return !/batsman|player|name/i.test(s.label); })
        .map(function (s) { return _stat(s.label, s.value); }).join('');
    } else {
      name = data.playerName || data.name || '';
      rows = _stat('RUNS', data.runs || 0) +
             _stat('BALLS', data.balls || 0) +
             _stat('4s', data.fours || 0) +
             _stat('6s', data.sixes || 0) +
             _stat('STRIKE RATE', data.sr || data.strikeRate || '0.0');
    }
    return (
      '<div style="padding:40px 52px;background:' + C.bg + ';border:2px solid ' + C.purple + ';' +
      'border-radius:24px;min-width:420px;box-shadow:0 0 40px rgba(168,85,247,0.2)">' +
        '<div style="display:inline-block;background:' + C.purple + ';color:#fff;font-size:12px;' +
        'font-weight:900;letter-spacing:3px;padding:4px 18px;border-radius:20px;margin-bottom:16px;">BATSMAN</div>' +
        '<div style="color:' + C.text + ';font-size:34px;font-weight:900;margin-bottom:20px;">' + name + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + rows + '</div>' +
      '</div>'
    );
  }

  function tpl_BOWLER_PROFILE(data) {
    var name, rows;
    if (data.stats && Array.isArray(data.stats)) {
      var ne = data.stats.find(function (s) { return /bowler|player|name/i.test(s.label); });
      name = ne ? ne.value : (data.title || '');
      rows = data.stats
        .filter(function (s) { return !/bowler|player|name/i.test(s.label); })
        .map(function (s) { return _stat(s.label, s.value); }).join('');
    } else {
      name = data.playerName || data.name || data.bowler || '';
      rows = _stat('OVERS', data.overs || '0.0') +
             _stat('WICKETS', data.wickets || 0) +
             _stat('RUNS', data.runs || 0) +
             _stat('ECONOMY', data.economy || data.econ || '0.00');
    }
    return (
      '<div style="padding:40px 52px;background:' + C.bg + ';border:2px solid ' + C.blue + ';' +
      'border-radius:24px;min-width:420px;box-shadow:0 0 40px rgba(56,189,248,0.2)">' +
        '<div style="display:inline-block;background:' + C.blue + ';color:#000;font-size:12px;' +
        'font-weight:900;letter-spacing:3px;padding:4px 18px;border-radius:20px;margin-bottom:16px;">BOWLER</div>' +
        '<div style="color:' + C.text + ';font-size:34px;font-weight:900;margin-bottom:20px;">' + name + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' + rows + '</div>' +
      '</div>'
    );
  }

  function _introCard(icon, label, name) {
    return (
      '<div style="text-align:center;padding:20px 28px;background:rgba(255,255,255,0.04);' +
      'border:1px solid ' + C.border + ';border-radius:16px;min-width:150px">' +
        '<div style="font-size:28px;margin-bottom:8px;">' + icon + '</div>' +
        '<div style="color:' + C.muted + ';font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:8px;">' + label + '</div>' +
        '<div style="color:' + C.text + ';font-size:20px;font-weight:900;">' + name + '</div>' +
      '</div>'
    );
  }

  function tpl_START_INNINGS_INTRO(data) {
    return (
      '<div style="padding:44px 56px;background:' + C.bg + ';border:2px solid ' + C.accent + ';' +
      'border-radius:24px;min-width:540px;box-shadow:0 0 50px rgba(0,255,136,0.12)">' +
        '<div style="text-align:center;color:' + C.accent + ';font-size:14px;letter-spacing:5px;' +
        'font-weight:700;margin-bottom:24px;">INNINGS OPENING</div>' +
        '<div style="display:flex;gap:24px;justify-content:center">' +
          _introCard('🏏', 'STRIKER', data.striker || '') +
          _introCard('⬤', 'NON-STRIKER', data.nonStriker || '') +
          _introCard('🎳', 'BOWLER', data.bowler || '') +
        '</div>' +
      '</div>'
    );
  }

  function tpl_INNINGS_BREAK(data) {
    var target = data.targetScore || data.target || 0;
    var chaser = ((data.chasingTeam || data.team2Name || 'TEAM 2') + '').toUpperCase();
    return (
      '<div style="text-align:center;padding:52px 72px;background:' + C.bg + ';border:2px solid ' + C.accent + ';' +
      'border-radius:24px;min-width:480px;box-shadow:0 0 60px rgba(0,255,136,0.15)">' +
        '<div style="font-size:48px;margin-bottom:16px;">🏏</div>' +
        '<div style="color:' + C.accent + ';font-size:20px;font-weight:700;letter-spacing:4px;margin-bottom:24px;">INNINGS BREAK</div>' +
        '<div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.25);' +
        'border-radius:16px;padding:24px 40px">' +
          '<div style="color:' + C.muted + ';font-size:13px;letter-spacing:3px;margin-bottom:8px;">TARGET FOR ' + chaser + '</div>' +
          '<div style="color:' + C.accent + ';font-size:80px;font-weight:900;line-height:1;' +
          'font-family:\'Oswald\',sans-serif;">' + target + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function tpl_WICKET_SWITCH(data) {
    return (
      '<div style="text-align:center;padding:48px 64px;background:' + C.bg + ';border:2px solid ' + C.red + ';' +
      'border-radius:24px;min-width:460px;max-width:600px;box-shadow:0 0 60px rgba(255,68,68,0.2)">' +
        '<div style="font-size:72px;margin-bottom:8px;">🎯</div>' +
        '<div style="color:' + C.red + ';font-size:52px;font-weight:900;letter-spacing:6px;' +
        'font-family:\'Oswald\',sans-serif">OUT!</div>' +
        '<div style="color:' + C.text + ';font-size:28px;font-weight:700;margin-top:16px;">' + (data.outName || '') + '</div>' +
        '<div style="color:' + C.muted + ';font-size:18px;margin-top:6px;">' +
          (data.outRuns || 0) + ' (' + (data.outBalls || 0) + ') · ' + ((data.howOut || 'OUT') + '').toUpperCase() +
        '</div>' +
        (data.inName
          ? '<div style="margin-top:28px;padding-top:24px;border-top:1px solid ' + C.border + ';' +
            'color:' + C.accent + ';font-size:20px;font-weight:700;">▶ ' + data.inName +
            ' &nbsp;<span style="color:' + C.muted + ';font-size:15px;">COMING IN</span></div>'
          : '') +
      '</div>'
    );
  }

  function tpl_BATSMAN_CHANGE(data) {
    var isRetired = ((data.howOut || '') + '').toUpperCase().indexOf('RETIRED') !== -1;
    var bc = isRetired ? C.amber : C.blue;
    var badge = isRetired ? 'RETIRED HURT' : 'SUBSTITUTION';
    return (
      '<div style="text-align:center;padding:44px 60px;background:' + C.bg + ';border:2px solid ' + bc + ';' +
      'border-radius:24px;min-width:440px;max-width:580px;box-shadow:0 0 40px rgba(0,0,0,0.6)">' +
        '<div style="display:inline-block;background:' + bc + ';color:#000;font-size:13px;' +
        'font-weight:900;letter-spacing:3px;padding:4px 20px;border-radius:20px;margin-bottom:16px;">' + badge + '</div>' +
        '<div style="color:' + C.text + ';font-size:30px;font-weight:700;">' + (data.outName || '') + '</div>' +
        '<div style="color:' + C.muted + ';font-size:18px;margin-top:8px;">' + (data.outRuns || 0) + ' (' + (data.outBalls || 0) + ')</div>' +
        (data.inName
          ? '<div style="margin-top:24px;padding-top:20px;border-top:1px solid ' + C.border + ';' +
            'color:' + C.accent + ';font-size:20px;font-weight:700;">▶ ' + data.inName + '</div>'
          : '') +
      '</div>'
    );
  }

  function tpl_NEW_BOWLER(data) {
    return (
      '<div style="text-align:center;padding:44px 64px;background:' + C.bg + ';border:2px solid ' + C.blue + ';' +
      'border-radius:24px;min-width:440px;box-shadow:0 0 40px rgba(56,189,248,0.15)">' +
        '<div style="color:' + C.muted + ';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:12px;">NEW BOWLER</div>' +
        '<div style="color:' + C.text + ';font-size:36px;font-weight:900;font-family:\'Oswald\',sans-serif;' +
        'letter-spacing:2px;">' + (data.bowler || data.playerName || '') + '</div>' +
        '<div style="display:flex;gap:32px;justify-content:center;margin-top:20px;">' +
          '<div style="text-align:center"><div style="color:' + C.blue + ';font-size:32px;font-weight:900;">' + (data.overs || '0.0') + '</div>' +
          '<div style="color:' + C.muted + ';font-size:12px;letter-spacing:2px;">OVERS</div></div>' +
          '<div style="text-align:center"><div style="color:' + C.text + ';font-size:32px;font-weight:900;">' + (data.wickets || 0) + '-' + (data.runs || 0) + '</div>' +
          '<div style="color:' + C.muted + ';font-size:12px;letter-spacing:2px;">FIGURES</div></div>' +
        '</div>' +
      '</div>'
    );
  }

  function _bRow(b) {
    var isOut = b.outStatus === 'out' || b.isOut;
    return (
      '<tr>' +
      '<td style="color:' + (isOut ? C.muted : C.text) + ';font-size:16px;padding:10px 8px;border-bottom:1px solid ' + C.border + ';text-align:left;font-weight:700;">' +
        (b.name || '') + (isOut ? '' : ' <span style="color:' + C.accent + '">*</span>') +
      '</td>' +
      '<td style="color:' + C.accent + ';font-size:18px;font-weight:900;padding:10px 8px;border-bottom:1px solid ' + C.border + ';font-family:\'Oswald\',sans-serif">' + (b.runs || 0) + '</td>' +
      '<td style="color:' + C.muted + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">(' + (b.balls || 0) + ')</td>' +
      '<td style="color:' + C.muted + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (b.fours || 0) + '</td>' +
      '<td style="color:' + C.muted + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (b.sixes || 0) + '</td>' +
      '<td style="color:' + (isOut ? C.red : C.accent) + ';font-size:11px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (isOut ? 'OUT' : 'BAT') + '</td>' +
      '</tr>'
    );
  }

  function _blRow(b) {
    return (
      '<tr>' +
      '<td style="color:' + C.text + ';font-size:16px;padding:10px 8px;border-bottom:1px solid ' + C.border + ';text-align:left;font-weight:700;">' + (b.name || '') + '</td>' +
      '<td style="color:' + C.blue + ';font-size:16px;font-weight:900;padding:10px 8px;border-bottom:1px solid ' + C.border + ';font-family:\'Oswald\',sans-serif">' + (b.overs || '0.0') + '</td>' +
      '<td style="color:' + C.muted + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (b.maidens || 0) + '</td>' +
      '<td style="color:' + C.text + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (b.runs || 0) + '</td>' +
      '<td style="color:' + C.accent + ';font-size:18px;font-weight:900;padding:10px 8px;border-bottom:1px solid ' + C.border + ';font-family:\'Oswald\',sans-serif">' + (b.wickets !== undefined ? b.wickets : (b.wkts || 0)) + '</td>' +
      '<td style="color:' + C.muted + ';font-size:14px;padding:10px 8px;border-bottom:1px solid ' + C.border + '">' + (b.econ || b.economy || '0.00') + '</td>' +
      '</tr>'
    );
  }

  function _th(label) {
    return '<th style="color:' + C.muted + ';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid ' + C.border + ';text-align:left;">' + label + '</th>';
  }

  function tpl_BATTING_CARD(data) {
    var rows = (data.batsmen || data.battingSummary || []).map(_bRow).join('');
    return (
      '<div style="padding:36px 44px;background:' + C.bg + ';border:2px solid ' + C.accent + ';' +
      'border-radius:20px;min-width:580px;max-height:80vh;overflow:auto">' +
        '<div style="color:' + C.accent + ';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:20px;">BATTING SCORECARD</div>' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr>' + _th('BATSMAN') + _th('R') + _th('B') + _th('4s') + _th('6s') + _th('STATUS') + '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function tpl_BOWLING_CARD(data) {
    var rows = (data.bowlers || data.bowlingSummary || []).map(_blRow).join('');
    return (
      '<div style="padding:36px 44px;background:' + C.bg + ';border:2px solid ' + C.blue + ';' +
      'border-radius:20px;min-width:540px;max-height:80vh;overflow:auto">' +
        '<div style="color:' + C.blue + ';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:20px;">BOWLING SCORECARD</div>' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead><tr>' + _th('BOWLER') + _th('OV') + _th('M') + _th('R') + _th('W') + _th('ECO') + '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  function tpl_MATCH_END(data) {
    return (
      '<div style="text-align:center;padding:52px 72px;background:' + C.bg + ';border:2px solid ' + C.accent + ';' +
      'border-radius:24px;min-width:480px;box-shadow:0 0 60px rgba(0,255,136,0.15)">' +
        '<div style="font-size:48px;margin-bottom:16px;">🏆</div>' +
        '<div style="color:' + C.accent + ';font-size:20px;font-weight:700;letter-spacing:4px;margin-bottom:16px;">MATCH CONCLUDED</div>' +
        '<div style="color:' + C.text + ';font-size:36px;font-weight:900;">' + (data.winnerTeam || '') + '</div>' +
        '<div style="color:' + C.muted + ';font-size:18px;margin-top:8px;">' + (data.winMargin || data.resultSummary || '') + '</div>' +
      '</div>'
    );
  }

  // ─── sharedHandleTrigger — THE single entry point ────────────────────────────
  // Called by engine.js directly (not via postMessage).
  // Also called by the postMessage listener below for sources that bypass engine.
  window.sharedHandleTrigger = function (type, data, durationSec) {
    data = data || {};
    var dur = (durationSec != null ? Number(durationSec) : 8) * 1000;

    switch (type) {

      case 'DECISION_PENDING':
        // 6000 seconds = ~100 minutes. RESTORE kills it early.
        showPanel(tpl_DECISION_PENDING(), 6000 * 1000);
        return true;

      case 'RESTORE':
        hidePanel();
        return false; // false = overlay's own elements should also restore

      case 'BATSMAN_PROFILE':    showPanel(tpl_BATSMAN_PROFILE(data),    dur); return true;
      case 'BOWLER_PROFILE':     showPanel(tpl_BOWLER_PROFILE(data),     dur); return true;
      case 'START_INNINGS_INTRO':showPanel(tpl_START_INNINGS_INTRO(data),dur); return true;
      case 'INNINGS_BREAK':      showPanel(tpl_INNINGS_BREAK(data),      dur); return true;
      case 'WICKET_SWITCH':      showPanel(tpl_WICKET_SWITCH(data),      dur); return true;
      case 'BATSMAN_CHANGE':     showPanel(tpl_BATSMAN_CHANGE(data),     dur); return true;
      case 'NEW_BOWLER':         showPanel(tpl_NEW_BOWLER(data),         dur); return true;
      case 'BATTING_CARD':       showPanel(tpl_BATTING_CARD(data),       dur); return true;
      case 'BOWLING_CARD':       showPanel(tpl_BOWLING_CARD(data),       dur); return true;
      case 'MATCH_END':          showPanel(tpl_MATCH_END(data),          dur); return true;

      case 'BOTH_CARDS':
        showPanel(
          '<div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center;max-height:90vh;overflow:auto;padding:16px">' +
            tpl_BATTING_CARD(data) + tpl_BOWLING_CARD(data) +
          '</div>',
          dur
        );
        return true;

      // These are handled by the overlay template's own elements, not the shared panel
      case 'FOUR':
      case 'SIX':
      case 'WICKET':
      case 'SHOW_TOSS':
      case 'SHOW_SQUADS':
      case 'VS_SCREEN':
        return false;

      default:
        return false;
    }
  };

  // ─── postMessage listener ────────────────────────────────────────────────────
  // Handles OVERLAY_TRIGGER messages from sources that bypass engine.js:
  //   • test.html fire() function
  //   • PreviewStudio iframe
  // engine.js messages are tagged _engineSelf:true — SKIP those to avoid double-render.
  window.addEventListener('message', function (e) {
    if (!e.data || e.data._engineSelf) return;
    if (e.data.type !== 'OVERLAY_TRIGGER' || !e.data.payload) return;

    var p    = e.data.payload;
    var type = p.type;
    var data = p.data || {};
    var dur  = type === 'DECISION_PENDING' ? 6000 : (p.duration > 0 ? p.duration : 8);

    window.sharedHandleTrigger(type, data, dur);
  });

})();
