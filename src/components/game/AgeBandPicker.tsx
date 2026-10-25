import { useId } from 'react';
import { Button } from '@/components/ui/Button';
import type { AgeBand } from '@/types';
import { t } from '@/i18n';

const BANDS: { band: AgeBand; label: string }[] = [
  { band: 'under_13', label: t.common.ageBands.under_13 },
  { band: '13_17', label: t.common.ageBands['13_17'] },
  { band: '18_plus', label: t.common.ageBands['18_plus'] },
];

interface AgeBandPickerProps {
  busy: boolean;
  error: string | null;
  onPick: (band: AgeBand) => void;
}

/** Asked once; the server locks it. An age group only, never a birthday. */
export function AgeBandPicker({ busy, error, onPick }: AgeBandPickerProps): JSX.Element {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="text-center">
      <h2 id={headingId} className="text-xl font-semibold text-content">
        {t.me.ageBand.title}
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-content-muted">{t.me.ageBand.body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {BANDS.map(({ band, label }) => (
          <Button key={band} variant="ghost" disabled={busy} onClick={() => onPick(band)}>
            {label}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-content">
          {error}
        </p>
      )}
    </section>
  );
}
