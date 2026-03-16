# Fix TypeScript Build Errors - Approved Plan Steps

## Status: In Progress

### 1. [x] Add missing schemas to src/utils/validation.ts
- Add `createTeamSchema` and `addPlayerSchema` exports

### 2. [x] Fix populate call in src/controllers/matchController.ts
- Change endMatch() populate to object array format

### 3. [ ] Verify build
- Run `cd scorex-backend/scorex-backend && npm run build`

### 4. [ ] Mark complete

