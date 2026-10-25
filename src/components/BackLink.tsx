import { Link } from 'react-router-dom';

/** The one "up a level" link style, so every page goes back the same way. */
export function BackLink({ to, label }: { to: string; label: string }): JSX.Element {
  return (
    <Link
      to={to}
      className="-ml-2 inline-flex min-h-tap items-center rounded-full px-2 font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary"
    >
      <span aria-hidden="true">←&nbsp;</span>
      {label}
    </Link>
  );
}
