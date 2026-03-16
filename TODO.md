# Fix: Players Not Adding/Showing in Teams

## Steps:
[x] 1. Update teamController.addPlayer to create Player from {name, role} if no playerId
[x] 2. Test: npm run dev → Tournament → Teams → Add player → Verify shows with name/role  
[x] 3. Check getTeams populate works (already does: .populate('players captain tournamentId'))
[x] 4. Complete task
