import type { CharacterKey } from '@/lib/art';
import { t } from '@/i18n';

/**
 * Preset avatars: one of the Do You Know object characters on a soft circle. No uploads, no AI
 * and no faces of real people, so nothing personal or unsafe can appear on a board.
 * The server accepts only these ids (backend/src/Player.php AVATARS). Keep both lists
 * identical. The ids are older animal names; what players see is the character and its label.
 */
export interface PresetAvatar {
  id: string;
  label: string;
  character: CharacterKey;
  colour: string; // bg-avatar-* token class (light and dark values in src/index.css)
}

export const AVATARS: readonly PresetAvatar[] = [
  { id: 'fox', label: t.avatar.names.fox, character: 'mug', colour: 'bg-avatar-fox' },
  { id: 'owl', label: t.avatar.names.owl, character: 'owl', colour: 'bg-avatar-owl' },
  { id: 'panda', label: t.avatar.names.panda, character: 'globe', colour: 'bg-avatar-panda' },
  { id: 'lion', label: t.avatar.names.lion, character: 'bulb', colour: 'bg-avatar-lion' },
  { id: 'frog', label: t.avatar.names.frog, character: 'cactus', colour: 'bg-avatar-frog' },
  { id: 'octopus', label: t.avatar.names.octopus, character: 'heart', colour: 'bg-avatar-octopus' },
  {
    id: 'penguin',
    label: t.avatar.names.penguin,
    character: 'penguin',
    colour: 'bg-avatar-penguin',
  },
  {
    id: 'unicorn',
    label: t.avatar.names.unicorn,
    character: 'planet',
    colour: 'bg-avatar-unicorn',
  },
  { id: 'dragon', label: t.avatar.names.dragon, character: 'turtle', colour: 'bg-avatar-dragon' },
  { id: 'robot', label: t.avatar.names.robot, character: 'battery', colour: 'bg-avatar-robot' },
  { id: 'rocket', label: t.avatar.names.rocket, character: 'rocket', colour: 'bg-avatar-rocket' },
  { id: 'star', label: t.avatar.names.star, character: 'star', colour: 'bg-avatar-star' },
] as const;

export function findAvatar(id: string | null | undefined): PresetAvatar | null {
  return AVATARS.find((avatar) => avatar.id === id) ?? null;
}
