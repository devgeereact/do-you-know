import { env } from '@/lib/env';

/**
 * Public site facts shown on the information pages. The contact address is optional:
 * it defaults to hello@doyouknow.soulrefresh.net; an invalid override falls back to the "being set up" copy.
 */

function readContactEmail(): string | undefined {
  const email = env.contactEmail;
  // A light shape check so a typo never renders a broken mailto link.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export const CONTACT_EMAIL: string | undefined = readContactEmail();

/** Who is responsible for players' data under UK GDPR. */
export const CONTROLLER_NAME = 'Do You Know (operated by Gideon Akinlotan)';

/** Date the privacy notice and terms were last changed. Update with every edit. */
export const POLICY_UPDATED = '17 October 2026';
