// MusicEngine: Web Audio API synthesized electronic music, no external files
// 5 tracks that rotate randomly every 60 seconds
// 3 upbeat (EDM/synthwave) + 2 aggressive (industrial/dark) -- futuristic arcade style

export type MusicTrack = "menu" | "game";

interface ScheduledNote {
  intervalId: ReturnType<typeof setInterval>;
}

type TrackIndex = 0 | 1 | 2 | 3 | 4;

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private scheduledNotes: ScheduledNote[] = [];
  private _isMuted = false;
  private _started = false;
  private _currentTrackIndex: TrackIndex = 0;
  private _rotationTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    try {
      const storedMute = localStorage.getItem("bitty_muted");
      if (storedMute !== null) {
        this._isMuted = storedMute === "true";
      }
    } catch (_e) {
      // ignore
    }
  }

  get isMuted(): boolean {
    return this._isMuted;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._isMuted ? 0 : 0.18;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this._isMuted = muted;
    try {
      localStorage.setItem("bitty_muted", String(muted));
    } catch (_e) {
      // ignore
    }
    if (this.masterGain) {
      const ctx = this.ctx!;
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : 0.18,
        ctx.currentTime,
        0.1,
      );
    }
  }

  play(): void {
    if (this._started) return;
    try {
      this._startRotation();
    } catch (_e) {
      // Will be started by triggerStart()
    }
  }

  // Call on first user interaction to unblock autoplay
  triggerStart(): void {
    if (!this._started) {
      this._startRotation();
    } else if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private _pickNextTrack(): TrackIndex {
    // Pick a random track different from the current one
    let next: TrackIndex;
    do {
      next = Math.floor(Math.random() * 5) as TrackIndex;
    } while (next === this._currentTrackIndex);
    return next;
  }

  private _startRotation(): void {
    const ctx = this.ensureContext();
    this._started = true;

    // Pick random starting track
    this._currentTrackIndex = Math.floor(Math.random() * 5) as TrackIndex;
    this._playTrack(ctx, this._currentTrackIndex);

    // Rotate every 60 seconds
    this._rotationTimer = setInterval(() => {
      if (!this._started) return;
      const ctx2 = this.ensureContext();
      this._clearNotes();
      this._currentTrackIndex = this._pickNextTrack();
      this._playTrack(ctx2, this._currentTrackIndex);
    }, 60000) as unknown as ReturnType<typeof setInterval>;
  }

  private _playTrack(ctx: AudioContext, index: TrackIndex): void {
    switch (index) {
      case 0:
        this._playTrack0_UpbeatEDM(ctx);
        break;
      case 1:
        this._playTrack1_SynthwaveGroove(ctx);
        break;
      case 2:
        this._playTrack2_FuturisticBounce(ctx);
        break;
      case 3:
        this._playTrack3_IndustrialHard(ctx);
        break;
      case 4:
        this._playTrack4_DarkSynth(ctx);
        break;
    }
  }

  stop(): void {
    this._clearNotes();
    if (this._rotationTimer !== null) {
      clearInterval(this._rotationTimer);
      this._rotationTimer = null;
    }
    this._started = false;
  }

  private _clearNotes(): void {
    for (const note of this.scheduledNotes) {
      clearInterval(note.intervalId);
    }
    this.scheduledNotes = [];
  }

  private _playOscillator(
    ctx: AudioContext,
    freq: number,
    type: OscillatorType,
    duration: number,
    gainVal: number,
    detuneVal = 0,
  ): void {
    if (!this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detuneVal;
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
      );
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_e) {
      // ignore
    }
  }

  private _playNoise(
    ctx: AudioContext,
    gainVal: number,
    duration: number,
    filterFreq = 5000,
  ): void {
    if (!this.masterGain) return;
    try {
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = filterFreq;
      source.buffer = buffer;
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
      );
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();
    } catch (_e) {
      // ignore
    }
  }

  private _playKick(ctx: AudioContext, gainVal = 1.0): void {
    if (!this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_e) {
      // ignore
    }
  }

  // Track 0 -- Upbeat #1: Fast energetic EDM, ~150 BPM
  // Detuned sawtooth lead arpeggio across 2 octaves, sub-bass kick, punchy snare
  private _playTrack0_UpbeatEDM(ctx: AudioContext): void {
    const BPM = 150;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Bright 2-octave arp spanning C5 to C6
    const arpNotes = [
      523.25, 659.25, 783.99, 1046.5, 880.0, 659.25, 783.99, 523.25,
    ];
    // Sub-bass pulse pattern
    const bassNotes = [65.41, 65.41, 73.42, 65.41];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 0;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Detuned sawtooth lead
      const freq = arpNotes[step % arpNotes.length];
      this._playOscillator(ctx, freq, "sawtooth", 0.1, 0.45);
      // Triangle layer slightly detuned for width
      this._playOscillator(ctx, freq, "triangle", 0.1, 0.2, 8);
      // Sub-bass on every quarter note
      if (step % 4 === 0) {
        const bass = bassNotes[bassStep % bassNotes.length];
        this._playOscillator(ctx, bass, "sawtooth", 0.18, 0.65);
        // Sine sub for extra weight
        this._playOscillator(ctx, bass * 0.5, "sine", 0.15, 0.5);
        this._playKick(ctx, 1.1);
        bassStep++;
      }
      // Punchy snare on offbeats (steps 4 and 12 in 16-step bar)
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.11, 0.08, 3000);
      }
      // Tight hi-hat every 8th note
      if (step % 2 === 0) this._playNoise(ctx, 0.025, 0.04, 8000);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 1 -- Upbeat #2: Melodic synthwave groove, ~160 BPM
  // Cmaj/Amin chord arpeggiation, 4-on-the-floor kick, hi-hats every 8th
  private _playTrack1_SynthwaveGroove(ctx: AudioContext): void {
    const BPM = 160;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Cmaj then Amin arpeggio pattern (C4-E4-G4-C5 / A3-C4-E4-A4)
    const chordArp = [
      261.63, 329.63, 392.0, 523.25, 220.0, 261.63, 329.63, 440.0, 261.63,
      329.63, 392.0, 523.25, 220.0, 261.63, 440.0, 329.63,
    ];
    // Sawtooth bass an octave below melody root
    const bassPattern = [
      130.81, 130.81, 130.81, 146.83, 110.0, 110.0, 130.81, 110.0,
    ];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 1;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Detuned sawtooth melody
      const mel = chordArp[step % chordArp.length];
      this._playOscillator(ctx, mel, "sawtooth", 0.11, 0.42);
      this._playOscillator(ctx, mel, "sawtooth", 0.11, 0.15, -7);
      // Bright sawtooth bass
      if (step % 2 === 0) {
        const bass = bassPattern[bassStep % bassPattern.length];
        this._playOscillator(ctx, bass, "sawtooth", 0.14, 0.7);
        bassStep++;
      }
      // 4-on-the-floor kick every quarter note (every 4 sixteenths)
      if (step % 4 === 0) this._playKick(ctx, 1.0);
      // Snare on 2 and 4
      if (step % 16 === 4 || step % 16 === 12)
        this._playNoise(ctx, 0.09, 0.09, 2500);
      // Hi-hat every 8th note
      if (step % 2 === 0) this._playNoise(ctx, 0.022, 0.035, 9000);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 2 -- Upbeat #3: Bouncy futuristic beat, ~145 BPM
  // Layered sawtooth + triangle melody, punchy kick+bass hit, snappy snare
  private _playTrack2_FuturisticBounce(ctx: AudioContext): void {
    const BPM = 145;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Bright bouncy melody line
    const melodyNotes = [
      587.33, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33,
      523.25, 493.88, 523.25, 587.33, 659.25, 783.99, 659.25,
    ];
    // Bass hits
    const bassNotes = [73.42, 73.42, 87.31, 73.42];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 2;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Layered synth: sawtooth lead
      const mel = melodyNotes[step % melodyNotes.length];
      this._playOscillator(ctx, mel, "sawtooth", 0.1, 0.4);
      // Slightly detuned triangle for richness
      this._playOscillator(ctx, mel, "triangle", 0.1, 0.22, 12);
      // Punchy kick + bass note on quarter notes
      if (step % 4 === 0) {
        const bass = bassNotes[bassStep % bassNotes.length];
        this._playOscillator(ctx, bass, "sawtooth", 0.14, 0.75);
        this._playKick(ctx, 1.05);
        bassStep++;
      }
      // Snappy snare noise -- tight envelope
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.13, 0.06, 2000);
      }
      // Fast hi-hat every 8th for bounce, extra tick on offbeats
      this._playNoise(ctx, step % 2 === 0 ? 0.028 : 0.015, 0.03, 10000);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 3 -- Aggressive #1: Hard industrial beat, ~175 BPM
  // Heavy growling sawtooth bass 55-110 Hz, distorted lead riff, double kick
  private _playTrack3_IndustrialHard(ctx: AudioContext): void {
    const BPM = 175;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Distorted industrial riff -- no melodic softness
    const riffNotes = [110.0, 110.0, 116.54, 110.0, 98.0, 110.0, 103.83, 110.0];
    // Low growling bass 55-110 Hz
    const bassRiff = [55.0, 55.0, 58.27, 55.0, 49.0, 55.0, 51.91, 55.0];
    let step = 0;
    const trackIdx: TrackIndex = 3;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Distorted sawtooth lead with heavy detune
      const riff = riffNotes[step % riffNotes.length];
      this._playOscillator(ctx, riff, "sawtooth", 0.09, 0.75);
      this._playOscillator(ctx, riff, "sawtooth", 0.09, 0.55, 15);
      this._playOscillator(ctx, riff * 2, "sawtooth", 0.07, 0.4, -15);
      // Heavy growling bass
      const bass = bassRiff[step % bassRiff.length];
      this._playOscillator(ctx, bass, "sawtooth", 0.1, 0.9);
      // Double kick pattern -- hit on 1, 3 and syncopated 2.5
      if (
        step % 16 === 0 ||
        step % 16 === 6 ||
        step % 16 === 8 ||
        step % 16 === 14
      ) {
        this._playKick(ctx, 1.3);
      }
      // Heavy snare noise hits on 2 and 4
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.18, 0.1, 1500);
      }
      // Constant aggressive hi-hat every 16th
      this._playNoise(ctx, 0.03, 0.025, 7000);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 4 -- Aggressive #2: Relentless dark synth, ~180 BPM
  // Rapid-fire sawtooth bassline ostinato, dark minor key lead, sub-bass sine
  private _playTrack4_DarkSynth(ctx: AudioContext): void {
    const BPM = 180;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Dark minor key melody with bent note feel
    const darkLead = [220.0, 233.08, 220.0, 196.0, 207.65, 196.0, 185.0, 196.0];
    // Rapid-fire low ostinato bass
    const bassOstinato = [55.0, 55.0, 61.74, 55.0, 51.91, 55.0, 58.27, 55.0];
    let step = 0;
    const trackIdx: TrackIndex = 4;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Dark minor lead with detune spread
      const mel = darkLead[step % darkLead.length];
      this._playOscillator(ctx, mel, "sawtooth", 0.09, 0.6);
      this._playOscillator(ctx, mel * 2, "sawtooth", 0.07, 0.35, -10);
      // Rapid-fire sawtooth bass ostinato every 16th
      const bass = bassOstinato[step % bassOstinato.length];
      this._playOscillator(ctx, bass, "sawtooth", 0.1, 0.8);
      // Sub-bass sine for weight
      this._playOscillator(ctx, bass * 0.5, "sine", 0.12, 0.55);
      // Brutal kick on every beat (every 4 sixteenths)
      if (step % 4 === 0) this._playKick(ctx, 1.4);
      // Crushing snare
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.2, 0.09, 1200);
      }
      // Constant driving hi-hat
      this._playNoise(ctx, 0.035, 0.022, 8500);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }
}
