import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { SWITCHES_OFF } from '@/hooks/useSwitches';
import { getSwitches, setSwitch, type GetToken } from '@/services/parentService';
import type { ParentSwitches } from '@/types';
import { t } from '@/i18n';

const copy = t.grownUps.switches;
const ORDER: (keyof ParentSwitches)[] = [
  'public_boards',
  'challenge_friend',
  'beat_clock',
  'slider_questions',
  'trivia_sets',
  'sound',
  'easy_read',
];

/** The seven switches. Each one saves as soon as it is tapped; all start off. */
export function SwitchesPanel({ getToken }: { getToken: GetToken }): JSX.Element {
  const [switches, setSwitches] = useState<ParentSwitches | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getSwitches(getToken)
      .then((s) => active && setSwitches({ ...SWITCHES_OFF, ...s }))
      .catch(() => active && (setError(true), setSwitches(SWITCHES_OFF)));
    return () => {
      active = false;
    };
  }, [getToken]);

  if (switches === null) return <p role="status">{t.grownUps.loading}</p>;

  async function flip(key: keyof ParentSwitches, value: boolean): Promise<void> {
    setError(false);
    setSwitches((s) => (s ? { ...s, [key]: value } : s)); // shown at once, undone if it fails
    try {
      setSwitches(await setSwitch(getToken, key, value));
    } catch {
      setSwitches((s) => (s ? { ...s, [key]: !value } : s));
      setError(true);
    }
  }

  return (
    <Card as="section" aria-label={t.grownUps.tabs.switches} className="grid gap-4">
      <p className="text-content-muted">{copy.lead}</p>
      {error && (
        <p role="alert" className="font-semibold text-wrong">
          {copy.failed}
        </p>
      )}
      <ul className="grid gap-3">
        {ORDER.map((key) => (
          <li key={key}>
            <label className="flex min-h-tap items-start gap-3 rounded-xl border border-surface-border p-3">
              <input
                type="checkbox"
                role="switch"
                className="mt-1 h-6 w-6 shrink-0 accent-primary"
                checked={switches[key]}
                onChange={(e) => void flip(key, e.target.checked)}
              />
              <span className="grid gap-0.5">
                <span className="font-bold">{copy.items[key].label}</span>
                <span className="text-sm text-content-muted">{copy.items[key].body}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
