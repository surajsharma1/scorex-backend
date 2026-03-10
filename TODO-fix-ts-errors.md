# TODO: Fix TypeScript Build Errors

## Summary
55 TypeScript errors across 9 files need to be fixed to pass `npm run build`.

## Issues by File

### 1. src/models/Friend.ts (16 errors)
- **Issue**: Model has `user`/`friend` fields but controller uses `requester`/`recipient`
- **Fix**: Update model schema to use `requester`/`recipient` instead of `user`/`friend`

### 2. src/models/Match.ts (2 errors - static methods not found)
- **Issue**: `getLiveMatches` and `getUpcoming` static methods need proper typing
- **Fix**: Already defined in model, need to verify they're properly typed

### 3. src/models/Team.ts (3 errors - static methods)
- **Issue**: `getByOwner` and `search` static methods need verification
- **Fix**: Already defined in model, need to verify typing

### 4. src/models/Tournament.ts (6 errors - static methods)
- **Issue**: `getUpcoming`, `getOngoing`, `getFeatured`, `getByOrganizer`, `search` static methods
- **Fix**: Already defined in model, need to verify typing

### 5. src/models/Overlay.ts (11 errors)
- **Issue**: Missing properties: `template`, `publicId`, `urlExpiresAt`, `membershipAtCreation`, `match`, `config`, `requiredMembershipLevel`
- **Fix**: Add missing fields to interface and schema

### 6. src/controllers/clubController.ts (2 errors)
- **Issue**: `string` not assignable to `ObjectId` for members.push and viceLeaders.push
- **Fix**: Convert userId to ObjectId before pushing

### 7. src/controllers/matchController.ts (3 errors)
- **Issue**: BallData outType is string but method expects OutType
- **Fix**: Cast outType to OutType properly

### 8. src/controllers/leaderboardController.ts (9 errors)
- **Issue**: `scorecard` property doesn't exist on Match model, `photo` doesn't exist on Player
- **Fix**: Remove scorecard usage or implement it, remove photo reference

### 9. src/routes/users.ts (4 errors)
- **Issue**: `req.user?.id` doesn't exist on type - need proper typing
- **Fix**: Use correct User type or cast

### 10. src/utils/cache.ts (1 error)
- **Issue**: Return type `string | {}` not assignable to `string`
- **Fix**: Proper type casting

## Implementation Order

1. Fix Friend model (update schema to use requester/recipient)
2. Fix Overlay model (add missing fields)
3. Fix Match model (add scorecard virtual or remove from controller)
4. Fix Club controller (ObjectId conversion)
5. Fix Match controller (BallData type)
6. Fix Leaderboard controller (remove scorecard/photo references)
7. Fix Users routes (proper typing)
8. Fix Cache utility (return type)

## Execute Fixes

Run `npm run build` after each fix to verify.

