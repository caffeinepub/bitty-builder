# Bitty Builder

## Current State
LeaderboardScreen.tsx renders weekly and all-time leaderboards with a reset banner. Backend has hardcoded tournament timing vars (tournamentStart, tournamentNextReset) and no admin functions for resetting or reconfiguring the weekly leaderboard at runtime.

## Requested Changes (Diff)

### Add
- Hidden tap counter (5 taps on leaderboard screen) triggers a centered password overlay
- Password "bittybittywhatwhat" unlocks admin mode (frontend-only session, auto-expires 5 min)
- Admin panel popup modal with two actions:
  1. Manually reset weekly leaderboard (calls new backend function)
  2. Change next reset date/time (calls new backend function)
- Backend: `adminResetWeeklyLeaderboard(password: Text)` — clears all weeklyPlayerScores entries
- Backend: `adminSetWeeklyResetTime(password: Text, newResetTimestamp: Int)` — updates tournamentNextReset

### Modify
- Backend: change `let tournamentStart` and `let tournamentNextReset` to `var` so they can be updated at runtime

### Remove
- Nothing removed

## Implementation Plan
1. Update main.mo: make tournament vars mutable, add two admin backend functions
2. Update backend.d.ts with new function signatures
3. Update LeaderboardScreen.tsx: add tap counter, password modal, admin panel modal
