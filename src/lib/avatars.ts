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
  colour: string; // bg-avatar-* token class (light and dark values in src/index.css)
}

export const AVATARS: readonly PresetAvatar[] = [
  { id: 'fox', label: 'Fox', emoji: '🦊', colour: 'bg-avatar-fox' },
  { id: 'owl', label: 'Owl', emoji: '🦉', colour: 'bg-avatar-owl' },
  { id: 'panda', label: 'Panda', emoji: '🐼', colour: 'bg-avatar-panda' },
  { id: 'lion', label: 'Lion', emoji: '🦁', colour: 'bg-avatar-lion' },
  { id: 'frog', label: 'Frog', emoji: '🐸', colour: 'bg-avatar-frog' },
  { id: 'octopus', label: 'Octopus', emoji: '🐙', colour: 'bg-avatar-octopus' },
  { id: 'penguin', label: 'Penguin', emoji: '🐧', colour: 'bg-avatar-penguin' },
  { id: 'unicorn', label: 'Unicorn', emoji: '🦄', colour: 'bg-avatar-unicorn' },
  { id: 'dragon', label: 'Dragon', emoji: '🐲', colour: 'bg-avatar-dragon' },
  { id: 'robot', label: 'Robot', emoji: '🤖', colour: 'bg-avatar-robot' },
  { id: 'rocket', label: 'Rocket', emoji: '🚀', colour: 'bg-avatar-rocket' },
  { id: 'star', label: 'Star', emoji: '⭐', colour: 'bg-avatar-star' },
] as const;

export function findAvatar(id: string | null | undefined): PresetAvatar | null {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
