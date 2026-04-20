/**
 * ScoreX Shared Overlay Handlers v1.0
 * Provides all animation types for both lvl1 and lvl2 overlays.
 * Include AFTER engine.js. Call window.initOverlayHandlers(config) from each overlay's script.
 *
 * config = {
 *   onUpdate: fn(data) — called on UPDATE_SCORE, receives normalized flat data
 *   onTrigger: fn(type, data, duration) — overlay-specific handler for custom animations
 *   els: { four, six, out, decision, ... } — element IDs for standard events
 * }
 */
(function() {
  'use strict';

  // ── Shared fullscreen panel renderer ─────────────────────────────────────────
  // Creates a centered modal overlay on the page. All overlays share this.
  var _panelTimer = null;

  function showPanel(html, durationMs) {
    var panel = document.getElementById('__shared-panel__');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = '__shared-panel__';
      var style = document.createElement('style');
      style.textContent = [
        '#__shared-panel__{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;',
        'justify-content:center;background:rgba(0,0,0,0.88);backdrop-filter:blur(6px);',
        'animation:__pIn .35s ease forwards;}',
        '@keyframes __pIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
        '@keyframes __pOut{from{opacity:1}to{opacity:0;transform:scale(1.04)}}'
      ].join('');
      document.head.appendChild(style);
      document.body.appendChild(panel);
    }
    panel.innerHTML = html;
    panel.style.display = 'flex';
    panel.style.animation = '__pIn .35s ease forwards';
    clearTimeout(_panelTimer);
    if (durationMs > 0) {
      _panelTimer = setTimeout(function() { hidePanel(); }, durationMs);
    }
  }

  function hidePanel() {
    var panel = document.getElementById('__shared-panel__');
    if (!panel) return;
    panel.style.animation = '__pOut .35s ease forwards';
    setTimeout(function() {
      if (panel.parentNode) { panel.style.display = 'none'; panel.innerHTML = ''; }
    }, 350);
  }

  // ── Panel templates ───────────────────────────────────────────────────────────
  var C = {
    accent: '#00ff88', red: '#ff4444', amber: '#f59e0b', blue: '#38bdf8',
    purple: '#a855f7', bg: 'rgba(7,13,15,0.97)', card: 'rgba(12,20,24,0.98)',
    border: '#1a2e35', text: '#e8f5f0', muted: '#4a6560'
  };

  function tpl_WICKET_SWITCH(data) {
    return '<div style="text-align:center;padding:48px 64px;background:'+C.bg+';border:2px solid '+C.red+';border-radius:24px;min-width:460px;max-width:600px;box-shadow:0 0 60px rgba(255,68,68,0.2)">' +
      '<div style="font-size:72px;margin-bottom:8px;">🎯</div>' +
      '<div style="color:'+C.red+';font-size:52px;font-weight:900;letter-spacing:6px;font-family:\'Oswald\',sans-serif">OUT!</div>' +
      '<div style="color:'+C.text+';font-size:28px;font-weight:700;margin-top:16px;">' + (data.outName||'') + '</div>' +
      '<div style="color:'+C.muted+';font-size:18px;margin-top:6px;">' + (data.outRuns||0) + ' (' + (data.outBalls||0) + ') · ' + ((data.howOut||'OUT').toUpperCase()) + '</div>' +
      (data.inName ? '<div style="margin-top:28px;padding-top:24px;border-top:1px solid '+C.border+';color:'+C.accent+';font-size:20px;font-weight:700;">▶ ' + data.inName + ' &nbsp;<span style="color:'+C.muted+';font-size:15px;">COMING IN</span></div>' : '') +
    '</div>';
  }

  function tpl_BATSMAN_CHANGE(data) {
    var isRetired = (data.howOut||'').toUpperCase().indexOf('RETIRED') !== -1;
    var badgeColor = isRetired ? C.amber : C.blue;
    var badge = isRetired ? 'RETIRED HURT' : 'SUBSTITUTION';
    return '<div style="text-align:center;padding:44px 60px;background:'+C.bg+';border:2px solid '+badgeColor+';border-radius:24px;min-width:440px;max-width:580px;box-shadow:0 0 40px rgba(0,0,0,0.6)">' +
      '<div style="display:inline-block;background:'+badgeColor+';color:#000;font-size:13px;font-weight:900;letter-spacing:3px;padding:4px 20px;border-radius:20px;margin-bottom:16px;">'+badge+'</div>' +
      '<div style="color:'+C.text+';font-size:30px;font-weight:700;">' + (data.outName||'') + '</div>' +
      '<div style="color:'+C.muted+';font-size:18px;margin-top:8px;">' + (data.outRuns||0) + ' (' + (data.outBalls||0) + ')</div>' +
      (data.inName ? '<div style="margin-top:24px;padding-top:20px;border-top:1px solid '+C.border+';color:'+C.accent+';font-size:20px;font-weight:700;">▶ ' + data.inName + '</div>' : '') +
    '</div>';
  }

  function tpl_NEW_BOWLER(data) {
    return '<div style="text-align:center;padding:44px 64px;background:'+C.bg+';border:2px solid '+C.blue+';border-radius:24px;min-width:440px;box-shadow:0 0 40px rgba(56,189,248,0.15)">' +
      '<div style="color:'+C.muted+';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:12px;">NEW BOWLER</div>' +
      '<div style="color:'+C.text+';font-size:36px;font-weight:900;font-family:\'Oswald\',sans-serif;letter-spacing:2px;">' + (data.bowler||data.playerName||'') + '</div>' +
      '<div style="display:flex;gap:32px;justify-content:center;margin-top:20px;">' +
        '<div style="text-align:center"><div style="color:'+C.blue+';font-size:32px;font-weight:900;">' + (data.overs||'0.0') + '</div><div style="color:'+C.muted+';font-size:12px;letter-spacing:2px;">OVERS</div></div>' +
        '<div style="text-align:center"><div style="color:'+C.text+';font-size:32px;font-weight:900;">' + (data.wickets||0) + '-' + (data.runs||0) + '</div><div style="color:'+C.muted+';font-size:12px;letter-spacing:2px;">FIGURES</div></div>' +
      '</div>' +
    '</div>';
  }

  function tpl_START_INNINGS_INTRO(data) {
    return '<div style="padding:44px 56px;background:'+C.bg+';border:2px solid '+C.accent+';border-radius:24px;min-width:540px;box-shadow:0 0 50px rgba(0,255,136,0.12)">' +
      '<div style="text-align:center;color:'+C.accent+';font-size:14px;letter-spacing:5px;font-weight:700;margin-bottom:24px;">INNINGS OPENING</div>' +
      '<div style="display:flex;gap:24px;justify-content:center">' +
        card_intro('🏏','STRIKER', data.striker||'') +
        card_intro('⬤','NON-STRIKER', data.nonStriker||'') +
        card_intro('🎳','BOWLER', data.bowler||'') +
      '</div>' +
    '</div>';
  }

  function card_intro(icon, label, name) {
    return '<div style="text-align:center;padding:20px 28px;background:rgba(255,255,255,0.04);border:1px solid '+C.border+';border-radius:16px;min-width:150px">' +
      '<div style="font-size:28px;margin-bottom:8px;">' + icon + '</div>' +
      '<div style="color:'+C.muted+';font-size:11px;letter-spacing:2px;font-weight:700;margin-bottom:8px;">' + label + '</div>' +
      '<div style="color:'+C.text+';font-size:20px;font-weight:900;">' + name + '</div>' +
    '</div>';
  }

  function tpl_INNINGS_BREAK(data) {
    return '<div style="text-align:center;padding:52px 72px;background:'+C.bg+';border:2px solid '+C.accent+';border-radius:24px;min-width:480px;box-shadow:0 0 60px rgba(0,255,136,0.15)">' +
      '<div style="font-size:48px;margin-bottom:16px;">🏏</div>' +
      '<div style="color:'+C.accent+';font-size:20px;font-weight:700;letter-spacing:4px;margin-bottom:24px;">INNINGS BREAK</div>' +
      '<div style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.25);border-radius:16px;padding:24px 40px;margin-bottom:16px;">' +
        '<div style="color:'+C.muted+';font-size:13px;letter-spacing:3px;margin-bottom:8px;">TARGET FOR ' + (data.chasingTeam||'TEAM 2').toUpperCase() + '</div>' +
        '<div style="color:'+C.accent+';font-size:80px;font-weight:900;line-height:1;font-family:\'Oswald\',sans-serif;">' + (data.targetScore||data.target||0) + '</div>' +
      '</div>' +
    '</div>';
  }

  function tpl_BATSMAN_PROFILE(data) {
    return '<div style="padding:40px 52px;background:'+C.bg+';border:2px solid '+C.purple+';border-radius:24px;min-width:420px;box-shadow:0 0 40px rgba(168,85,247,0.15)">' +
      '<div style="display:inline-block;background:'+C.purple+';color:#fff;font-size:12px;font-weight:900;letter-spacing:3px;padding:4px 18px;border-radius:20px;margin-bottom:16px;">BATSMAN</div>' +
      '<div style="color:'+C.text+';font-size:34px;font-weight:900;margin-bottom:20px;">' + (data.playerName||data.name||'') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        stat_row('RUNS', data.runs||0) + stat_row('BALLS', data.balls||0) +
        stat_row('FOURS', data.fours||0) + stat_row('SIXES', data.sixes||0) +
        stat_row('STRIKE RATE', data.sr||data.strikeRate||'0.0') +
      '</div>' +
    '</div>';
  }

  function tpl_BOWLER_PROFILE(data) {
    return '<div style="padding:40px 52px;background:'+C.bg+';border:2px solid '+C.blue+';border-radius:24px;min-width:420px;box-shadow:0 0 40px rgba(56,189,248,0.15)">' +
      '<div style="display:inline-block;background:'+C.blue+';color:#000;font-size:12px;font-weight:900;letter-spacing:3px;padding:4px 18px;border-radius:20px;margin-bottom:16px;">BOWLER</div>' +
      '<div style="color:'+C.text+';font-size:34px;font-weight:900;margin-bottom:20px;">' + (data.playerName||data.name||data.bowler||'') + '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
        stat_row('OVERS', data.overs||'0.0') + stat_row('WICKETS', data.wickets||0) +
        stat_row('RUNS', data.runs||0) + stat_row('ECONOMY', data.economy||data.econ||'0.00') +
      '</div>' +
    '</div>';
  }

  function stat_row(label, value) {
    return '<div style="background:rgba(255,255,255,0.04);border:1px solid '+C.border+';border-radius:12px;padding:14px 18px">' +
      '<div style="color:'+C.muted+';font-size:11px;letter-spacing:2px;font-weight:700;">' + label + '</div>' +
      '<div style="color:'+C.text+';font-size:28px;font-weight:900;margin-top:4px;font-family:\'Oswald\',sans-serif">' + value + '</div>' +
    '</div>';
  }

  function tpl_BATTING_CARD(data) {
    var rows = (data.batsmen||[]).map(function(b) {
      var isOut = b.outStatus === 'out' || b.isOut;
      return '<tr>' +
        '<td style="color:' + (isOut ? C.muted : C.text) + ';font-size:16px;padding:10px 8px;border-bottom:1px solid '+C.border+';text-align:left;font-weight:700;">' + (b.name||'') + (isOut ? '' : ' <span style="color:'+C.accent+'">*</span>') + '</td>' +
        '<td style="color:'+C.accent+';font-size:18px;font-weight:900;padding:10px 8px;border-bottom:1px solid '+C.border+';font-family:\'Oswald\',sans-serif">' + (b.runs||0) + '</td>' +
        '<td style="color:'+C.muted+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">(' + (b.balls||0) + ')</td>' +
        '<td style="color:'+C.muted+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">' + (b.fours||0) + '</td>' +
        '<td style="color:'+C.muted+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">' + (b.sixes||0) + '</td>' +
        (isOut ? '<td style="color:'+C.red+';font-size:11px;padding:10px 8px;border-bottom:1px solid '+C.border+'">OUT</td>' : '<td style="color:'+C.accent+';font-size:11px;padding:10px 8px;border-bottom:1px solid '+C.border+'">BAT</td>') +
      '</tr>';
    }).join('');
    return '<div style="padding:36px 44px;background:'+C.bg+';border:2px solid '+C.accent+';border-radius:20px;min-width:580px;max-height:80vh;overflow:auto">' +
      '<div style="color:'+C.accent+';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:20px;">BATTING SCORECARD</div>' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;text-align:left;border-bottom:1px solid '+C.border+'">BATSMAN</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">R</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">B</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">4s</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">6s</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">STATUS</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  function tpl_BOWLING_CARD(data) {
    var rows = (data.bowlers||[]).map(function(b) {
      return '<tr>' +
        '<td style="color:'+C.text+';font-size:16px;padding:10px 8px;border-bottom:1px solid '+C.border+';text-align:left;font-weight:700;">' + (b.name||'') + '</td>' +
        '<td style="color:'+C.blue+';font-size:16px;font-weight:900;padding:10px 8px;border-bottom:1px solid '+C.border+';font-family:\'Oswald\',sans-serif">' + (b.overs||'0.0') + '</td>' +
        '<td style="color:'+C.muted+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">' + (b.maidens||0) + '</td>' +
        '<td style="color:'+C.text+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">' + (b.runs||0) + '</td>' +
        '<td style="color:'+C.accent+';font-size:18px;font-weight:900;padding:10px 8px;border-bottom:1px solid '+C.border+';font-family:\'Oswald\',sans-serif">' + (b.wickets !== undefined ? b.wickets : (b.wkts||0)) + '</td>' +
        '<td style="color:'+C.muted+';font-size:14px;padding:10px 8px;border-bottom:1px solid '+C.border+'">' + (b.econ||b.economy||'0.00') + '</td>' +
      '</tr>';
    }).join('');
    return '<div style="padding:36px 44px;background:'+C.bg+';border:2px solid '+C.blue+';border-radius:20px;min-width:540px;max-height:80vh;overflow:auto">' +
      '<div style="color:'+C.blue+';font-size:14px;letter-spacing:4px;font-weight:700;margin-bottom:20px;">BOWLING SCORECARD</div>' +
      '<table style="width:100%;border-collapse:collapse">' +
        '<thead><tr>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;text-align:left;border-bottom:1px solid '+C.border+'">BOWLER</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">OV</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">M</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">R</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">W</th>' +
          '<th style="color:'+C.muted+';font-size:11px;letter-spacing:2px;padding:6px 8px;border-bottom:1px solid '+C.border+'">ECO</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
  }

  // ── DECISION PENDING overlay element ─────────────────────────────────────────
  // Injected into every overlay page to guarantee DECISION_PENDING always works
  function ensureDecisionElement() {
    if (document.getElementById('__decision-overlay__')) return;
    var el = document.createElement('div');
    el.id = '__decision-overlay__';
    el.style.cssText = [
      'position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;',
      'background:rgba(0,0,0,0.7);backdrop-filter:blur(3px);',
      'animation:__dpPulse 2s ease-in-out infinite;'
    ].join('');
    el.innerHTML = [
      '<div style="text-align:center;padding:40px 80px;background:rgba(12,20,24,0.98);',
      'border:2px solid #f59e0b;border-radius:24px;box-shadow:0 0 60px rgba(245,158,11,0.3)">',
      '<div style="font-size:56px;margin-bottom:12px;">⚠️</div>',
      '<div style="color:#f59e0b;font-size:48px;font-weight:900;letter-spacing:6px;',
      'font-family:\'Oswald\',Impact,sans-serif;line-height:1">DECISION</div>',
      '<div style="color:#f59e0b;font-size:48px;font-weight:900;letter-spacing:6px;',
      'font-family:\'Oswald\',Impact,sans-serif;line-height:1">PENDING</div>',
      '<div style="color:#4a6560;font-size:14px;letter-spacing:4px;margin-top:12px;font-weight:700">',
      '3RD UMPIRE REVIEW</div>',
      '</div>'
    ].join('');
    var style = document.createElement('style');
    style.textContent = '@keyframes __dpPulse{0%,100%{box-shadow:none}50%{box-shadow:inset 0 0 0 3px rgba(245,158,11,0.15)}}';
    document.head.appendChild(style);
    document.body.appendChild(el);
  }

  // ── Global handler — attached to window.message ───────────────────────────────
  // Every overlay's message listener can call this for any animation type it doesn't
  // handle natively. Returns true if handled, false if the overlay should handle it.
  window.sharedHandleTrigger = function(type, data, duration) {
    ensureDecisionElement();
    var dp = document.getElementById('__decision-overlay__');
    var dur = (duration || 8) * 1000;

    switch (type) {
      case 'DECISION_PENDING':
        var active = (data && data.active !== undefined) ? !!data.active : true;
        if (dp) dp.style.display = active ? 'flex' : 'none';
        // Also try native element if overlay has one
        var native = document.getElementById('ev-decision') || document.getElementById('anim-decision');
        if (native) {
          if (active) { native.classList.add('fire'); native.classList.add('layer-show'); }
          else { native.classList.remove('fire'); native.classList.remove('layer-show'); }
        }
        return true;

      case 'RESTORE':
        if (dp) dp.style.display = 'none';
        hidePanel();
        var native2 = document.getElementById('ev-decision') || document.getElementById('anim-decision');
        if (native2) { native2.classList.remove('fire'); native2.classList.remove('layer-show'); }
        return false; // allow overlay to do its own restore too

      case 'WICKET_SWITCH':
        showPanel(tpl_WICKET_SWITCH(data), dur);
        return true;

      case 'BATSMAN_CHANGE':
        showPanel(tpl_BATSMAN_CHANGE(data), dur);
        return true;

      case 'NEW_BOWLER':
        showPanel(tpl_NEW_BOWLER(data), dur);
        return true;

      case 'START_INNINGS_INTRO':
        showPanel(tpl_START_INNINGS_INTRO(data), dur);
        return true;

      case 'INNINGS_BREAK':
        showPanel(tpl_INNINGS_BREAK(data), dur);
        return true;

      case 'BATSMAN_PROFILE':
        showPanel(tpl_BATSMAN_PROFILE(data), dur);
        return true;

      case 'BOWLER_PROFILE':
        showPanel(tpl_BOWLER_PROFILE(data), dur);
        return true;

      case 'BATTING_CARD':
        showPanel(tpl_BATTING_CARD(data), dur);
        return true;

      case 'BOWLING_CARD':
        showPanel(tpl_BOWLING_CARD(data), dur);
        return true;

      case 'BOTH_CARDS':
        // Show batting then bowling
        var bothHtml = '<div style="display:flex;gap:24px;flex-wrap:wrap;justify-content:center">' +
          tpl_BATTING_CARD(data) + tpl_BOWLING_CARD(data) + '</div>';
        showPanel(bothHtml, dur);
        return true;

      case 'MATCH_END':
        var me = '<div style="text-align:center;padding:52px 72px;background:rgba(7,13,15,0.98);border:2px solid #00ff88;border-radius:24px;min-width:480px;box-shadow:0 0 60px rgba(0,255,136,0.15)">' +
          '<div style="font-size:48px;margin-bottom:16px;">🏆</div>' +
          '<div style="color:#00ff88;font-size:20px;font-weight:700;letter-spacing:4px;margin-bottom:16px;">MATCH CONCLUDED</div>' +
          '<div style="color:#e8f5f0;font-size:36px;font-weight:900;">' + (data.winnerTeam||'') + '</div>' +
          '<div style="color:#4a6560;font-size:18px;margin-top:8px;">' + (data.winMargin||data.resultSummary||'') + '</div>' +
        '</div>';
        showPanel(me, dur);
        return true;

      default:
        return false;
    }
  };

  // Ensure decision element on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureDecisionElement);
  } else {
    ensureDecisionElement();
  }

})();
