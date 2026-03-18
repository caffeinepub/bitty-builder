# Bitty Builder

## Current State
The game has 5 music tracks in `src/frontend/src/game/music.ts`, synthesized via Web Audio API. Tracks include: a bright chiptune arpeggio (Track 0), driving bass lead (Track 1), slow ambient synth (Track 2), fast aggressive beat (Track 3), and funky mid-tempo (Track 4). Tracks rotate randomly every 60 seconds.

## Requested Changes (Diff)

### Add
- Nothing new added structurally

### Modify
- All 5 tracks in `music.ts` rewritten to a modern futuristic arcade style (synthwave/EDM, not retro 8-bit):
  - Track 0: Upbeat #1 -- Fast EDM/synthwave feel, bright lead synth, punchy kick, ~150 BPM
  - Track 1: Upbeat #2 -- Energetic melodic synth, arpeggiated chords, driving groove, ~160 BPM
  - Track 2: Upbeat #3 -- Bouncy futuristic beat, layered synths, bright and propulsive, ~145 BPM
  - Track 3: Aggressive #1 -- Hard-hitting industrial beat, heavy distorted bass, dark and intense, ~175 BPM
  - Track 4: Aggressive #2 -- Relentless dark synth, aggressive bassline and rhythm, punchy and dark, ~180 BPM
- All tracks use modern synthesis techniques: detuned sawtooths, FM-style modulation, sub-bass, clean filter envelopes -- less square/chiptune, more futuristic

### Remove
- Old chiptune/retro character of tracks (square wave dominance, 8-bit feel)

## Implementation Plan
1. Rewrite all 5 track methods in `music.ts` with new melodies, basslines, rhythms, and timbres matching modern futuristic arcade style
2. Keep the MusicEngine class structure, rotation logic, and mute handling intact -- only replace track content
