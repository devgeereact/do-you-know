/**
 * Preset avatars: a friendly character on a coloured circle. No uploads, no AI and
 * no faces of real people, so nothing personal or unsafe can appear on a board.
 * The server accepts only these ids (backend/src/Player.php AVATARS). Keep both lists
 * identical.
 */
export interface PresetAvatar {
  id: string;
  label: string;
  emoji: string;
  colour: string; // Tailwind background class
}

export const AVATARS: readonly PresetAvatar[] = [
  { id: 'fox', label: 'Fox', emoji: '🦊', colour: 'bg-orange-200' },
  { id: 'owl', label: 'Owl', emoji: '🦉', colour: 'bg-amber-200' },
  { id: 'panda', label: 'Panda', emoji: '🐼', colour: 'bg-slate-200' },
  { id: 'lion', label: 'Lion', emoji: '🦁', colour: 'bg-yellow-200' },
  { id: 'frog', label: 'Frog', emoji: '🐸', colour: 'bg-green-200' },
  { id: 'octopus', label: 'Octopus', emoji: '🐙', colour: 'bg-pink-200' },
  { id: 'penguin', label: 'Penguin', emoji: '🐧', colour: 'bg-sky-200' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄', colour: 'bg-purple-200' },
  { id: 'dragon', label: 'Dragon', emoji: '🐲', colour: 'bg-emerald-200' },
  { id: 'robot', label: 'Robot', emoji: '🤖', colour: 'bg-zinc-200' },
  { id: 'rocket', label: 'Rocket', emoji: '🚀', colour: 'bg-indigo-200' },
  { id: 'star', label: 'Star', emoji: '⭐', colour: 'bg-yellow-100' },
] as const;

export function findAvatar(id: string | null | undefined): PresetAvatar | null {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
