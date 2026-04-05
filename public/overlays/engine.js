/**
 * Scorex Overlay Engine V4
 * Fixes: sponsors dispatched to overlay, shortName support,
 * preview=true only blocks when no real matchId injected,
 * socket reconnect, tournamentName shows "Team1 vs Team2"
 */
(function () {
  'use strict';

  const config = window.OVERLAY_CONFIG || {};
  const matchId = config.matchId;
  const apiBaseUrl = config.apiBaseUrl || 'https://scorex-backend.onrender.com/api/v1';
  const socketUrl = apiBaseUrl.replace('/api/v1', '');

  const urlParams = new URLSearchParams(window.location.search);
  let globalCfg = {};
  try {
    const cfgParam = urlParams.get('cfg');
    if (cfgParam) globalCfg = JSON.parse(decodeURIComponent(cfgParam));
  } catch(e) { console.error('Could not parse cfg', e); }

  const overlaySettings = {
    tossDuration:     globalCfg.tossDuration     || 8,
    squadDuration:    globalCfg.squadDuration    || 12,
    introDuration:    globalCfg.introDuration    || 12,
    autoBattingOvers: globalCfg.autoBattingOvers !== undefined ? globalCfg.autoBattingOvers : 2,
    autoBowlingOvers: globalCfg.autoBowlingOvers !== undefined ? globalCfg.autoBowlingOvers : 3,
    autoStatsStyle:   globalCfg.autoStatsStyle   || 'TOGETHER',
    autoStatsDuration:globalCfg.autoStatsDuration|| 10,
    // ✅ Sponsors from cfg
    sponsors:         globalCfg.sponsors         || [],
    sponsorDuration:  globalCfg.showDuration      || 6,
  };

  let matchData = null;
  let socket = null;
  let currentState = 'BOOTING';
  let hasPlayedIntro = false;
  let lastAutoBattingOver = -1;
  let lastAutoBowlingOver = -1;
  let animationLock = false;

  function dispatchTrigger(triggerObj) {
    window.postMessage({ type: 'OVERLAY_TRIGGER', payload: triggerObj }, '*');
  }

  // ✅ Dispatch sponsors to overlay so templates can display them
  function dispatchSponsors() {
    if (overlaySettings.sponsors && overlaySettings.sponsors.length > 0) {
      window.postMessage({
        type: 'UPDATE_SPONSORS',
        sponsors: overlaySettings.sponsors,
        duration: overlaySettings.sponsorDuration
      }, '*');
    }
  }

  function safeUpdateState(rawDoc) {
    try {
      if (!rawDoc) return;
      const trigger = rawDoc.activeTrigger || null;
      const rawMatch = rawDoc.match || rawDoc;
      let flatData = typeof window.normalizeScoreData === 'function'
        ? window.normalizeScoreData(rawMatch)
        : rawMatch;

      // ✅ Override tournamentName to show "Team1 vs Team2" for overlay display
      if (rawMatch.team1Name && rawMatch.team2Name) {
        const t1Short = rawMatch.team1?.shortName || rawMatch.team1ShortName || rawMatch.team1Name;
        const t2Short = rawMatch.team2?.shortName || rawMatch.team2ShortName || rawMatch.team2Name;
        flatData.tournamentName = (rawMatch.tournamentId?.name || rawMatch.tournamentName || 'SCOREX LIVE');
        flatData.matchDisplayName = `${t1Short} vs ${t2Short}`;
        flatData.team1ShortName = t1Short;
        flatData.team2ShortName = t2Short;
      }

      matchData = flatData;
      const isMatchNew = flatData.team1Score === 0 && flatData.team1Overs === '0.0' && flatData.team1Wickets === 0;
      const tossDone = !!rawMatch.tossWinnerName;
      const hasPlayers = !!flatData.strikerName;

      if (currentState === 'BOOTING') {
        if (!tossDone) {
          currentState = 'VS_SCREEN';
          dispatchTrigger({ type: 'SHOW_VS_SCREEN' });
        } else if (tossDone && isMatchNew && !hasPlayers) {
          currentState = 'TOSS_SCREEN';
          dispatchTrigger({ type: 'SHOW_TOSS', data: { text: rawMatch.tossWinnerName + ' won the toss' } });
          setTimeout(() => {
            currentState = 'SQUAD_SCREEN';
            dispatchTrigger({ type: 'SHOW_SQUADS' });
            setTimeout(() => {
              currentState = 'LIVE';
              dispatchTrigger({ type: 'RESTORE' });
            }, overlaySettings.squadDuration * 1000);
          }, overlaySettings.tossDuration * 1000);
        } else {
          currentState = 'LIVE';
        }
      }

      if (currentState === 'LIVE' && hasPlayers && isMatchNew && !hasPlayedIntro && !animationLock) {
        hasPlayedIntro = true;
        animationLock = true;
        dispatchTrigger({ type: 'START_INNINGS_INTRO' });
        setTimeout(() => { animationLock = false; dispatchTrigger({ type: 'RESTORE' }); }, overlaySettings.introDuration * 1000);
      }

      // ✅ Independent batting/bowling card auto-triggers
      if (currentState === 'LIVE' && !animationLock) {
        const overs = parseFloat(flatData.team1Overs);
        const isOverComplete = Number.isInteger(overs) && overs > 0;

        if (isOverComplete) {
          const doBatting = overlaySettings.autoBattingOvers > 0 && (overs % overlaySettings.autoBattingOvers === 0) && overs !== lastAutoBattingOver;
          const doBowling = overlaySettings.autoBowlingOvers > 0 && (overs % overlaySettings.autoBowlingOvers === 0) && overs !== lastAutoBowlingOver;

          if (doBatting) lastAutoBattingOver = overs;
          if (doBowling) lastAutoBowlingOver = overs;

          if (doBatting && doBowling) {
            animationLock = true;
            if (overlaySettings.autoStatsStyle === 'SEQUENTIAL') {
              dispatchTrigger({ type: 'BATTING_CARD' });
              setTimeout(() => {
                dispatchTrigger({ type: 'BOWLING_CARD' });
                setTimeout(() => { animationLock = false; dispatchTrigger({ type: 'RESTORE' }); }, overlaySettings.autoStatsDuration * 1000);
              }, overlaySettings.autoStatsDuration * 1000);
            } else {
              dispatchTrigger({ type: 'BOTH_CARDS' });
              setTimeout(() => { animationLock = false; dispatchTrigger({ type: 'RESTORE' }); }, overlaySettings.autoStatsDuration * 1000);
            }
          } else if (doBatting) {
            animationLock = true;
            dispatchTrigger({ type: 'BATTING_CARD' });
            setTimeout(() => { animationLock = false; dispatchTrigger({ type: 'RESTORE' }); }, overlaySettings.autoStatsDuration * 1000);
          } else if (doBowling) {
            animationLock = true;
            dispatchTrigger({ type: 'BOWLING_CARD' });
            setTimeout(() => { animationLock = false; dispatchTrigger({ type: 'RESTORE' }); }, overlaySettings.autoStatsDuration * 1000);
          }
        }
      }

      if (currentState === 'LIVE' && trigger) {
        dispatchTrigger(trigger);
      }

      // ✅ Dispatch score update
      window.postMessage({ type: 'UPDATE_SCORE', data: flatData, raw: rawMatch }, '*');
    } catch (err) {
      console.error('[Scorex Engine] Error:', err);
    }
  }

  async function safeFetchMatchData() {
    if (!matchId) { safeUpdateState(getDemoData()); return; }
    try {
      const res = await fetch(`${apiBaseUrl}/matches/${matchId}`, { headers: { Accept: 'application/json' } });
      const json = await res.json();
      safeUpdateState(json.data || json);
    } catch (err) {
      console.error('[Engine] fetch error:', err);
      safeUpdateState(getDemoData());
    }
  }

  function safeConnectSocket() {
    if (typeof io === 'undefined') return;
    socket = io(socketUrl, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 2000 });
    socket.on('connect', () => { if (matchId) socket.emit('joinMatch', matchId); });
    socket.on('scoreUpdate', (data) => safeUpdateState(data));
    socket.on('disconnect', () => console.warn('[Engine] socket disconnected, will reconnect'));
  }

  function getDemoData() {
    return {
      team1Name: 'PREMIUM BATS', team2Name: 'ROYAL CHALLENGERS',
      team1Score: 0, team1Wickets: 0, team1Overs: '0.0',
      tossWinnerName: 'Team A', tossDecision: 'bat',
      strikerName: 'V. Kohli'
    };
  }

  function init() {
    const isPreview = urlParams.get('preview') === 'true';
    // ✅ Only use demo if preview AND no real matchId was injected by backend
    if (isPreview && !matchId) { safeUpdateState(getDemoData()); return; }
    safeFetchMatchData();
    safeConnectSocket();
    // ✅ Dispatch sponsors after a short delay so overlay listeners are ready
    setTimeout(dispatchSponsors, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();