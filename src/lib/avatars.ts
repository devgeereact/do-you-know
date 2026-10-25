import { t } from '@/i18n';

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
  { id: 'fox', label: t.avatar.names.fox, emoji: '🦊', colour: 'bg-avatar-fox' },
  { id: 'owl', label: t.avatar.names.owl, emoji: '🦉', colour: 'bg-avatar-owl' },
  { id: 'panda', label: t.avatar.names.panda, emoji: '🐼', colour: 'bg-avatar-panda' },
  { id: 'lion', label: t.avatar.names.lion, emoji: '🦁', colour: 'bg-avatar-lion' },
  { id: 'frog', label: t.avatar.names.frog, emoji: '🐸', colour: 'bg-avatar-frog' },
  { id: 'octopus', label: t.avatar.names.octopus, emoji: '🐙', colour: 'bg-avatar-octopus' },
  { id: 'penguin', label: t.avatar.names.penguin, emoji: '🐧', colour: 'bg-avatar-penguin' },
  { id: 'unicorn', label: t.avatar.names.unicorn, emoji: '🦄', colour: 'bg-avatar-unicorn' },
  { id: 'dragon', label: t.avatar.names.dragon, emoji: '🐲', colour: 'bg-avatar-dragon' },
  { id: 'robot', label: t.avatar.names.robot, emoji: '🤖', colour: 'bg-avatar-robot' },
  { id: 'rocket', label: t.avatar.names.rocket, emoji: '🚀', colour: 'bg-avatar-rocket' },
  { id: 'star', label: t.avatar.names.star, emoji: '⭐', colour: 'bg-avatar-star' },
] as const;

export function findAvatar(id: string | null | undefined): PresetAvatar | null {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
