import { useEffect } from 'react';
import { pickVoice, useHasVoice } from '@/hooks/useHasVoice';
import { t } from '@/i18n';

interface ReadAloudProps {
  /** What to say. Never an answer the child has not given (dictation says its word on purpose). */
  text: string;
  /** Accessible name; defaults to "Read it aloud". */
  label?: string;
  /** Visible words on the button. */
  children?: string;
  className?: string;
}

/**
 * A speaker button using the device's own British voice (the Web Speech API). It is not shown when the
 * device has no English voice. Sound only starts when the child taps it.
 */
export function ReadAloud({
  text,
  label,
  children,
  className,
}: ReadAloudProps): JSX.Element | null {
  const has = useHasVoice();
  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window)
        window.speechSynthesis.cancel();
    },
    [text],
  );
  if (!has) return null;
  const say = (): void => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    synth.speak(utterance);
  };
  return (
    <button
      type="button"
      onClick={say}
      aria-label={label ?? t.play.readAloud.label}
      className={className ?? 'stage-pill min-h-tap gap-2 px-4'}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5 fill-none stroke-current"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </svg>
      {children ?? t.play.readAloud.button}
    </button>
  );
}
