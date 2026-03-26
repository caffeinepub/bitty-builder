// MusicEngine: Web Audio API synthesized music, no external files
// 6 tracks rotating randomly every 60 seconds
// 5 upbeat house tracks + 1 tropical dance bonus track

export type MusicTrack = "menu" | "game";

interface ScheduledNote {
  intervalId: ReturnType<typeof setInterval>;
}

type TrackIndex = 0 | 1 | 2 | 3 | 4 | 5;

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

  triggerStart(): void {
    if (!this._started) {
      this._startRotation();
    } else if (this.ctx?.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  private _pickNextTrack(): TrackIndex {
    let next: TrackIndex;
    do {
      next = Math.floor(Math.random() * 6) as TrackIndex;
    } while (next === this._currentTrackIndex);
    return next;
  }

  private _startRotation(): void {
    const ctx = this.ensureContext();
    this._started = true;
    this._currentTrackIndex = Math.floor(Math.random() * 6) as TrackIndex;
    this._playTrack(ctx, this._currentTrackIndex);
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
        this._playTrack0_HouseAnthemA(ctx);
        break;
      case 1:
        this._playTrack1_HouseAnthemB(ctx);
        break;
      case 2:
        this._playTrack2_HouseAnthemC(ctx);
        break;
      case 3:
        this._playTrack3_HouseAnthemD(ctx);
        break;
      case 4:
        this._playTrack4_HouseAnthemE(ctx);
        break;
      case 5:
        this._playTrack5_TropicalDance(ctx);
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
      /* ignore */
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
      const bufferSize = Math.ceil(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
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
      /* ignore */
    }
  }

  private _playKick(ctx: AudioContext, gainVal = 1.0): void {
    if (!this.masterGain) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
    } catch (_e) {
      /* ignore */
    }
  }

  // Chord-stab helper: short bright square hit for house stabs
  private _playStab(ctx: AudioContext, freq: number, gainVal: number): void {
    this._playOscillator(ctx, freq, "square", 0.08, gainVal);
    this._playOscillator(ctx, freq * 1.5, "square", 0.06, gainVal * 0.5);
  }

  // ----------------------------------------------------------------
  // Track 0 -- House Anthem A: Classic deep house, 128 BPM
  // Punchy 4-on-the-floor kick, bright piano-ish chord stabs, walking bassline
  // ----------------------------------------------------------------
  private _playTrack0_HouseAnthemA(ctx: AudioContext): void {
    const BPM = 128;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Bright C major / F major stab chord roots
    const stabNotes = [
      523.25, 523.25, 349.23, 349.23, 440.0, 440.0, 392.0, 392.0,
    ];
    // Walking house bassline
    const bassLine = [
      130.81, 146.83, 130.81, 123.47, 110.0, 123.47, 130.81, 146.83,
    ];
    // Uplifting lead melody
    const lead = [
      1046.5, 1174.66, 1046.5, 987.77, 1046.5, 1174.66, 1318.51, 1174.66,
      1046.5, 987.77, 880.0, 987.77, 1046.5, 880.0, 783.99, 880.0,
    ];
    let step = 0;
    const trackIdx: TrackIndex = 0;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // 4-on-the-floor kick
      if (step % 4 === 0) this._playKick(ctx, 1.1);
      // Open hi-hat on offbeat (8th note offbeat)
      if (step % 8 === 4) this._playNoise(ctx, 0.04, 0.12, 7000);
      // Closed hi-hat every 8th
      if (step % 2 === 0) this._playNoise(ctx, 0.018, 0.03, 9000);
      // Snare on 2 and 4
      if (step % 16 === 4 || step % 16 === 12)
        this._playNoise(ctx, 0.08, 0.1, 2500);
      // Chord stab on every half-bar
      if (step % 8 === 0) {
        const root = stabNotes[Math.floor(step / 8) % stabNotes.length];
        this._playStab(ctx, root, 0.18);
        this._playStab(ctx, root * 1.25, 0.12);
      }
      // Walking bass every 8th note
      if (step % 2 === 0) {
        const b = bassLine[Math.floor(step / 2) % bassLine.length];
        this._playOscillator(ctx, b, "sawtooth", 0.13, 0.65);
      }
      // Bright synth lead
      const l = lead[step % lead.length];
      this._playOscillator(ctx, l, "triangle", 0.09, 0.28);
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }

  // ----------------------------------------------------------------
  // Track 1 -- House Anthem B: Progressive house, 132 BPM
  // Energetic rising arpeggio lead, filtered bass pump, punchy drums
  // ----------------------------------------------------------------
  private _playTrack1_HouseAnthemB(ctx: AudioContext): void {
    const BPM = 132;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Rising arpeggio in G major ascending two octaves
    const arp = [
      392.0, 493.88, 587.33, 740.0, 880.0, 987.77, 1174.66, 1318.51, 1174.66,
      987.77, 880.0, 740.0, 587.33, 493.88, 392.0, 493.88,
    ];
    const bass = [98.0, 98.0, 110.0, 98.0, 87.31, 98.0, 110.0, 123.47];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 1;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // 4-on-the-floor
      if (step % 4 === 0) this._playKick(ctx, 1.05);
      // Punchy snare
      if (step % 16 === 4 || step % 16 === 12)
        this._playNoise(ctx, 0.09, 0.09, 2200);
      // Driving hi-hat every 16th
      this._playNoise(ctx, step % 4 === 0 ? 0.01 : 0.022, 0.028, 10000);
      // Open hat offbeat
      if (step % 8 === 4) this._playNoise(ctx, 0.038, 0.1, 6500);
      // Rising arp -- sawtooth bright lead
      const freq = arp[step % arp.length];
      this._playOscillator(ctx, freq, "sawtooth", 0.11, 0.38);
      this._playOscillator(ctx, freq, "sawtooth", 0.09, 0.16, 10);
      // Pumping bass every 8th
      if (step % 2 === 0) {
        const b = bass[bassStep % bass.length];
        this._playOscillator(ctx, b, "sawtooth", 0.14, 0.7);
        this._playOscillator(ctx, b * 0.5, "sine", 0.12, 0.45);
        bassStep++;
      }
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }

  // ----------------------------------------------------------------
  // Track 2 -- House Anthem C: Funky house groove, 126 BPM
  // Catchy synth riff, tight clap, funky bass groove
  // ----------------------------------------------------------------
  private _playTrack2_HouseAnthemC(ctx: AudioContext): void {
    const BPM = 126;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Catchy synth riff (Am pentatonic, upper register)
    const riff = [
      880.0, 1046.5, 880.0, 783.99, 880.0, 987.77, 880.0, 783.99, 698.46,
      783.99, 880.0, 987.77, 880.0, 783.99, 698.46, 659.25,
    ];
    const bassRiff = [110.0, 110.0, 130.81, 110.0, 98.0, 110.0, 130.81, 146.83];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 2;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      if (step % 4 === 0) this._playKick(ctx, 1.0);
      // Tight clap on 2 and 4
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.12, 0.06, 1800);
        this._playNoise(ctx, 0.07, 0.05, 3000);
      }
      // Swinging hi-hat
      if (step % 2 === 0)
        this._playNoise(ctx, step % 4 === 2 ? 0.03 : 0.015, 0.025, 9500);
      // Funky synth riff -- square wave for brightness
      const r = riff[step % riff.length];
      this._playOscillator(ctx, r, "square", 0.08, 0.22);
      this._playOscillator(ctx, r * 2, "sine", 0.07, 0.12);
      // Funky bass hits every 8th
      if (step % 2 === 0) {
        const b = bassRiff[bassStep % bassRiff.length];
        this._playOscillator(ctx, b, "sawtooth", 0.13, 0.72);
        bassStep++;
      }
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }

  // ----------------------------------------------------------------
  // Track 3 -- House Anthem D: Peak-time house, 134 BPM
  // Soaring lead synth, heavy kick, piano chord stabs
  // ----------------------------------------------------------------
  private _playTrack3_HouseAnthemD(ctx: AudioContext): void {
    const BPM = 134;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Soaring lead melody in E major
    const melody = [
      1318.51, 1174.66, 987.77, 1046.5, 1174.66, 1318.51, 1174.66, 987.77,
      880.0, 987.77, 1046.5, 1174.66, 987.77, 880.0, 740.0, 880.0,
    ];
    // Piano-style chord stab roots (E, A, B)
    const chordRoots = [164.81, 220.0, 246.94, 220.0];
    const bassNotes = [82.41, 82.41, 92.5, 82.41, 73.42, 82.41, 92.5, 110.0];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 3;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      if (step % 4 === 0) this._playKick(ctx, 1.15);
      if (step % 16 === 4 || step % 16 === 12)
        this._playNoise(ctx, 0.1, 0.09, 2000);
      this._playNoise(ctx, 0.02, 0.025, 9000);
      if (step % 8 === 4) this._playNoise(ctx, 0.045, 0.13, 6000);
      // Piano chord stab every bar
      if (step % 16 === 0) {
        const root = chordRoots[Math.floor(step / 16) % chordRoots.length];
        this._playOscillator(ctx, root * 4, "triangle", 0.18, 0.3);
        this._playOscillator(ctx, root * 5, "triangle", 0.15, 0.22);
        this._playOscillator(ctx, root * 6, "triangle", 0.12, 0.18);
      }
      // Soaring lead
      const m = melody[step % melody.length];
      this._playOscillator(ctx, m, "sawtooth", 0.1, 0.35);
      this._playOscillator(ctx, m, "triangle", 0.08, 0.2, -8);
      // Bass
      if (step % 2 === 0) {
        const b = bassNotes[bassStep % bassNotes.length];
        this._playOscillator(ctx, b, "sawtooth", 0.13, 0.68);
        bassStep++;
      }
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }

  // ----------------------------------------------------------------
  // Track 4 -- House Anthem E: Uplifting vocal-chop house, 130 BPM
  // Bright pluck arp, classic house piano feel, pumping bass
  // ----------------------------------------------------------------
  private _playTrack4_HouseAnthemE(ctx: AudioContext): void {
    const BPM = 130;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Bright pluck arpeggio -- D major feel
    const pluckArp = [
      587.33, 740.0, 880.0, 1174.66, 880.0, 740.0, 587.33, 659.25, 740.0, 880.0,
      987.77, 740.0, 659.25, 587.33, 493.88, 587.33,
    ];
    // House piano chord stabs every 2 bars
    const pianoChords = [293.66, 329.63, 349.23, 329.63];
    const bass = [73.42, 73.42, 82.41, 73.42, 65.41, 73.42, 82.41, 87.31];
    let step = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 4;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      if (step % 4 === 0) this._playKick(ctx, 1.1);
      if (step % 16 === 4 || step % 16 === 12)
        this._playNoise(ctx, 0.085, 0.09, 2300);
      if (step % 2 === 0) this._playNoise(ctx, 0.019, 0.027, 9200);
      if (step % 8 === 4) this._playNoise(ctx, 0.042, 0.11, 6800);
      // Piano chord stab
      if (step % 32 === 0 || step % 32 === 16) {
        const root = pianoChords[Math.floor(step / 16) % pianoChords.length];
        this._playOscillator(ctx, root * 2, "triangle", 0.2, 0.28);
        this._playOscillator(ctx, root * 2.5, "triangle", 0.16, 0.2);
        this._playOscillator(ctx, root * 3, "triangle", 0.13, 0.15);
      }
      // Bright pluck arp
      const p = pluckArp[step % pluckArp.length];
      this._playOscillator(ctx, p, "triangle", 0.1, 0.32);
      this._playOscillator(ctx, p, "sawtooth", 0.07, 0.14, 6);
      // Pumping bass
      if (step % 2 === 0) {
        const b = bass[bassStep % bass.length];
        this._playOscillator(ctx, b, "sawtooth", 0.14, 0.68);
        this._playOscillator(ctx, b * 0.5, "sine", 0.1, 0.42);
        bassStep++;
      }
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }

  // ----------------------------------------------------------------
  // Track 5 (Bonus) -- Tropical Dance: 120 BPM
  // Steel drum lead, marimba-like plucks, upbeat reggaeton-inspired kick,
  // bright synth pads, summery and light
  // ----------------------------------------------------------------
  private _playTrack5_TropicalDance(ctx: AudioContext): void {
    const BPM = 120;
    const sixteenth = (60 / BPM / 4) * 1000;
    // Steel drum-ish melody (C major with added 2nd)
    const steelDrum = [
      1046.5, 1174.66, 1318.51, 1046.5, 987.77, 1046.5, 1174.66, 880.0, 1046.5,
      880.0, 783.99, 880.0, 987.77, 1046.5, 880.0, 783.99,
    ];
    // Bright marimba-like plucks (middle register)
    const marimba = [
      523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 659.25, 523.25,
    ];
    // Tropical bass groove
    const tropicalBass = [
      130.81, 130.81, 146.83, 130.81, 110.0, 130.81, 146.83, 164.81,
    ];
    let step = 0;
    let marimbaStep = 0;
    let bassStep = 0;
    const trackIdx: TrackIndex = 5;

    const id = setInterval(() => {
      if (!this._started || this._currentTrackIndex !== trackIdx) return;
      // Reggaeton-inspired dembow kick (kick on 1 and syncopated 3+)
      if (step % 16 === 0 || step % 16 === 6 || step % 16 === 8) {
        this._playKick(ctx, 0.95);
      }
      // Bright rimshot-style snare
      if (step % 16 === 4 || step % 16 === 12) {
        this._playNoise(ctx, 0.07, 0.06, 3500);
        this._playOscillator(ctx, 900, "sine", 0.04, 0.15);
      }
      // Light shaker every 16th (tropical percussion feel)
      this._playNoise(ctx, 0.012, 0.025, 11000);
      // Accented shaker on 8th notes
      if (step % 2 === 0) this._playNoise(ctx, 0.024, 0.04, 9500);
      // Steel drum lead (triangle + sine combo for metallic resonance)
      const s = steelDrum[step % steelDrum.length];
      this._playOscillator(ctx, s, "triangle", 0.08, 0.35);
      this._playOscillator(ctx, s, "sine", 0.06, 0.25);
      this._playOscillator(ctx, s * 2, "sine", 0.04, 0.1); // harmonic shimmer
      // Marimba pluck every 8th note
      if (step % 2 === 0) {
        const m = marimba[marimbaStep % marimba.length];
        this._playOscillator(ctx, m, "triangle", 0.1, 0.16);
        this._playOscillator(ctx, m * 2, "sine", 0.05, 0.08);
        marimbaStep++;
      }
      // Tropical bass groove every 8th
      if (step % 2 === 0) {
        const b = tropicalBass[bassStep % tropicalBass.length];
        this._playOscillator(ctx, b, "sawtooth", 0.11, 0.6);
        this._playOscillator(ctx, b * 0.5, "sine", 0.09, 0.38);
        bassStep++;
      }
      // Bright synth pad chord stab every 2 bars for summery feel
      if (step % 32 === 0) {
        this._playOscillator(ctx, 523.25, "sine", 0.35, 0.12);
        this._playOscillator(ctx, 659.25, "sine", 0.3, 0.1);
        this._playOscillator(ctx, 783.99, "sine", 0.25, 0.08);
      }
      step++;
    }, sixteenth) as unknown as ReturnType<typeof setInterval>;
    this.scheduledNotes.push({ intervalId: id });
  }
}
