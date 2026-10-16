import { Link } from 'react-router-dom';
import { BackLink } from '@/components/BackLink';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/context/ThemeContext';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/types';

const THEMES: { mode: ThemeMode; label: string; hint: string }[] = [
  { mode: 'light', label: 'Light', hint: 'Bright and sunny' },
  { mode: 'dark', label: 'Dark', hint: 'Easier on the eyes at night' },
];

/** Device settings. Nothing here needs an account or goes to the server. */
export function SettingsPage(): JSX.Element {
  const { theme, setTheme } = useTheme();
  useDocumentMeta({ title: 'Settings', noindex: true });

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-4 md:px-8">
      <BackLink to="/me" label="My games" />
      <h1 className="mt-2 text-4xl font-semibold text-content">Settings</h1>

      <Card className="mt-6">
        <fieldset>
          <legend className="text-lg font-semibold text-content">Colours</legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {THEMES.map((option) => (
              <label
                key={option.mode}
                className={cn(
                  'flex min-h-tap cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary',
                  theme === option.mode
                    ? 'border-primary bg-primary/10'
                    : 'border-surface-border bg-background',
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
        Your nickname, avatar and age group live on{' '}
        <Link to="/me" className="font-semibold text-primary underline underline-offset-2">
          My games
        </Link>
        .
      </p>
    </main>
  );
}
