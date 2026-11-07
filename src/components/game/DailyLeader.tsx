import { useRef } from 'react';
import { AvatarBadge } from '@/components/AvatarBadge';
import { Crown } from '@/components/game/Crown';
import { gsap, useGSAP, REDUCED_MOTION } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { LeaderboardRow } from '@/types/game';
import { t } from '@/i18n';

interface DailyLeaderProps {
  /** Rank 1 on today's board, or undefined while nobody has scored. */
  leader: LeaderboardRow | undefined;
  /** Whether this player has finished today's challenge. */
  playedToday: boolean;
}

/**
 * Who wears the crown today: the top score, the leader's nickname and preset avatar, and a nudge
 * for everyone else. The crown gives a small pop whenever the leader or the top score changes.
 * Nickname, avatar and score only; nothing else about a player ever reaches this card.
 */
export function DailyLeader({ leader, playedToday }: DailyLeaderProps): JSX.Element {
  const root = useRef<HTMLElement>(null);
  const crowned = leader !== undefined && leader.correct > 0;
  const key = crowned ? `${leader.nickname}|${leader.correct}` : 'none';

  useGSAP(
    () => {
      if (!crowned) return;
      gsap.matchMedia().add(`not all and ${REDUCED_MOTION}`, () => {
        gsap.fromTo(
          '[data-crown-pop]',
          { scale: 0.6, rotate: -14 },
          { scale: 1, rotate: 0, duration: 0.55, ease: 'back.out(2.2)', overwrite: true },
        );
      });
    },
    { scope: root, dependencies: [key] },
  );

  return (
    <section
      ref={root}
      aria-label={t.daily.leaderTitle}
      className={cn(
        'flex items-center gap-3 rounded-2xl border-2 px-3 py-2.5 shadow-soft',
        crowned ? 'border-secondary bg-secondary/15' : 'border-surface-border bg-surface',
      )}
    >
      <span
        data-crown-pop
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-3xl"
      >
        <Crown className={cn('h-8 w-8', !crowned && 'opacity-40')} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-content-muted">{t.daily.leaderTitle}</p>
        {crowned ? (
          <>
            <p className="flex items-center gap-2">
              <AvatarBadge avatarId={leader.avatar_id} nickname={leader.nickname} size="xs" />
              <strong className="truncate">{leader.nickname}</strong>
              <span className="ml-auto shrink-0 font-display text-xl font-extrabold tabular-nums">
                {leader.correct}/{leader.total}
              </span>
            </p>
            <p className="truncate text-xs text-content-muted">
              {leader.is_me
                ? t.daily.leaderIsYou
                : playedToday
                  ? t.daily.chasePlayed(leader.nickname)
                  : t.daily.chaseUnplayed(leader.correct, leader.total)}
            </p>
          </>
        ) : (
          <p className="font-semibold">{t.daily.noLeader}</p>
        )}
      </div>
    </section>
  );
}
