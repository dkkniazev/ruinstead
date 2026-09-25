export type AudioSettings = {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
};

export type AudioCue =
  | 'attack' | 'shot' | 'hit' | 'kill' | 'damage' | 'dash'
  | 'pickup' | 'ui' | 'reward' | 'chest' | 'level'
  | 'boss' | 'victory' | 'defeat';

const CUES: Record<AudioCue, [number, number, number, OscillatorType]> = {
  attack: [190, 105, 0.07, 'triangle'],
  shot: [510, 270, 0.09, 'sawtooth'],
  hit: [135, 66, 0.09, 'triangle'],
  kill: [220, 55, 0.17, 'triangle'],
  damage: [118, 45, 0.22, 'sawtooth'],
  dash: [390, 140, 0.13, 'triangle'],
  pickup: [490, 730, 0.12, 'sine'],
  ui: [530, 690, 0.045, 'sine'],
  reward: [470, 940, 0.25, 'sine'],
  chest: [310, 780, 0.29, 'triangle'],
  level: [380, 1050, 0.42, 'sine'],
  boss: [92, 55, 0.55, 'sawtooth'],
  victory: [440, 990, 0.48, 'sine'],
  defeat: [210, 68, 0.52, 'triangle'],
};

class GameAudio {
  settings: AudioSettings = { musicVolume: 0.35, sfxVolume: 0.65, muted: false };
  private context?: AudioContext;
  private musicTimer?: number;
  private musicStep = 0;
  private musicRoot = 164.81;
  private paused = false;
  private readonly lastPlayed = new Map<AudioCue, number>();

  configure(settings: AudioSettings): void {
    this.settings = {
      musicVolume: Math.max(0, Math.min(1, settings.musicVolume)),
      sfxVolume: Math.max(0, Math.min(1, settings.sfxVolume)),
      muted: Boolean(settings.muted),
    };
  }

  unlock(): void {
    if (!this.context) this.context = new AudioContext();
    if (this.context.state !== 'running') void this.context.resume();
    if (this.musicTimer === undefined) {
      this.musicTimer = window.setInterval(() => this.playMusicNote(), 1650);
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) void this.context?.suspend();
    else if (this.context) void this.context.resume();
  }

  setRegion(region: number): void {
    this.musicRoot = region >= 7 ? 110 : region === 4 || region === 8 ? 130.81 : region === 3 ? 146.83 : 164.81;
  }

  play(cue: AudioCue): void {
    if (this.settings.muted || this.paused || this.settings.sfxVolume <= 0) return;
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(cue) ?? -Infinity) < (cue === 'hit' ? 75 : 35)) return;
    this.lastPlayed.set(cue, now);
    const [from, to, duration, wave] = CUES[cue];
    this.tone(from, to, duration, wave, 0.048 * this.settings.sfxVolume);
    if (cue === 'level' || cue === 'victory' || cue === 'reward') {
      window.setTimeout(() => this.tone(from * 1.25, to * 1.25, duration * 0.8, 'sine', 0.03 * this.settings.sfxVolume), 105);
    }
  }

  private playMusicNote(): void {
    if (this.settings.muted || this.paused || this.settings.musicVolume <= 0 || this.context?.state !== 'running') return;
    const notes = [1, 1.5, 1.2, 1.5, 1.333, 1.5, 1.2, 1.125];
    const frequency = this.musicRoot * notes[this.musicStep++ % notes.length];
    this.tone(frequency, frequency * 0.998, 1.45, 'sine', 0.018 * this.settings.musicVolume);
    this.tone(frequency / 2, frequency / 2, 1.6, 'triangle', 0.009 * this.settings.musicVolume);
  }

  private tone(from: number, to: number, duration: number, wave: OscillatorType, volume: number): void {
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration);
    gain.gain.setValueAtTime(Math.max(0.0001, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}

export const gameAudio = new GameAudio();
