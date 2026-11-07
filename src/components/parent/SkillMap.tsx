import { useEffect, useState } from 'react';
import { areaName, LEARN_AREAS } from '@/lib/learnAreas';
import { cn } from '@/lib/utils';
import { getChildSkills, type GetToken } from '@/services/parentService';
import type { LearnRecord } from '@/types/game';
import { t } from '@/i18n';

const copy = t.grownUps.children;

/**
 * What a child has learned so far: a step from 1 to 5 in each area, how many sessions, and where to practise
 * next. Counts and steps only: a parent never sees which question was missed.
 */
export function SkillMap({
  getToken,
  childId,
}: {
  getToken: GetToken;
  childId: string;
}): JSX.Element | null {
  const [record, setRecord] = useState<LearnRecord | null>(null);
  useEffect(() => {
    let active = true;
    getChildSkills(getToken, childId)
      .then((r) => active && setRecord(r))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [getToken, childId]);
  if (!record) return null;
  return (
    <section aria-label={copy.skillsTitle} className="grid gap-2 rounded-xl bg-background p-3">
      <h4 className="text-sm text-content-muted">{copy.skillsTitle}</h4>
      <ul className="grid gap-2">
        {LEARN_AREAS.map((a) => {
          const row = record.areas.find((r) => r.area === a.id);
          const step = row?.step ?? 2;
          const sessions = row?.sessions ?? 0;
          return (
            <li
              key={a.id}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2 text-sm"
            >
              <span className="font-medium">{a.name}</span>
              <span className="grid gap-1">
                <span
                  role="img"
                  aria-label={
                    sessions ? `${copy.step(step)}, ${copy.sessions(sessions)}` : copy.noSessions
                  }
                  className="flex gap-1"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      aria-hidden="true"
                      className={cn(
                        'h-2 flex-1 rounded-full',
                        sessions && n <= step ? 'bg-primary' : 'bg-surface-border',
                      )}
                    />
                  ))}
                </span>
                <span className="text-xs text-content-muted">
                  {sessions ? `${copy.step(step)} · ${copy.sessions(sessions)}` : copy.noSessions}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-sm">{copy.practiseNext(areaName(record.next_area))}</p>
      <p className="text-xs text-content-muted">
        {copy.stickersEarned(record.stickers.length, record.sticker_book.length)}
      </p>
    </section>
  );
}
