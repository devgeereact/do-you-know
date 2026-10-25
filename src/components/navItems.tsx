import { t } from '@/i18n';

/** Main destinations, shared by the desktop header and the phone tab bar. */
export interface NavItem {
  to: string;
  label: string;
  short: string; // tab bar label on narrow phones
  /** Paths that count as this section, e.g. category and quiz pages under Quizzes. */
  matches: (pathname: string) => boolean;
  icon: JSX.Element;
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-6 w-6',
} as const;

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: t.nav.quizzes.label,
    short: t.nav.quizzes.short,
    matches: (path) => path === '/' || path.startsWith('/c/') || path.startsWith('/q/'),
    icon: (
      <svg {...iconProps}>
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
      </svg>
    ),
  },
  {
    to: '/daily',
    label: t.nav.daily.label,
    short: t.nav.daily.short,
    matches: (path) => path === '/daily',
    icon: (
      <svg {...iconProps}>
        <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
      </svg>
    ),
  },
  {
    to: '/leaderboards',
    label: t.nav.leaderboards.label,
    short: t.nav.leaderboards.short,
    matches: (path) => path === '/leaderboards',
    icon: (
      <svg {...iconProps}>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
      </svg>
    ),
  },
  {
    to: '/me',
    label: t.nav.me.label,
    short: t.nav.me.short,
    matches: (path) => path === '/me' || path.startsWith('/me/'),
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return item.matches(pathname);
}
