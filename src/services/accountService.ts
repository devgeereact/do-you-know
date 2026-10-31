import { api } from '@/lib/api';

export type GetToken = () => Promise<string | null>;

interface AdultSession {
  profile_id: string;
  linked_game_history: boolean;
}

/**
 * Tells the server about a verified grown-up Clerk sign-in so it can create (or find) the
 * matching identity row. Every Clerk-token call, including the Studio, depends on that row.
 * Safe to repeat: the server returns the existing profile.
 */
export async function linkAdultSession(getToken: GetToken): Promise<AdultSession | null> {
  const token = await getToken();
  if (!token) return null;
  return api<AdultSession>('/account/session', {
    body: { adult_confirmed: true },
    authToken: token,
  });
}
