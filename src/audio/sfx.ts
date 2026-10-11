/**
 * Sound effects, synthesised in the browser with Web Audio: square and
 * triangle voices and a little noise, the palette of a handheld's sound chip.
 * There are no audio files and no music.
 *
 * Browsers only let a page make sound after the player has done something, so
 * the audio context is created on the first key press (`unlock`). Until then,
 * and whenever Web Audio is missing, every call is a silent no-op.
 */

export type SoundName =
  | 'move'
  | 'rotate'
  | 'softDrop'
  | 'hardDrop'
  | 'lock'
  | 'hold'
  | 'clear1'
  | 'clear2'
  | 'clear3'
  | 'clear4'
  | 'spin'
  | 'allClear'
  | 'levelUp'
  | 'gameOver'
  | 'menuMove'
  | 'menuSelect'
  | 'pause'
  | 'ready'
  | 'go'
  | 'type';

const MASTER_VOLUME = 0.16;

interface Note {
  /** Seconds after the sound starts. */
  readonly at: number;
  readonly freq: number;
  readonly dur: number;
  readonly type?: OscillatorType;
  readonly vol?: number;
  /** Slide to this frequency over the note. */
  readonly to?: number;
}

/** Equal-tempered pitch of a MIDI note number. */
const midi = (note: number): number => 440 * Math.pow(2, (note - 69) / 12);

const arpeggio = (
  notes: readonly number[],
  step: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.5,
) => notes.map((note, i): Note => ({ at: i * step, freq: midi(note), dur, type, vol }));

const SOUNDS: Readonly<Record<SoundName, { readonly notes: readonly Note[]; readonly noise?: number }>> = {
  move: { notes: [{ at: 0, freq: 1320, dur: 0.018, vol: 0.18 }] },
  rotate: { notes: [{ at: 0, freq: 740, to: 1180, dur: 0.045, vol: 0.22 }] },
  softDrop: { notes: [{ at: 0, freq: 300, dur: 0.012, type: 'triangle', vol: 0.25 }] },
  hardDrop: {
    notes: [{ at: 0, freq: 220, to: 70, dur: 0.11, type: 'square', vol: 0.4 }],
    noise: 0.06,
  },
  lock: { notes: [{ at: 0, freq: 196, dur: 0.05, type: 'triangle', vol: 0.55 }] },
  hold: { notes: arpeggio([76, 83], 0.045, 0.05, 'square', 0.25) },
  clear1: { notes: arpeggio([72, 79], 0.06, 0.08) },
  clear2: { notes: arpeggio([72, 76, 79], 0.055, 0.08) },
  clear3: { notes: arpeggio([72, 76, 79, 84], 0.05, 0.08) },
  clear4: {
    notes: [
      ...arpeggio([72, 76, 79, 84, 88, 91], 0.045, 0.09),
      ...arpeggio([60, 67], 0.09, 0.14, 'triangle', 0.6),
    ],
  },
  spin: { notes: [{ at: 0, freq: 600, to: 2400, dur: 0.16, vol: 0.25 }] },
  allClear: { notes: arpeggio([84, 88, 91, 96, 91, 96], 0.07, 0.1) },
  levelUp: { notes: arpeggio([67, 72, 76, 79, 84], 0.07, 0.1, 'square', 0.4) },
  gameOver: {
    notes: [
      ...arpeggio([72, 67, 64, 60, 55], 0.16, 0.18, 'square', 0.4),
      { at: 0.8, freq: midi(48), dur: 0.5, type: 'triangle', vol: 0.6 },
    ],
  },
  menuMove: { notes: [{ at: 0, freq: 990, dur: 0.03, vol: 0.2 }] },
  menuSelect: { notes: arpeggio([79, 84], 0.05, 0.07, 'square', 0.3) },
  pause: { notes: arpeggio([79, 72], 0.06, 0.07, 'square', 0.3) },
  ready: { notes: [{ at: 0, freq: midi(72), dur: 0.1, vol: 0.35 }] },
  go: { notes: [{ at: 0, freq: midi(84), dur: 0.18, vol: 0.35 }] },
  type: { notes: [{ at: 0, freq: 1500, dur: 0.02, vol: 0.15 }] },
};

export class Sfx {
  muted: boolean;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(muted = false) {
    this.muted = muted;
  }

  /** Creates (or resumes) the audio context. Call from a user gesture. */
  unlock(): void {
    try {
      if (!this.context) {
        const Context =
          window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Context) {
          return;
        }
        this.context = new Context();
        this.master = this.context.createGain();
        this.master.gain.value = MASTER_VOLUME;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        void this.context.resume();
      }
    } catch {
      this.context = null;
    }
  }

  play(name: SoundName): void {
    const ctx = this.context;
    const master = this.master;
    if (this.muted || !ctx || !master || ctx.state !== 'running') {
      return;
    }
    const sound = SOUNDS[name];
    const start = ctx.currentTime + 0.005;
    for (const note of sound.notes) {
      this.tone(ctx, master, start, note);
    }
    if (sound.noise) {
      this.noise(ctx, master, start, sound.noise);
    }
  }

  close(): void {
    void this.context?.close();
    this.context = null;
    this.master = null;
  }

  private tone(ctx: AudioContext, out: AudioNode, start: number, note: Note): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = start + note.at;
    const t1 = t0 + note.dur;
    osc.type = note.type ?? 'square';
    osc.frequency.setValueAtTime(note.freq, t0);
    if (note.to) {
      osc.frequency.exponentialRampToValueAtTime(note.to, t1);
    }
    const vol = note.vol ?? 0.5;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.004);
    gain.gain.setValueAtTime(vol, Math.max(t0 + 0.004, t1 - 0.02));
    gain.gain.linearRampToValueAtTime(0, t1);
    osc.connect(gain);
    gain.connect(out);
    osc.start(t0);
    osc.stop(t1 + 0.01);
  }

  private noise(ctx: AudioContext, out: AudioNode, start: number, dur: number): void {
    if (!this.noiseBuffer) {
      const length = Math.floor(ctx.sampleRate * 0.25);
      this.noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    source.connect(gain);
    gain.connect(out);
    source.start(start);
    source.stop(start + dur + 0.01);
  }
}
