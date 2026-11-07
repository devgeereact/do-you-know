import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playCue, resetSoundForTests } from '@/lib/sound';

const made = { contexts: 0, oscillators: 0 };
class FakeAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  constructor() {
    made.contexts += 1;
  }
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createGain() {
    const gain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: (n: unknown) => n,
    };
    return gain;
  }
  createOscillator() {
    made.oscillators += 1;
    const o = {
      type: '',
      frequency: { value: 0 },
      connect: (n: unknown) => n,
      start: vi.fn(),
      stop: vi.fn(),
    };
    return o;
  }
}

beforeEach(() => {
  made.contexts = 0;
  made.oscillators = 0;
  resetSoundForTests();
  vi.stubGlobal('AudioContext', FakeAudioContext);
});
afterEach(() => vi.unstubAllGlobals());

describe('sound', () => {
  it('is silent and creates no audio at all while the switch is off', () => {
    playCue('right', false);
    playCue('done', false);
    expect(made).toEqual({ contexts: 0, oscillators: 0 });
  });

  it('plays one soft tone per note once the parent has turned it on', () => {
    playCue('right', true);
    expect(made.contexts).toBe(1);
    expect(made.oscillators).toBe(2);
    playCue('wrong', true);
    expect(made.contexts).toBe(1); // the context is shared
    expect(made.oscillators).toBe(3);
  });

  it('stays quiet, without an error, on a device with no Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(() => playCue('sticker', true)).not.toThrow();
    expect(made.oscillators).toBe(0);
  });

  it('survives an audio device that refuses to start', () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked');
        }
      },
    );
    expect(() => playCue('done', true)).not.toThrow();
  });
});
