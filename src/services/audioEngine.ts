import { SoundPreset, Judgment } from '../types/game';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private cueVol: number = 0.85;
  private tapVol: number = 0.95;
  private currentPreset: SoundPreset = 'woodblock';

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public getAudioContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public getCurrentTime(): number {
    this.initContext();
    return this.ctx!.currentTime;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
    }
  }

  public setVolumes(cue: number, tap: number) {
    this.cueVol = Math.max(0, Math.min(1, cue));
    this.tapVol = Math.max(0, Math.min(1, tap));
  }

  public setPreset(preset: SoundPreset) {
    this.currentPreset = preset;
  }

  /**
   * Play metronome cue tick at exact audioContext timestamp
   * @param time When to play (currentTime if immediate)
   * @param isDownbeat First beat accent
   * @param pan Stereo pan (-1 left, 1 right, 0 center)
   */
  public playMetronomeTick(time?: number, isDownbeat: boolean = false, pan: number = 0) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = time !== undefined ? time : this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, t);
      panner.connect(this.masterGain);
    }
    const destNode = panner || this.masterGain;

    switch (this.currentPreset) {
      case 'woodblock':
        this.synthWoodblock(t, isDownbeat, destNode, this.cueVol);
        break;
      case 'electronic':
        this.synthElectronic(t, isDownbeat, destNode, this.cueVol);
        break;
      case 'cowbell':
        this.synthCowbell(t, isDownbeat, destNode, this.cueVol);
        break;
      case 'rimshot':
        this.synthRimshot(t, isDownbeat, destNode, this.cueVol);
        break;
    }
  }

  /**
   * Play user tap feedback sound
   */
  public playUserTap(judgment: Judgment = 'PERFECT', pan: number = 0, time?: number) {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const t = time !== undefined ? time : this.ctx.currentTime;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.setValueAtTime(pan, t);
      panner.connect(this.masterGain);
    }
    const dest = panner || this.masterGain;

    const gain = this.ctx.createGain();
    gain.connect(dest);

    // Dynamic pitch according to judgment
    let baseFreq = 520;
    if (judgment === 'PERFECT') baseFreq = 660;
    else if (judgment === 'GREAT') baseFreq = 580;
    else if (judgment === 'GOOD') baseFreq = 480;
    else if (judgment === 'MISS') baseFreq = 220;

    const osc = this.ctx.createOscillator();
    osc.type = judgment === 'PERFECT' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

    const hitVol = (judgment === 'MISS' ? 0.4 : 0.8) * this.tapVol;
    gain.gain.setValueAtTime(hitVol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    // Add high transient click for tactile feel
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'sine';
    clickOsc.frequency.setValueAtTime(2400, t);
    clickGain.gain.setValueAtTime(0.25 * this.tapVol, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    clickOsc.connect(clickGain);
    clickGain.connect(dest);

    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 0.1);
    clickOsc.start(t);
    clickOsc.stop(t + 0.02);
  }

  // --- Procedural Synths ---

  private synthWoodblock(t: number, isAccent: boolean, dest: AudioNode, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isAccent ? 1180 : 840;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.65, t + 0.04);

    const amp = (isAccent ? 0.9 : 0.65) * vol;
    gain.gain.setValueAtTime(amp, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  private synthElectronic(t: number, isAccent: boolean, dest: AudioNode, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isAccent ? 980 : 620;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

    gain.gain.setValueAtTime((isAccent ? 0.8 : 0.55) * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.065);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  private synthCowbell(t: number, isAccent: boolean, dest: AudioNode, vol: number) {
    if (!this.ctx) return;
    // 808 cowbell signature dual square
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    const mult = isAccent ? 1.2 : 1.0;
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(587 * mult, t);
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(845 * mult, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800 * mult, t);
    filter.Q.setValueAtTime(3.5, t);

    gain.gain.setValueAtTime(0.5 * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.085);
    osc2.stop(t + 0.085);
  }

  private synthRimshot(t: number, isAccent: boolean, dest: AudioNode, vol: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = isAccent ? 1720 : 1380;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.025);

    gain.gain.setValueAtTime((isAccent ? 0.75 : 0.5) * vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  /**
   * Play a celebratory victory chord
   */
  public playVictoryFanfare() {
    this.initContext();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major
    const now = this.ctx.currentTime;

    chords.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  }

  /**
   * Replay session audio: Metronome ticks panned Left (-0.75), User taps panned Right (+0.75)
   * This gives an instant auditory diagnostic of human vs machine clock!
   */
  public replaySession(
    expectedTimesMs: number[],
    actualTaps: { timeMs: number; judgment: Judgment }[],
    onProgress?: (progressMs: number, totalDurationMs: number) => void,
    onEnded?: () => void
  ): () => void {
    this.initContext();
    if (!this.ctx) return () => {};

    if (expectedTimesMs.length === 0) {
      if (onEnded) onEnded();
      return () => {};
    }

    const firstTime = Math.min(
      expectedTimesMs[0],
      actualTaps[0] ? actualTaps[0].timeMs : expectedTimesMs[0]
    );
    const lastExpected = expectedTimesMs[expectedTimesMs.length - 1];
    const lastActual = actualTaps.length > 0 ? actualTaps[actualTaps.length - 1].timeMs : 0;
    const totalDurationMs = Math.max(lastExpected, lastActual) - firstTime + 600;

    const startTime = this.ctx.currentTime + 0.15; // Lead-in margin

    // Schedule expected beats (Left channel)
    expectedTimesMs.forEach((timeMs, idx) => {
      const offsetSec = (timeMs - firstTime) / 1000;
      const playAt = startTime + offsetSec;
      this.playMetronomeTick(playAt, idx === 0, -0.75);
    });

    // Schedule actual user taps (Right channel)
    actualTaps.forEach((tap) => {
      const offsetSec = (tap.timeMs - firstTime) / 1000;
      const playAt = startTime + offsetSec;
      this.playUserTap(tap.judgment, 0.75, playAt);
    });

    // Progress timer
    const playbackStartReal = performance.now() + 150;
    let animId: number;

    const step = () => {
      const elapsedMs = performance.now() - playbackStartReal;
      if (elapsedMs < totalDurationMs) {
        if (onProgress) onProgress(Math.max(0, elapsedMs), totalDurationMs);
        animId = requestAnimationFrame(step);
      } else {
        if (onProgress) onProgress(totalDurationMs, totalDurationMs);
        if (onEnded) onEnded();
      }
    };
    animId = requestAnimationFrame(step);

    // Return cleanup/stop function
    return () => {
      cancelAnimationFrame(animId);
    };
  }
}

export const audioEngine = new AudioEngine();
