/**
 * Public site facts shown on the information pages. The contact address is optional:
 * when VITE_CONTACT_EMAIL is empty the pages say contact details are being set up.
 */

function readContactEmail(): string | undefined {
  const value: unknown = import.meta.env.VITE_CONTACT_EMAIL;
  if (typeof value !== 'string') return undefined;
  const email = value.trim();
  // A light shape check so a typo never renders a broken mailto link.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

export const CONTACT_EMAIL: string | undefined = readContactEmail();

/** Who is responsible for players' data under UK GDPR. */
export const CONTROLLER_NAME = 'Do You Know (operated by Gideon Akinlotan)';

/** Date the privacy notice and terms were last changed. Update with every edit. */
export const POLICY_UPDATED = '17 October 2026';
