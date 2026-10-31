import { Character } from '@/components/art/Art';
import { findAvatar } from '@/lib/avatars';
import { cn } from '@/lib/utils';

interface AvatarBadgeProps {
  avatarId: string | null | undefined;
  nickname?: string | null; // first letter is the fallback when no avatar is chosen
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string; // accessible name; decorative when omitted
}

const SIZES = {
  xs: 'h-8 w-8 text-base',
  sm: 'h-10 w-10 text-xl',
  md: 'h-16 w-16 text-3xl',
  lg: 'h-24 w-24 text-5xl',
} as const;
const ART = { xs: 28, sm: 34, md: 54, lg: 82 } as const;

/** A preset avatar, or the nickname's first letter when none is chosen. */
export function AvatarBadge({
  avatarId,
  nickname,
  size = 'sm',
  label,
}: AvatarBadgeProps): JSX.Element {
  const avatar = findAvatar(avatarId);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-display font-semibold',
        SIZES[size],
        avatar ? avatar.colour : 'bg-sky/30 text-primary',
      )}
    >
      {avatar ? (
        <Character name={avatar.character} size={ART[size]} />
      ) : (
        (nickname?.charAt(0).toUpperCase() ?? '?')
      )}
    </span>
  );
}
