export type SoundEvent =
  | "land"
  | "clear1"
  | "clear2"
  | "clear3"
  | "tetris"
  | "gameover"
  | "levelup";

export class SoundEngine {
  private ctx: AudioContext | null = null;
  enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "square",
    vol = 0.12,
    delay = 0,
  ) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + duration,
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    } catch (_e) {
      // ignore audio errors
    }
  }

  private playNoise(duration: number, vol = 0.08, delay = 0) {
    if (!this.enabled) return;
    try {
      const ctx = this.getCtx();
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + duration,
      );
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, ctx.currentTime + delay);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start(ctx.currentTime + delay);
    } catch (_e) {
      // ignore
    }
  }

  play(event: SoundEvent) {
    if (!this.enabled) return;
    switch (event) {
      case "land":
        this.playNoise(0.08, 0.1);
        this.playTone(120, 0.08, "sawtooth", 0.06);
        break;
      case "clear1":
        this.playTone(440, 0.1, "square", 0.1);
        this.playTone(550, 0.1, "square", 0.08, 0.08);
        break;
      case "clear2":
        this.playTone(440, 0.08, "square", 0.1);
        this.playTone(550, 0.08, "square", 0.1, 0.07);
        this.playTone(660, 0.12, "square", 0.1, 0.14);
        break;
      case "clear3":
        this.playTone(440, 0.07, "square", 0.1);
        this.playTone(550, 0.07, "square", 0.1, 0.06);
        this.playTone(660, 0.07, "square", 0.1, 0.12);
        this.playTone(880, 0.15, "square", 0.12, 0.18);
        break;
      case "tetris":
        // Fanfare arpeggio
        this.playTone(523, 0.1, "square", 0.12);
        this.playTone(659, 0.1, "square", 0.12, 0.1);
        this.playTone(784, 0.1, "square", 0.12, 0.2);
        this.playTone(1047, 0.25, "square", 0.15, 0.3);
        this.playTone(784, 0.1, "square", 0.1, 0.55);
        this.playTone(1047, 0.3, "square", 0.18, 0.65);
        break;
      case "gameover":
        // Descending sad melody
        this.playTone(440, 0.15, "sawtooth", 0.1);
        this.playTone(392, 0.15, "sawtooth", 0.1, 0.18);
        this.playTone(349, 0.15, "sawtooth", 0.1, 0.36);
        this.playTone(294, 0.15, "sawtooth", 0.1, 0.54);
        this.playTone(262, 0.4, "sawtooth", 0.12, 0.72);
        break;
      case "levelup":
        // Ascending happy arpeggio
        this.playTone(523, 0.08, "square", 0.1);
        this.playTone(659, 0.08, "square", 0.1, 0.08);
        this.playTone(784, 0.08, "square", 0.1, 0.16);
        this.playTone(1047, 0.2, "square", 0.14, 0.24);
        break;
    }
  }
}
