// Overlay Utilities - Team/Player Toggle and Data Management
// Enhanced with multiple event listeners for reliable score updates

// ========== UNIFIED DATA NORMALIZER ==========
// This function normalizes data from different sources (LiveScoring.tsx, Socket, etc.)
// to a consistent format that all overlays can use
function normalizeScoreData(data) {
    if (!data) return null;
    
    // Create normalized data object with defaults
    const normalized = {
        // Tournament info
        tournament: data.tournamentName || data.tournament?.name || 'Match',
        tournamentName: data.tournamentName || data.tournament?.name || 'Match',
        
        // Team 1 (batting team)
        team1Name: data.team1Name || data.team1?.name || 'Team 1',
        team1Short: data.team1Name?.substring(0, 3).toUpperCase() || data.team1?.shortName || 'T1',
        team1Score: data.team1Score !== undefined ? data.team1Score : (data.team1?.score || 0),
        team1Wickets: data.team1Wickets !== undefined ? data.team1Wickets : (data.team1?.wickets || 0),
        team1Overs: data.team1Overs || data.team1?.overs || '0.0',
        
        // Team 2 (bowling team)
        team2Name: data.team2Name || data.team2?.name || 'Team 2',
        team2Short: data.team2Name?.substring(0, 3).toUpperCase() || data.team2?.shortName || 'T2',
        team2Score: data.team2Score !== undefined ? data.team2Score : (data.team2?.score || 0),
        team2Wickets: data.team2Wickets !== undefined ? data.team2Wickets : (data.team2?.wickets || 0),
        team2Overs: data.team2Overs || data.team2?.overs || '0.0',
        
        // Current striker
        strikerName: data.strikerName || data.striker?.name || 'Striker',
        strikerRuns: data.strikerRuns !== undefined ? data.strikerRuns : (data.striker?.runs || 0),
        strikerBalls: data.strikerBalls !== undefined ? data.strikerBalls : (data.striker?.balls || 0),
        
        // Current non-striker
        nonStrikerName: data.nonStrikerName || data.nonStriker?.name || 'Non-Striker',
        nonStrikerRuns: data.nonStrikerRuns !== undefined ? data.nonStrikerRuns : (data.nonStriker?.runs || 0),
        nonStrikerBalls: data.nonStrikerBalls !== undefined ? data.nonStrikerBalls : (data.nonStriker?.balls || 0),
        
        // Current bowler
        bowlerName: data.bowlerName || data.bowler?.name || 'Bowler',
        bowlerOvers: data.bowlerOvers !== undefined ? data.bowlerOvers : (data.bowler?.overs || 0),
        bowlerRuns: data.bowlerRuns !== undefined ? data.bowlerRuns : (data.bowler?.runs || 0),
        bowlerWickets: data.bowlerWickets !== undefined ? data.bowlerWickets : (data.bowler?.wickets || 0),
        
        // Match stats
        runRate: data.runRate || data.stats?.currentRunRate || '0.00',
        requiredRunRate: data.requiredRunRate || data.stats?.requiredRunRate || '0.00',
        target: data.target || data.stats?.target || 0,
        
        // Status
        status: data.status || 'Live',
        matchId: data.matchId || '',
        
        // Legacy field names (for backwards compatibility)
        score: `${data.team1Score || 0}/${data.team1Wickets || 0}`,
        overs: data.team1Overs || '0.0',
    };
    
    return normalized;
}

// Sample match data (will be replaced by API data)
let matchData = {
  tournament: { name: 'Tournament', logo: '' },
  team1: { name: 'Team 1', shortName: 'T1', score: '0', wickets: '0', overs: '0.0', color: '#004BA0', players: [] },
  team2: { name: 'Team 2', shortName: 'T2', score: '0', wickets: '0', overs: '0.0', color: '#FCCA06', players: [] },
  stats: { currentRunRate: '0.00', requiredRunRate: '0.00', last5Overs: '', target: '0' },
  status: 'Ready',
  result: ''
};

// Initialize overlay with data
function initOverlay(customData = null) {
  if (customData) {
    matchData = { ...matchData, ...customData };
  }
  // Safe calls to updates
  if(typeof updateScoreDisplay === 'function') updateScoreDisplay();
  if(typeof setupTeamsPanel === 'function') setupTeamsPanel();
}

// Handle score updates
function handleScoreUpdate(data) {
    // Normalize the data first
    const normalizedData = normalizeScoreData(data);
    
    // Update match data
    matchData = { ...matchData, ...normalizedData };
    
    // Update score display if specific overlay function exists
    if(typeof updateScoreDisplay === 'function') updateScoreDisplay();
    
    // Update teams panel if exists
    if(typeof setupTeamsPanel === 'function') setupTeamsPanel();
    
    // Dispatch custom event for overlay-specific handling (with normalized data)
    const event = new CustomEvent('scoreUpdated', { detail: normalizedData });
    window.dispatchEvent(event);
    
    // Also dispatch with original data for backward compatibility
    const rawEvent = new CustomEvent('scoreUpdatedRaw', { detail: data });
    window.dispatchEvent(rawEvent);
    
    // Call the global onScoreUpdate if it exists (legacy support)
    if (typeof window.onScoreUpdate === 'function') {
        window.onScoreUpdate(normalizedData);
    }
    
    // Also call handleOverlayScoreUpdate if exists
    if (typeof window.handleOverlayScoreUpdate === 'function') {
        window.handleOverlayScoreUpdate(normalizedData);
    }
}

// Initialize BroadcastChannel for real-time score updates
window.initBroadcastChannel = function() {
  const channel = new BroadcastChannel('cricket_score_updates');
  
  channel.onmessage = function(event) {
    const data = event.data;
    
    // Handle wicket events
    if (data.type === 'WICKET') {
      if (typeof window.triggerPush === 'function') {
        window.triggerPush(data.message || 'OUT!', 'W');
      }
      if (typeof window.onWicket === 'function') {
        window.onWicket(data);
      }
    }
    
    // Handle regular score updates
    if (data.tournament || data.team1 || data.team2 || data.striker) {
      handleScoreUpdate(data);
      // Also dispatch event directly here to ensure listeners catch it
      window.dispatchEvent(new CustomEvent('scoreUpdated', { detail: data }));
    }
  };
  
  console.log('BroadcastChannel initialized: listening for cricket_score_updates');
  return channel;
};

// Auto-initialize BroadcastChannel
(function() {
  try {
    window.initBroadcastChannel();
  } catch(e) {
    console.log('Auto-init BroadcastChannel failed:', e);
  }
})();

// Listen for postMessage from parent window (LiveScoring.tsx)
if (typeof window !== 'undefined') {
  window.addEventListener('message', function(event) {
    // Verify origin for security (optional, can be relaxed for local development)
    // if (event.origin !== expectedOrigin) return;
    
    if (event.data && event.data.type === 'UPDATE_SCORE' && event.data.data) {
      console.log('overlay-utils: postMessage received', event.data.data);
      handleScoreUpdate(event.data.data);
    }
  });
  
  // Listen for scoreUpdated event
  window.addEventListener('scoreUpdated', function(e) {
    if (e.detail) {
      handleScoreUpdate(e.detail);
    }
  });
}

// Safe set text helper
function safeSetText(id, value) {
  if (!id || value === undefined || value === null) return;
  
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

// Update overlay display from data
window.handleOverlayScoreUpdate = function(data) {
  if (!data) return;
  
  // 1. Tournament
  if (data.tournament) {
    safeSetText('tournament-name', data.tournament.name);
    // Fallback selectors
    const tournamentEl = document.querySelector('.tournament-badge') || 
                         document.querySelector('.prism-header') ||
                         document.querySelector('.top-vector');
    if (tournamentEl) tournamentEl.textContent = data.tournament.name;
  }
  
  // 2. TEAM 1
  if (data.team1) {
    safeSetText('team1-name', data.team1.name);
    safeSetText('team1-short', data.team1.shortName || data.team1.name.substring(0, 3).toUpperCase());
    safeSetText('team1-score', data.team1.score);
    safeSetText('team1-wickets', data.team1.wickets);
    safeSetText('team1-overs', data.team1.overs);
    
    // Combined displays found in some templates
    const scoreFullEl = document.getElementById('team1-score-full');
    if(scoreFullEl) scoreFullEl.textContent = `${data.team1.score}/${data.team1.wickets}`;
  }
  
  // Direct data fields (from LiveScoring)
  if (data.team1Name !== undefined) safeSetText('team1-name', data.team1Name);
  if (data.team1Score !== undefined) safeSetText('team1-score', data.team1Score);
  if (data.team1Wickets !== undefined) safeSetText('team1-wickets', data.team1Wickets);
  if (data.team1Overs !== undefined) safeSetText('team1-overs', data.team1Overs);
  
  // 3. TEAM 2
  if (data.team2) {
    safeSetText('team2-name', data.team2.name);
    safeSetText('team2-short', data.team2.shortName || data.team2.name.substring(0, 3).toUpperCase());
    safeSetText('team2-score', data.team2.score);
    safeSetText('team2-wickets', data.team2.wickets);
    safeSetText('team2-overs', data.team2.overs);
  }
  
  if (data.team2Name !== undefined) safeSetText('team2-name', data.team2Name);
  if (data.team2Score !== undefined) safeSetText('team2-score', data.team2Score);
  if (data.team2Wickets !== undefined) safeSetText('team2-wickets', data.team2Wickets);
  if (data.team2Overs !== undefined) safeSetText('team2-overs', data.team2Overs);
  
  // 4. STRIKER
  if (data.striker) {
    safeSetText('striker-name', data.striker.name);
    safeSetText('striker-runs', data.striker.runs + (data.striker.status || '*'));
    safeSetText('striker-stat', `${data.striker.runs} (${data.striker.balls})`);
  }
  
  // Direct striker fields
  if (data.strikerName !== undefined) safeSetText('striker-name', data.strikerName);
  if (data.strikerRuns !== undefined) safeSetText('striker-runs', data.strikerRuns);
  if (data.strikerBalls !== undefined) safeSetText('striker-balls', data.strikerBalls);
  
  // 5. NON-STRIKER
  if (data.nonStriker) {
    safeSetText('nonstriker-name', data.nonStriker.name);
    safeSetText('nonstriker-runs', data.nonStriker.runs);
    safeSetText('nonstriker-stat', `${data.nonStriker.runs} (${data.nonStriker.balls})`);
  }
  
  if (data.nonStrikerName !== undefined) safeSetText('nonstriker-name', data.nonStrikerName);
  if (data.nonStrikerRuns !== undefined) safeSetText('nonstriker-runs', data.nonStrikerRuns);
  if (data.nonStrikerBalls !== undefined) safeSetText('nonstriker-balls', data.nonStrikerBalls);
  
  // 6. BOWLER
  if (data.bowler) {
    safeSetText('bowler-name', data.bowler.name);
    safeSetText('bowler-stat', `${data.bowler.overs}-${data.bowler.maidens}-${data.bowler.runs}-${data.bowler.wickets}`);
  }
  
  if (data.bowlerName !== undefined) safeSetText('bowler-name', data.bowlerName);
  if (data.bowlerOvers !== undefined) safeSetText('bowler-overs', data.bowlerOvers);
  if (data.bowlerRuns !== undefined) safeSetText('bowler-runs', data.bowlerRuns);
  if (data.bowlerWickets !== undefined) safeSetText('bowler-wickets', data.bowlerWickets);
  
  // 7. MATCH STATS
  if (data.stats) {
    safeSetText('current-run-rate', data.stats.currentRunRate || '0.00');
    safeSetText('required-run-rate', data.stats.requiredRunRate || '0.00');
    const targetEl = document.getElementById('target');
    if (targetEl && data.stats.target) targetEl.textContent = `TARGET ${data.stats.target}`;
  }
  
  if (data.runRate !== undefined) safeSetText('current-run-rate', data.runRate);
  if (data.requiredRunRate !== undefined) safeSetText('required-run-rate', data.requiredRunRate);
  if (data.target !== undefined) safeSetText('target', data.target);
};

// Global listener
window.addEventListener('scoreUpdated', function(e) {
  if(window.handleOverlayScoreUpdate) {
    window.handleOverlayScoreUpdate(e.detail);
  }
});

console.log('Overlay utilities loaded - enhanced with multiple event listeners');
