import type { ReactNode } from 'react';
import { Character, WorldBackdrop } from '@/components/art/Art';
import type { CharacterKey } from '@/lib/art';
import { world as worldOf } from '@/lib/worlds';
import type { WorldKey } from '@/lib/art';
import { cn } from '@/lib/utils';

/** A wide banner in a subject's world: its character beside the page title. */
export function WorldBanner({
  world,
  character,
  kicker,
  title,
  aside,
  className,
}: {
  world: WorldKey;
  character: CharacterKey;
  kicker?: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
  className?: string;
}): JSX.Element {
  const dark = worldOf(world).dark;
  return (
    <div
      className={cn(
        'relative isolate flex min-h-[9.5rem] items-end overflow-hidden rounded-[1.75rem] p-5 lg:min-h-[11rem] lg:p-7',
        className,
      )}
    >
      <WorldBackdrop world={world} className="-z-10" />
      <div className="flex w-full flex-wrap items-end gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.4rem] bg-white/90 shadow-lift lg:h-24 lg:w-24">
          <Character name={character} size={72} />
        </span>
        <div className="min-w-0 flex-1 text-white [text-shadow:0_2px_0_rgb(0_0_0/0.25)]">
          {kicker && <div className="text-sm font-bold opacity-90">{kicker}</div>}
          <h1 className={cn('text-[2rem] leading-tight lg:text-[2.6rem]', dark && 'text-white')}>
            {title}
          </h1>
        </div>
        {aside}
      </div>
    </div>
  );
}
