# ScoreX Backend TypeScript Fix TODO

## Plan Steps:
- [x] Step 1: Add `let hasGoogleStrategy = false;` before GoogleStrategy if-block in src/server.ts
- [x] Step 2: Set `hasGoogleStrategy = true;` after `passport.use(new GoogleStrategy(...))`
- [x] Step 3: Replace health check `passportGoogle: !!passport.strategies?.google` with `passportGoogle: hasGoogleStrategy`
- [ ] Step 4: Verify `npm run build` succeeds

**Status:** Edits complete. hasGoogleStrategy flag added and health check fixed.

**Next:** Run `cd scorex-backend/scorex-backend && npm run build` to verify.

