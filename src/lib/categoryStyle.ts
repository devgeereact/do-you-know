import { isWorld, type CharacterKey, type WorldKey } from '@/lib/art';

/**
 * A character, a home world and a pastel tile colour per subject, so every subject is easy to
 * spot. The world is also the scene for any question that has no scene of its own. Studio
 * subjects can override the character and world (categories.icon / categories.scene).
 */
export interface CategoryStyle {
  character: CharacterKey;
  world: WorldKey;
  tile: string;
}

const STYLES: Record<string, CategoryStyle> = {
  'general-knowledge': { character: 'globe', world: 'ocean', tile: 'bg-avatar-panda' },
  'science-nature': { character: 'bulb', world: 'jungle', tile: 'bg-avatar-frog' },
  geography: { character: 'cactus', world: 'desert', tile: 'bg-avatar-fox' },
  history: { character: 'owl', world: 'past', tile: 'bg-avatar-owl' },
  tech: { character: 'rocket', world: 'space', tile: 'bg-avatar-unicorn' },
  'bible-faith': { character: 'star', world: 'past', tile: 'bg-avatar-star' },
  maths: { character: 'battery', world: 'city', tile: 'bg-avatar-robot' },
  'school-english': { character: 'mug', world: 'past', tile: 'bg-avatar-fox' },
  'school-science': { character: 'heart', world: 'body', tile: 'bg-avatar-octopus' },
  'school-geography': { character: 'globe', world: 'desert', tile: 'bg-avatar-penguin' },
  'school-history': { character: 'owl', world: 'past', tile: 'bg-avatar-lion' },
  'school-computing': { character: 'rocket', world: 'space', tile: 'bg-avatar-unicorn' },
  // Older live slug.
  animals: { character: 'turtle', world: 'jungle', tile: 'bg-avatar-dragon' },
};

const FALLBACK: CategoryStyle = { character: 'star', world: 'ocean', tile: 'bg-avatar-panda' };

export function categoryStyle(
  slug: string | undefined,
  override?: { icon?: string | null; scene?: string | null },
): CategoryStyle {
  const base = (slug && STYLES[slug]) || FALLBACK;
  const world = isWorld(override?.scene) ? override.scene : base.world;
  return { ...base, world };
}
