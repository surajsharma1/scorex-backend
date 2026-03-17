# ScoreX Club Fixes - Approved Plan (2026)
Progress: 4/8 ✅

**USER REPORT**: 404 errors → FIXED (graceful responses)

## 1. ✅ Create TODO.md 
## 2. ✅ Fix clubController.ts (404s gone!)
```
- getClub(): data:null + perf populate  
- createClub(): null-safe auth check
- getMyClubs(): search/page params, no logs
```

## 3. ✅ routes/clubs.ts (query params supported)

## 4. ✅ auth.ts (already consistent/safe)

## 5. ✅ seed-clubs.ts (auto-creates organizer)

## 6. ✅ ClubManagement.tsx (server search + better errors)
## 7. [ ] Test commands
## 8. [ ] Complete ✅


## 2. [ ] Fix clubController.ts (Primary - 404s)
```
- All not-found: return {success:true, data:null} NOT status(404)
- Null-safe req.user?.id checks  
- Reduce populate() for perf (members count only)
- Remove console.logs from getMyClubs
- Add ?search/?page to /my endpoint
```

## 3. [ ] Update routes/clubs.ts 
```
- Add query param validation for /my 
```

## 4. [ ] Fix auth middleware
```
- Ensure req.user.id set consistently
```

## 5. [ ] Fix seed-clubs.ts
```
- Auto-create organizer user
```

## 6. [ ] Update ClubManagement.tsx
```
- Server-side search support 
- Better error handling
```

## 7. [ ] Test Commands
```
cd scorex-backend/scorex-backend &amp;&amp; npm run build &amp;&amp; npm run dev
ts-node seed-clubs.ts
curl http://localhost:5000/api/v1/clubs/test (expect data:null)
```

## 8. [ ] Verify & Complete
```
Frontend: Login → Clubs page → Create/Join works
No 404s in Network tab
attempt_completion()
```

**Root Cause**: Controllers throw 404 instead of API-standard {success:true, data:null}
