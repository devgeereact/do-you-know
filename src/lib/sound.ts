/**
 * Gentle sound, made on the device with Web Audio: no audio files, nothing downloaded, nothing sent anywhere.
 * It is silent unless a parent turned the "Sound" switch on, and no audio context is even created until the
 * first cue is asked for with the switch on. Notes are soft sine tones at a low volume.
 */
export type Cue = 'right' | 'wrong' | 'done' | 'sticker';

/** [frequency in Hz, start in seconds, length in seconds] */
const NOTES: Record<Cue, [number, number, number][]> = {
  right: [
    [659, 0, 0.12],
    [880, 0.1, 0.2],
  ],
  wrong: [[294, 0, 0.28]],
  done: [
    [523, 0, 0.12],
    [659, 0.12, 0.12],
    [784, 0.24, 0.3],
  ],
  sticker: [
    [784, 0, 0.1],
    [988, 0.1, 0.1],
    [1175, 0.2, 0.35],
  ],
};

const VOLUME = 0.07;
let context: AudioContext | null = null;

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

/** Plays a cue when sound is on. Never throws: a device without Web Audio just stays quiet. */
export function playCue(cue: Cue, enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    if (context.state === 'suspended') void context.resume();
    const now = context.currentTime;
    for (const [frequency, start, length] of NOTES[cue]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(VOLUME, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + length);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + start);
      oscillator.stop(now + start + length + 0.05);
    }
  } catch {
    /* Sound is a nicety; a blocked or missing audio device is not an error. */
  }
}

/** For tests: forget the shared audio context. */
export function resetSoundForTests(): void {
  context = null;
}
