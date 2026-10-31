import { memo } from 'react';
import {
  CHARACTER_ART,
  WORLD_GLYPHS,
  sceneArt,
  worldBg,
  type CharacterKey,
  type Mood,
  type WorldKey,
} from '@/lib/art';
import { cn } from '@/lib/utils';

// The markup comes from src/lib/art.ts: fixed brand artwork with no user input.

/** One of the object characters (owl, globe, planet …). Decorative unless a label is given. */
export const Character = memo(function Character({
  name,
  size = 64,
  mood = 'happy',
  label,
  className,
}: {
  name: CharacterKey;
  size?: number;
  mood?: Mood;
  label?: string;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: CHARACTER_ART[name](mood) }}
    />
  );
});

/** Small single-colour world icon that follows the text colour. */
export function WorldGlyph({
  world,
  size = 16,
  className,
}: {
  world: WorldKey;
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: WORLD_GLYPHS[world] }}
    />
  );
}

/** The ground band of a question scene; fills its positioned parent from the bottom. */
export const Scene = memo(function Scene({
  world,
  className,
}: {
  world: WorldKey;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 800 420"
      preserveAspectRatio="xMidYMax slice"
      className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-full w-full', className)}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: sceneArt(world) }}
    />
  );
});

/** Full-bleed illustrated world; fills its positioned parent. */
export const WorldBackdrop = memo(function WorldBackdrop({
  world,
  className,
}: {
  world: WorldKey;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={cn('pointer-events-none absolute inset-0 h-full w-full max-w-none', className)}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: worldBg(world) }}
    />
  );
});
