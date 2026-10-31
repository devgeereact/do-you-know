import { Link } from 'react-router-dom';
import { InfoShell } from '@/components/InfoPage';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types';
import { t } from '@/i18n';

const THEMES: { mode: ThemeMode; label: string; hint: string }[] = [
  { mode: 'light', ...t.settings.themes.light },
  { mode: 'dark', ...t.settings.themes.dark },
];

/** Device settings. Nothing here needs an account or goes to the server. */
export function SettingsPage(): JSX.Element {
  const { theme, setTheme } = useTheme();
  useDocumentMeta({ title: t.settings.title, noindex: true });

  return (
    <InfoShell title={t.settings.title} lead={t.settings.lead}>
      <Card className="max-w-3xl">
        <fieldset>
          <legend className="text-lg font-semibold text-content">{t.settings.colours}</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {THEMES.map((option) => (
              <label
                key={option.mode}
                className={cn(
                  'flex min-h-tap cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-colors duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary',
                  theme === option.mode
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-border bg-background hover:border-primary/40',
                )}
              >
                <input
                  type="radio"
                  name="theme"
                  value={option.mode}
                  checked={theme === option.mode}
                  onChange={() => setTheme(option.mode)}
                  className="h-5 w-5 accent-primary"
                />
                <span>
                  <span className="block font-semibold text-content">{option.label}</span>
                  <span className="block text-sm text-content-muted">{option.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <p className="mt-6 text-content-muted">
        {t.settings.profileHint}{' '}
        <Link to="/me" className="font-semibold text-primary underline underline-offset-2">
          {t.me.title}
        </Link>
        .
      </p>
    </InfoShell>
  );
}
