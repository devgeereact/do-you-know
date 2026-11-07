import { useEffect, useState } from 'react';
import { Character } from '@/components/art/Art';
import { STICKER_ART } from '@/lib/stickers';
import { cn } from '@/lib/utils';
import { getMyLearn } from '@/services/profileService';
import type { LearnRecord } from '@/types/game';
import { t } from '@/i18n';

/** The stickers a child has earned while learning, and the ones still to find. Only a child has a book. */
export function StickerBook(): JSX.Element | null {
  const [record, setRecord] = useState<LearnRecord | null>(null);
  useEffect(() => {
    let active = true;
    getMyLearn()
      .then((r) => active && setRecord(r))
      .catch(() => undefined); // a guest has no record: the book simply does not show
    return () => {
      active = false;
    };
  }, []);
  if (!record) return null;
  return (
    <section aria-labelledby="sticker-book" className="grid gap-3">
      <div>
        <h2 id="sticker-book" className="text-2xl">
          {t.learn.stickerBook}
        </h2>
        <p className="text-content-muted">{t.learn.stickerBookLead}</p>
      </div>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {record.sticker_book.map((s) => (
          <li
            key={s.id}
            className={cn(
              'grid justify-items-center gap-1 rounded-2xl border border-surface-border bg-surface p-3 text-center',
              !s.earned && 'opacity-60',
            )}
          >
            <span aria-hidden="true" className={cn(!s.earned && 'grayscale')}>
              <Character name={STICKER_ART[s.id] ?? 'star'} size={56} />
            </span>
            <span className="text-sm font-medium">{s.label}</span>
            <span className="text-xs text-content-muted">
              {s.earned ? t.learn.stickerEarned : t.learn.stickerNotYet}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
