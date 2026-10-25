/**
 * A picture and a pastel tile colour per category, so every subject is easy to spot.
 * Colours reuse the avatar pastel tokens (light and dark variants live in index.css).
 */
export interface CategoryStyle {
  emoji: string;
  tile: string;
}

const STYLES: Record<string, CategoryStyle> = {
  'general-knowledge': { emoji: '💡', tile: 'bg-avatar-star' },
  'science-nature': { emoji: '🔬', tile: 'bg-avatar-frog' },
  geography: { emoji: '🌍', tile: 'bg-avatar-penguin' },
  history: { emoji: '🏰', tile: 'bg-avatar-fox' },
  tech: { emoji: '💻', tile: 'bg-avatar-robot' },
  'bible-faith': { emoji: '📖', tile: 'bg-avatar-owl' },
  maths: { emoji: '➗', tile: 'bg-avatar-rocket' },
  'school-english': { emoji: '✏️', tile: 'bg-avatar-octopus' },
  'school-science': { emoji: '🧪', tile: 'bg-avatar-dragon' },
  'school-geography': { emoji: '🗺️', tile: 'bg-avatar-penguin' },
  'school-history': { emoji: '📜', tile: 'bg-avatar-lion' },
  'school-computing': { emoji: '🤖', tile: 'bg-avatar-unicorn' },
  // Older live slugs.
  animals: { emoji: '🐾', tile: 'bg-avatar-frog' },
};

const FALLBACK: CategoryStyle = { emoji: '❓', tile: 'bg-avatar-panda' };

export function categoryStyle(slug: string | undefined): CategoryStyle {
  return (slug && STYLES[slug]) || FALLBACK;
}
