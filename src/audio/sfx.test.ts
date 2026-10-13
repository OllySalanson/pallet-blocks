import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Sfx } from './sfx';

/** Just enough of a Web Audio graph to tell which voices can still be heard. */
class FakeNode {
  readonly outputs = new Set<FakeNode>();
  readonly gain = {
    value: 1,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
  };
  readonly frequency = { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
  type = '';
  buffer: unknown = null;
  connect(node: FakeNode): void {
    this.outputs.add(node);
  }
  disconnect(): void {
    this.outputs.clear();
  }
  start(): void {}
  stop(): void {}
}

class FakeContext {
  static last: FakeContext | null = null;
  readonly state = 'running';
  readonly currentTime = 0;
  readonly sampleRate = 8000;
  readonly destination = new FakeNode();
  readonly sources: FakeNode[] = [];
  constructor() {
    FakeContext.last = this;
  }
  createGain(): FakeNode {
    return new FakeNode();
  }
  createOscillator(): FakeNode {
    const node = new FakeNode();
    this.sources.push(node);
    return node;
  }
  createBufferSource(): FakeNode {
    const node = new FakeNode();
    this.sources.push(node);
    return node;
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}

function reaches(node: FakeNode, target: FakeNode): boolean {
  return node === target || [...node.outputs].some((next) => reaches(next, target));
}

/** The sources started so far that are still wired to the speakers. */
function audible(ctx: FakeContext): FakeNode[] {
  return ctx.sources.filter((source) => reaches(source, ctx.destination));
}

describe('sound', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { AudioContext: FakeContext });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muting cuts a jingle that is still playing', () => {
    const sfx = new Sfx();
    sfx.unlock();
    const ctx = FakeContext.last!;
    sfx.play('gameOver');
    sfx.play('hardDrop');
    expect(audible(ctx).length).toBeGreaterThan(0);

    sfx.muted = true;
    expect(audible(ctx)).toEqual([]);
    sfx.play('lock');
    expect(audible(ctx)).toEqual([]);
  });

  it('plays again once sound is back on, without bringing back what was cut', () => {
    const sfx = new Sfx();
    sfx.unlock();
    const ctx = FakeContext.last!;
    sfx.play('levelUp', 0.32);
    const cut = [...ctx.sources];
    sfx.muted = true;
    sfx.muted = false;
    sfx.play('menuSelect');
    const heard = audible(ctx);
    expect(heard.length).toBeGreaterThan(0);
    expect(heard.some((source) => cut.includes(source))).toBe(false);
  });
});
