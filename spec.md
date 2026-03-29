# Bitty Builder

## Current State
A mobile-first Tetris game with Internet Identity login, leaderboards (weekly + all-time, top 50), admin panel, tournament banner, music, and social sharing. Backend uses stable storage for all data maps.

## Requested Changes (Diff)

### Add
- **Wallet Modal**: Accessible via a WALLET button on the main menu (signed-in users only). Shows:
  - Principal ID (copyable text)
  - ICP Account ID derived from principal (copyable hex string)
  - Live $ICP balance (queried from ICP ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` via ICRC-1)
  - Live $BITTYICP balance (queried from `qroj6-lyaaa-aaaam-qeqta-cai` via ICRC-1)
  - Send section: choose token, enter recipient principal + amount, execute real ICRC-1 transfer
  - Receive section: show both principal ID and account ID with copy buttons
- **Leaderboard principal popup**: Clicking any player's nickname opens a small popup with their principal ID and a copy button
- `principal` field on `LeaderboardEntry` type (backend + all bindings)
- `src/frontend/src/utils/icrc1.ts`: ICRC-1 actor factory + SHA-224-based ICP account ID derivation

### Modify
- `main.mo`: Add `principal: Principal` to `LeaderboardEntry` type; update `buildLeaderboard` to pass through principal from `ScoreEntry`
- `backend.did.d.ts` and `backend.did.js`: Add `principal: Principal` to `LeaderboardEntry`
- `backend.d.ts`: Add `principal: Principal` to `LeaderboardEntry`
- `HomeScreen.tsx`: Add WALLET button (visible only when signed in, styled in brand colors)
- `LeaderboardScreen.tsx`: Make nicknames clickable; show principal popup overlay on click

### Remove
- Nothing removed

## Implementation Plan
1. Add `principal` to `LeaderboardEntry` in `main.mo` and all TS binding files
2. Create `src/frontend/src/utils/icrc1.ts` with ICRC-1 actor factory, SHA-224 impl, and account ID derivation
3. Create `WalletModal.tsx` component
4. Update `HomeScreen.tsx` to add WALLET button
5. Update `LeaderboardScreen.tsx` to add clickable nickname → principal popup
6. Validate and deploy
