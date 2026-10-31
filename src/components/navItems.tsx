import { t } from '@/i18n';

/** Main destinations, shared by the desktop header and the phone tab bar. */
export interface NavItem {
  to: string;
  label: string;
  short: string; // tab bar label on narrow phones
  /** Paths that count as this section, e.g. category and quiz pages under Explore. */
  matches: (pathname: string) => boolean;
  icon: JSX.Element;
  /** Shown only in the phone tab bar (the header has a Play button instead). */
  tabOnly?: boolean;
}

const iconProps = {
  'aria-hidden': true,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
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
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
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
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    to: '/daily/play',
    label: t.nav.play.label,
    short: t.nav.play.short,
    matches: () => false,
    tabOnly: true,
    icon: (
      <svg {...iconProps} fill="currentColor" stroke="none">
        <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" />
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
];

export function isNavActive(item: NavItem, pathname: string): boolean {
  return item.matches(pathname);
}
