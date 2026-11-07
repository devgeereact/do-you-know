import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadAloud } from '@/components/game/ReadAloud';

type Voice = { lang: string; name: string };
const speak = vi.fn();
const cancel = vi.fn();
let voices: Voice[] = [];

beforeEach(() => {
  voices = [];
  speak.mockReset();
  cancel.mockReset();
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    speak,
    cancel,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: globalThis.speechSynthesis,
  });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      lang = '';
      voice: Voice | null = null;
      rate = 1;
      constructor(public text: string) {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('ReadAloud', () => {
  it('is not shown when the device has no English voice', () => {
    voices = [{ lang: 'fr-FR', name: 'Amelie' }];
    render(<ReadAloud text="Hello" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is not shown when the browser cannot speak at all', () => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
    render(<ReadAloud text="Hello" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('speaks the text with the British voice when tapped', async () => {
    voices = [
      { lang: 'en-US', name: 'Samantha' },
      { lang: 'en-GB', name: 'Daniel' },
    ];
    render(<ReadAloud text="What is a noun?" />);
    await userEvent.click(screen.getByRole('button', { name: 'Read it aloud' }));
    expect(speak).toHaveBeenCalledTimes(1);
    const said = speak.mock.calls[0]?.[0] as { text: string; lang: string; voice: Voice };
    expect(said.text).toBe('What is a noun?');
    expect(said.lang).toBe('en-GB');
    expect(said.voice.name).toBe('Daniel');
  });

  it('falls back to any English voice', async () => {
    voices = [{ lang: 'en-AU', name: 'Karen' }];
    render(<ReadAloud text="Hi" />);
    await userEvent.click(screen.getByRole('button'));
    expect((speak.mock.calls[0]?.[0] as { voice: Voice }).voice.name).toBe('Karen');
  });

  it('says nothing until it is tapped, and stops when the question goes', () => {
    voices = [{ lang: 'en-GB', name: 'Daniel' }];
    const { unmount } = render(<ReadAloud text="Hi" />);
    expect(speak).not.toHaveBeenCalled();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
