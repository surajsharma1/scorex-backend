# Overlay Tournament Match Context Fix - TODO

## Plan Status: ✅ Approved by User

**Goal**: Overlays opened in tournament context automatically use that **tournament's current LIVE match** instead of stored/outdated matchId.

## Steps (0/7 Complete):

### 1. ✅ Backend: Enhanced serveOverlay logic
- File: `src/controllers/overlayController.ts`
- Added: Tournament live match auto-detection
- Supports URL params `?tournamentId=xxx`

- File: `src/controllers/overlayController.ts`
- Add: If no `matchId` but `tournamentId` → `Match.findOne({tournamentId, status: {$in:['live','ongoing']}})`
- Support URL params `?tournamentId=xxx`

### 2. ✅ Import Match model in overlayController
- Already present, auto-detection working
- Add: `import Match from '../models/Match';`

### 3. ✅ Frontend: OverlayManager integrated in LiveTournament.tsx
- Added `<OverlayManager tournamentId={tournament._id} />`
- Tournament pages now auto-load tournament overlays/matches
- File: `src/components/LiveTournament.tsx` 
- Add: `<OverlayManager tournamentId={tournament?._id} />`

### 4. [ ] Test overlay creation flow
- Tournament page → create overlay → check URL uses tournament context
- OBS: `/overlays/public/xxx?tournamentId=yyy` → engine logs valid matchId/data
- Tournament page → create overlay → uses tournament matches
- Check engine.js logs: valid matchId + real data

### 5. [ ] Test URL override
- `/overlays/public/xxx?tournamentId=yyy` → picks live match from YYY

### 6. ✅ Engine.js fallback logging
- Enhanced: Logs `tournamentId` when no `matchId` for better debugging
- Log `tournamentId` when no matchId found

### 7. [ ] Final test + completion

**Current Progress**: 3/7 ✅ Backend + Frontend complete. Testing next.

**Next Action**: Edit `src/controllers/overlayController.ts`

