// MusicEngine: Web Audio API synthesized electronic music, no external files

export type MusicTrack = "menu" | "game";

interface ScheduledNote {
  intervalId: ReturnType<typeof setInterval>;
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentTrack: MusicTrack | null = null;
  private scheduledNotes: ScheduledNote[] = [];
  private _isMuted = false;
  private _pendingTrack: MusicTrack | null = null;
  private _started = false;

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

  play(track: MusicTrack): void {
    if (this.currentTrack === track && this._started) return;
    this._pendingTrack = track;
    // Try starting; if context not available yet (autoplay blocked), we'll start on first interaction
    try {
      this._startTrack(track);
    } catch (_e) {
      // Will be started by triggerStart()
    }
  }

  // Call on first user interaction to unblock autoplay
  triggerStart(): void {
    if (this._pendingTrack && !this._started) {
      this._startTrack(this._pendingTrack);
    } else if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private _startTrack(track: MusicTrack): void {
    this._clearNotes();
    const ctx = this.ensureContext();
    this.currentTrack = track;
    this._started = true;

    if (track === "menu") {
      this._playMenuTrack(ctx);
    } else {
      this._playGameTrack(ctx);
    }
  }

  stop(): void {
    this._clearNotes();
    this.currentTrack = null;
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

  // Menu track: bright arpeggiated chiptune, ~140 BPM
  // 16th note = 60/140/4 ≈ 107ms
  private _playMenuTrack(ctx: AudioContext): void {
    const BPM = 140;
    const sixteenth = (60 / BPM / 4) * 1000;
    const arpNotes = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25]; // C5 E5 G5 C6 G5 E5
    const bassNotes = [130.81, 130.81, 164.81, 130.81]; // C3 C3 E3 C3
    let step = 0;
    let bassStep = 0;

    const id = setInterval(() => {
      if (!this._started || this.currentTrack !== "menu") return;
      const freq = arpNotes[step % arpNotes.length];
      this._playOscillator(ctx, freq, "square", 0.09, 0.5);
      // Slightly detuned second osc for chiptune thickness
      this._playOscillator(ctx, freq * 2, "sawtooth", 0.07, 0.15, 5);

      // Bass every 4 steps
      if (step % 4 === 0) {
        const bass = bassNotes[bassStep % bassNotes.length];
        this._playOscillator(ctx, bass, "sawtooth", 0.18, 0.6);
        bassStep++;
      }

      // Hi-hat every 2 steps
      if (step % 2 === 0) {
        this._playNoise(ctx, 0.03, 0.05);
      }

      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  // Game track: driving bass + lead melody, slightly more intense
  private _playGameTrack(ctx: AudioContext): void {
    const BPM = 155;
    const eighth = (60 / BPM / 2) * 1000;
    const leadPattern = [
      392.0, 493.88, 392.0, 523.25, 0, 587.33, 493.88, 392.0,
    ];
    // G4  B4    G4    C5   rest C#5   B4    G4
    const bassPattern = [98.0, 98.0, 123.47, 98.0, 110.0, 98.0, 130.81, 98.0];
    // G2  G2   B2     G2   A2    G2    C3    G2
    let step = 0;

    const id = setInterval(() => {
      if (!this._started || this.currentTrack !== "game") return;
      // Lead synth
      const lead = leadPattern[step % leadPattern.length];
      if (lead > 0) {
        this._playOscillator(ctx, lead, "sawtooth", 0.12, 0.55);
        this._playOscillator(ctx, lead, "square", 0.12, 0.2, -8);
      }
      // Driving bass
      const bass = bassPattern[step % bassPattern.length];
      this._playOscillator(ctx, bass, "sawtooth", 0.16, 0.8);

      // Kick every 4 (on beat)
      if (step % 4 === 0) {
        this._playKick(ctx);
      }
      // Snare on 2 and 6
      if (step % 8 === 2 || step % 8 === 6) {
        this._playNoise(ctx, 0.08, 0.12);
      }
      // Hi-hat every step
      this._playNoise(ctx, 0.02, 0.04);

      step++;
    }, eighth) as unknown as ReturnType<typeof setInterval>;

    this.scheduledNotes.push({ intervalId: id });
  }

  private _playNoise(
    ctx: AudioContext,
    gainVal: number,
    duration: number,
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
      filter.frequency.value = 5000;
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

  private _playKick(ctx: AudioContext): void {
    if (!this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(1.0, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (_e) {
      // ignore
    }
  }
}
