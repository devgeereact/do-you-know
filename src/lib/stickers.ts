import type { CharacterKey } from '@/lib/art';

/** The sticker each id wears in the book. Keep the ids identical to backend/src/Learn.php STICKERS. */
export const STICKER_ART: Record<string, CharacterKey> = {
  'first-session': 'star',
  'area-literacy': 'owl',
  'area-numeracy': 'battery',
  'area-science': 'planet',
  'area-humanities': 'globe',
  perfect: 'heart',
  'step-up': 'rocket',
  comeback: 'turtle',
  'five-sessions': 'bulb',
};
