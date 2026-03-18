# Fix API Issues: 404 on /stats/admin & CORS on admin/user endpoints

## Plan Steps:
- [x] Step 1: Edit src/server.ts to import stats routes and mount at /api/v1/stats
- [x] Step 2: Update CORS origin validation to exact match for reliability  
- [ ] Step 3: Test endpoints locally (npm run dev)
- [ ] Step 4: Deploy to Render and verify

**Status: Steps 1-2 complete. Proceeding to testing.**
