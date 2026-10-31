import { WORLD_BG, WORLD_KEYS, isWorld, type CharacterKey, type WorldKey } from '@/lib/art';
import { t } from '@/i18n';

/**
 * The eight worlds a question can live in. Each has a host character, the sky colours of
 * the question scene and the frame colours of the game card. Scenes are cosmetic: they come
 * with the question from the server and never say anything about the answer.
 */
export interface World {
  key: WorldKey;
  name: string;
  host: CharacterKey;
  skyTop: string;
  skyBottom: string;
  /** Light text on a dark sky (Space). */
  dark: boolean;
}

const WORLDS: Record<WorldKey, Omit<World, 'key' | 'name'>> = {
  ocean: { host: 'globe', skyTop: '#CFF1FF', skyBottom: '#8FD6F2', dark: false },
  space: { host: 'planet', skyTop: '#2B2466', skyBottom: '#6C4CF5', dark: true },
  jungle: { host: 'turtle', skyTop: '#E2F7DA', skyBottom: '#A9E2A0', dark: false },
  desert: { host: 'cactus', skyTop: '#FFE9C7', skyBottom: '#FFC98A', dark: false },
  arctic: { host: 'penguin', skyTop: '#EAF6FF', skyBottom: '#BFE3F7', dark: false },
  body: { host: 'heart', skyTop: '#FFE4EC', skyBottom: '#FFB8CC', dark: false },
  past: { host: 'owl', skyTop: '#FFF1D6', skyBottom: '#F2D39A', dark: false },
  city: { host: 'battery', skyTop: '#EEEAFE', skyBottom: '#C9C0FB', dark: false },
};

export function world(key: WorldKey): World {
  return { key, name: t.worlds[key], ...WORLDS[key] };
}

/** A small, stable number from a string (FNV-1a), for picking a fallback world. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The question's own scene, or a steady fallback chosen from its id. */
export function worldFor(
  question: { id: string; scene?: string | null },
  fallback?: WorldKey,
): World {
  if (isWorld(question.scene)) return world(question.scene);
  if (fallback) return world(fallback);
  return world(WORLD_KEYS[hash(question.id) % WORLD_KEYS.length] as WorldKey);
}

/** CSS custom properties for a framed card in this world. */
export function frameStyle(w: World): Record<string, string> {
  const c = WORLD_BG[w.key];
  return { '--fc': c.frame, '--fd': c.a, '--sky-top': w.skyTop, '--sky-bot': w.skyBottom };
}
