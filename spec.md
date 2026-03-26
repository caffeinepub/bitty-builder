# Bitty Builder

## Current State
The backend stores one entry per player in `playerScores` (keyed by Principal), only updating if the new score is higher than the all-time best. The weekly leaderboard filters this same map by timestamp >= current week start. This means:
- If a player's all-time best was set in a previous week, it won't appear in the weekly leaderboard.
- If a player submits a lower score this week, it silently succeeds but doesn't update their entry, so nothing appears in the weekly leaderboard.

## Requested Changes (Diff)

### Add
- `weeklyPlayerScores` map (Principal -> ScoreEntry) that tracks the best score per player for the current week.
- Weekly score update logic: always update if it's a new week for that player, or if the new score is higher than their existing weekly best.

### Modify
- `submitScore`: after updating all-time scores, also update `weeklyPlayerScores` using the new weekly logic.
- `getWeeklyLeaderboard`: query `weeklyPlayerScores` filtered to the current week, instead of `playerScores`.
- `changeNickname`: also update nickname on `weeklyPlayerScores` entry if it exists.

### Remove
- Nothing removed.

## Implementation Plan
1. Add `weeklyPlayerScores` map to backend.
2. Update `submitScore` to write to `weeklyPlayerScores` (new week or higher weekly score).
3. Update `getWeeklyLeaderboard` to read from `weeklyPlayerScores`.
4. Update `changeNickname` to keep `weeklyPlayerScores` nickname in sync.
