# Bitty Builder

## Current State
Admin insert score fails silently -- the frontend shows a hardcoded error message so the real cause is never visible. The `getWeeklyLeaderboard` query filters `adminForcedWeeklyScores` by timestamp, which can cause inserted entries to not appear if there is any timestamp window mismatch.

## Requested Changes (Diff)

### Add
- `insertErrorMsg` state in AdminPanel to capture and display the real error string from the catch block

### Modify
- `getWeeklyLeaderboard` (backend): Remove timestamp filter on `adminForcedWeeklyScores` -- forced entries always appear, only filtered out if the nickname already has a real weekly score. They are cleared on `adminResetWeeklyLeaderboard` as before.
- `adminInsertScore` (backend): When nickname is not registered, use `tournamentStart + 1_000_000_000` as the entry timestamp to guarantee it falls within the tournament window if the timestamp filter is ever re-added.
- `handleInsertScore` (frontend): Capture the real error in `catch (e)` and store in `insertErrorMsg`, display it in the UI instead of the hardcoded string.
- All other `catch {}` blocks in AdminPanel updated to capture real errors.
- `(actor as any)` casts removed -- use properly typed `actor` calls directly.

### Remove
- Hardcoded "Nickname not found or failed." error message

## Implementation Plan
1. Update `main.mo`: remove timestamp filter from forced scores in `getWeeklyLeaderboard`; update `adminInsertScore` timestamp logic
2. Update `LeaderboardScreen.tsx`: add `insertErrorMsg` state, capture real error in catch, display it
