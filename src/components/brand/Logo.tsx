import { t } from '@/i18n';

/**
 * Do You Know brand mark: a chunky speech bubble asking a question, with a spark of an idea.
 * Original artwork (October 2026). Colours are the Pop & Ink brand values, fixed on purpose so the
 * mark looks the same in light and dark themes.
 */
export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M34 15h32a26 26 0 0 1 26 26v16a26 26 0 0 1-26 26H45l-21 13 6-15.5A26 26 0 0 1 8 57V41a26 26 0 0 1 26-26z"
        fill="#4A2FC9"
      />
      <path
        d="M34 9h32a26 26 0 0 1 26 26v16a26 26 0 0 1-26 26H45l-21 13 6-15.5A26 26 0 0 1 8 51V35A26 26 0 0 1 34 9z"
        fill="#6C4CF5"
      />
      <path
        d="M38.5 34.5a11.5 11.5 0 1 1 17 10.1c-4.2 2.4-5.8 4.6-5.8 9.4"
        fill="none"
        stroke="#FFD23F"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="49.7" cy="66" r="6.2" fill="#FFD23F" />
      <path d="M85 4l2.6 6.4L94 13l-6.4 2.6L85 22l-2.6-6.4L76 13l6.4-2.6z" fill="#FF8A3D" />
    </svg>
  );
}

/** Mark plus wordmark. The text stays real text so it reads for screen readers and scales crisply. */
export function Logo({ size = 36, className }: { size?: number; className?: string }): JSX.Element {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <LogoMark size={size} />
      <span className="font-display text-[1.35rem] font-extrabold leading-none tracking-tight text-content">
        {t.brand.wordStart} <span className="text-primary">{t.brand.wordEnd}</span>
      </span>
    </span>
  );
}
