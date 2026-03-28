# Bitty Builder

## Current State
Backend has hardcoded tournament timestamps set to 2025 values (one year ago), causing the weekly leaderboard boundary logic to never trigger for the 2026 tournament. Admin reset clears the map correctly but the ISO-week filter still shows current-week scores, making it appear the reset did nothing.

## Requested Changes (Diff)

### Add
- Delay before leaderboard refetch after admin reset (wait for ICP consensus)

### Modify
- Fix `tournamentStart` from 1743195600_000_000_000 (Mar 28 2025) to 1774731600_000_000_000 (Mar 28 2026 21:00 UTC)
- Fix `tournamentNextReset` from 1743800400_000_000_000 (Apr 4 2025) to 1775336400_000_000_000 (Apr 4 2026 21:00 UTC)
- Add 2-second delay in frontend AdminPanel before calling `weeklyRefetch()` after a successful reset

### Remove
- Nothing

## Implementation Plan
1. Update `src/backend/main.mo` tournament timestamp constants
2. Update `src/frontend/src/components/LeaderboardScreen.tsx` AdminPanel handleReset to await a 2s delay before refetch
