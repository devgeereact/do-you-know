import { Inngest } from 'npm:inngest@4';

// INNGEST_SIGNING_KEY is read from the function's secrets automatically and
// verifies that every call into this function really comes from Inngest.
export const inngest = new Inngest({ id: 'do-you-know' });
