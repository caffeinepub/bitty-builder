# Bitty Builder

## Current State
- Tetris game with HomeScreen, GameScreen, LeaderboardScreen
- Internet Identity auth, nickname management, weekly/all-time leaderboards
- Sound effects via SoundEngine (Web Audio API)
- Sign in/out button styled with hot pink outline on both screens
- No background music, no personal best display

## Requested Changes (Diff)

### Add
- `MusicEngine` class (Web Audio API, no external files) that synthesizes two distinct looping electronic music tracks: Track A for the main menu and Track B for gameplay
- Music auto-plays on load, persists across screens, switches track when transitioning between home and game
- Global mute toggle button placed inline next to the sign in/out button on both HomeScreen and GameScreen
- Personal best display: top-left corner of HomeScreen (opposite the sign in button), shows the authenticated user's all-time highest score by querying `getTopScoresForUser`
- `useMyBestScore` hook using `actor.getTopScoresForUser(principal)` to fetch the player's scores

### Modify
- `App.tsx`: manage music state (isMuted, currentTrack) at app level, pass down to screens; switch track on screen change
- `HomeScreen.tsx`: add mute button next to auth button (top-right), add personal best display (top-left)
- `GameScreen.tsx`: add mute button next to pause/sound controls area (top-right, inline with sign in position)
- `useQueries.ts`: add `useMyBestScore(principal)` hook

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/game/music.ts` — MusicEngine class with two synthesized looping tracks using Web Audio API oscillators, gain nodes, and scheduling. Track A: upbeat arpeggiated chiptune for menu. Track B: driving bass + lead for gameplay. Methods: `play(track)`, `stop()`, `setMuted(muted)`, `toggle()`.
2. Add `useMyBestScore` to `useQueries.ts` using `getTopScoresForUser` with the caller's principal (obtained from `useInternetIdentity`).
3. Update `App.tsx` to instantiate MusicEngine ref, manage muted state, pass `isMuted`/`onToggleMute` props to screens, start correct track per screen.
4. Update `HomeScreen.tsx`: accept `isMuted`/`onToggleMute` props, render mute button next to sign in/out, render personal best top-left.
5. Update `GameScreen.tsx`: accept `isMuted`/`onToggleMute` props, render mute button next to pause button in top HUD.
