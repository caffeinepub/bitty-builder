// MusicEngine: Web Audio API synthesized electronic music, no external files
// 5 tracks that rotate randomly every 60 seconds

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
        this._playTrack0_BrightChiptune(ctx);
        break;
      case 1:
        this._playTrack1_DrivingBass(ctx);
        break;
      case 2:
        this._playTrack2_AmbientSynth(ctx);
        break;
      case 3:
        this._playTrack3_Aggressive(ctx);
        break;
      case 4:
        this._playTrack4_FunkyMidTempo(ctx);
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
      osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (_e) {
      // ignore
    }
  }

  // Track 0: Bright chiptune arpeggio ~140 BPM, square waves
  private _playTrack0_BrightChiptune(ctx: AudioContext): void {
    const BPM = 140;
    const sixteenth = (60 / BPM / 4) * 1000;
    const arpNotes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];
    const bassNotes = [130.81, 130.81, 164.81, 130.81];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 0;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      const freq = arpNotes[step % arpNotes.length];
      this._playOscillator(ctx, freq, "square", 0.09, 0.5);
      this._playOscillator(ctx, freq * 2, "sawtooth", 0.07, 0.15, 5);
      if (step % 4 === 0) {
        const bass = bassNotes[bassStep % bassNotes.length];
        this._playOscillator(ctx, bass, "sawtooth", 0.18, 0.6);
        bassStep++;
      }
      if (step % 2 === 0) this._playNoise(ctx, 0.03, 0.05);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 1: Driving bass + lead melody ~155 BPM, sawtooth
  private _playTrack1_DrivingBass(ctx: AudioContext): void {
    const BPM = 155;
    const eighth = (60 / BPM / 2) * 1000;
    const leadPattern = [
      392.0, 493.88, 392.0, 523.25, 0, 587.33, 493.88, 392.0,
    ];
    const bassPattern = [98.0, 98.0, 123.47, 98.0, 110.0, 98.0, 130.81, 98.0];
    let step = 0;
    const trackIdx: TrackIndex = 1;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      const lead = leadPattern[step % leadPattern.length];
      if (lead > 0) {
        this._playOscillator(ctx, lead, "sawtooth", 0.12, 0.55);
        this._playOscillator(ctx, lead, "square", 0.12, 0.2, -8);
      }
      const bass = bassPattern[step % bassPattern.length];
      this._playOscillator(ctx, bass, "sawtooth", 0.16, 0.8);
      if (step % 4 === 0) this._playKick(ctx);
      if (step % 8 === 2 || step % 8 === 6) this._playNoise(ctx, 0.08, 0.12);
      this._playNoise(ctx, 0.02, 0.04);
      step++;
    }, eighth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 2: Slower ambient synth ~120 BPM, triangle waves, softer
  private _playTrack2_AmbientSynth(ctx: AudioContext): void {
    const BPM = 120;
    const quarter = (60 / BPM) * 1000;
    const melodyNotes = [
      261.63, 329.63, 392.0, 440.0, 392.0, 329.63, 261.63, 0,
    ];
    const padNotes = [130.81, 164.81, 196.0, 220.0];
    let step = 0;
    let padStep = 0;
    const trackIdx: TrackIndex = 2;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      const mel = melodyNotes[step % melodyNotes.length];
      if (mel > 0) {
        this._playOscillator(ctx, mel, "triangle", 0.35, 0.4);
        this._playOscillator(ctx, mel * 1.5, "triangle", 0.3, 0.12);
      }
      if (step % 2 === 0) {
        const pad = padNotes[padStep % padNotes.length];
        this._playOscillator(ctx, pad, "triangle", 0.45, 0.3);
        padStep++;
      }
      // Soft hi-hat every other beat
      if (step % 2 === 1) this._playNoise(ctx, 0.015, 0.06, 8000);
      step++;
    }, quarter) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 3: Fast energetic ~170 BPM, heavy sawtooth, aggressive beat
  private _playTrack3_Aggressive(ctx: AudioContext): void {
    const BPM = 170;
    const sixteenth = (60 / BPM / 4) * 1000;
    const riffNotes = [
      220.0, 220.0, 277.18, 220.0, 246.94, 220.0, 261.63, 220.0,
    ];
    const bassRiff = [55.0, 55.0, 65.41, 55.0, 73.42, 55.0, 65.41, 55.0];
    let step = 0;
    const trackIdx: TrackIndex = 3;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      const riff = riffNotes[step % riffNotes.length];
      this._playOscillator(ctx, riff, "sawtooth", 0.08, 0.7);
      this._playOscillator(ctx, riff * 2, "sawtooth", 0.06, 0.4, 10);
      const bass = bassRiff[step % bassRiff.length];
      this._playOscillator(ctx, bass, "sawtooth", 0.1, 0.9);
      // Kick every 4 steps
      if (step % 4 === 0) this._playKick(ctx, 1.2);
      // Snare on 8 and 24 (double-time feel)
      if (step % 16 === 4 || step % 16 === 12) this._playNoise(ctx, 0.12, 0.1);
      // Constant hi-hat
      this._playNoise(ctx, 0.025, 0.03);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Track 4: Mid-tempo funky ~130 BPM, square wave melody with offbeat bass
  private _playTrack4_FunkyMidTempo(ctx: AudioContext): void {
    const BPM = 130;
    const sixteenth = (60 / BPM / 4) * 1000;
    const funkyMelody = [
      349.23, 0, 440.0, 0, 392.0, 349.23, 0, 523.25, 440.0, 0, 392.0, 0, 349.23,
      0, 440.0, 0,
    ];
    const bassLine = [
      87.31, 0, 87.31, 0, 110.0, 0, 87.31, 0, 98.0, 0, 87.31, 0, 116.54, 0,
      87.31, 0,
    ];
    let step = 0;
    const trackIdx: TrackIndex = 4;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      const mel = funkyMelody[step % funkyMelody.length];
      if (mel > 0) {
        this._playOscillator(ctx, mel, "square", 0.1, 0.55);
        this._playOscillator(ctx, mel, "triangle", 0.08, 0.2, -5);
      }
      const bass = bassLine[step % bassLine.length];
      if (bass > 0) {
        this._playOscillator(ctx, bass, "square", 0.12, 0.7);
      }
      // Kick on 1 and 9
      if (step % 16 === 0 || step % 16 === 8) this._playKick(ctx, 0.9);
      // Snare on 5 and 13 (offbeat)
      if (step % 16 === 4 || step % 16 === 12) this._playNoise(ctx, 0.09, 0.11);
      // Funky hi-hat pattern
      if (step % 4 !== 2) this._playNoise(ctx, 0.02, 0.035, 6000);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }
}
