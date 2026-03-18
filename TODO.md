# Fix 404 on POST /api/v1/friends/:userId/request

## Steps:
- [x] Step 1: Update routes/friends.ts - Add `/:userId` to POST /request route  
- [x] Step 2: Update controllers/friendController.ts - Change req.body.userId to req.params.userId
- [ ] Step 3: Test locally
- [ ] Step 4: Update TODO.md with completion status
- [ ] Step 5: Attempt completion

Current status: Starting Step 1
