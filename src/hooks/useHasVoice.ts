import { useEffect, useState } from 'react';

/** The device's own voice, preferring British English. Nothing leaves the device. */
export function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'en-GB') ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en-gb')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
    null
  );
}

/** True once the device has an English voice. Voices can arrive after the page loads. */
export function useHasVoice(): boolean {
  const [has, setHas] = useState(() => pickVoice() !== null);
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    const update = (): void => setHas(pickVoice() !== null);
    update();
    synth.addEventListener?.('voiceschanged', update);
    return () => synth.removeEventListener?.('voiceschanged', update);
  }, []);
  return has;
}
