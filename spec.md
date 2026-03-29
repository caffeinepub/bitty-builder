# Bitty Builder

## Current State
- Weekly and All-Time leaderboards show rank, nickname, and score (top 50 each)
- Share to X button opens a pre-filled tweet but does NOT auto-submit the score
- No share tracking exists in the backend or frontend

## Requested Changes (Diff)

### Add
- Backend: `weeklyShareCounts` and `allTimeShareCounts` stable maps (principal -> Nat) to track X share counts
- Backend: `recordShare` update method that increments both weekly and all-time share counts for the caller
- Backend: `getWeeklyLeaderboard` and `getAllTimeLeaderboard` responses include share count per entry
- Frontend: When "Share to X" is tapped, auto-submit the score first (same logic as Save Score), then call `recordShare`, then open X
- Frontend: Leaderboard table gains a third column "🐦 Shared" showing share count per player

### Modify
- Backend: Leaderboard entry type extended with `shareCount: Nat` field
- Backend: Weekly reset also clears `weeklyShareCounts`
- Frontend: Leaderboard rendering updated to show three columns: Rank+Name, Score, Shared to X count

### Remove
- Nothing removed

## Implementation Plan
1. Add `weeklyShareCounts` and `allTimeShareCounts` as stable var arrays (for preupgrade/postupgrade) in main.mo
2. Add `recordShare` public method
3. Extend leaderboard return types to include share count
4. Update weekly reset to also clear weekly share counts
5. Frontend: wire Share to X button to auto-save score + call recordShare + open X
6. Frontend: add "Shared" column to both leaderboard tables
