# ScoreX Overlay Match Name Display Fix
**Root Cause:** Frontend OverlayManager correctly passes `match` ID → backend links overlay.match → serveOverlay injects matchId → engine fetches → utils provides matchName → templates update #matchName.

**Status:** Backend data flow ✅ | Templates have listener ✅ | Issue: Static defaults not updating.

## Approved Plan Steps

**✅ Step 1: Analysis Complete**
- Files read: controller, engine.js, utils.js, templates, models ✓
- Confirmed: matchName computed correctly in utils.js ✓

**✅ Step 2: Create Tracking TODO**
- This file ✓

**Step 3: Add Debug Logging [PENDING]**
```
public/overlays/engine.js:
console.log('[DEBUG] matchId:', matchId);
console.log('[DEBUG] fetched data:', rawMatch?.name);
console.log('[DEBUG] normalized matchName:', flatData.matchName);
```

**Step 4: Verify Template Updates [PENDING]**
- Check all lvl1-*.html have:
```
<span id="matchName">Loading...</span>
pd('matchName', d.matchName);
```

**Step 5: Test End-to-End [PENDING]**
```
1. Select match → Create overlay → Copy publicUrl
2. Open URL → Check console for DEBUG logs
3. Verify #matchName updates from static → real match name
```

**Step 6: Frontend Integration [PENDING]**
- OverlayManager.tsx sends match ✓
- MatchDetail.tsx may need <OverlayManager matchId={matchId} />

**Progress: 2/6 (33%)**
**Est. Complete: 10 mins**
