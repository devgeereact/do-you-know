// Supabase Edge Function `inngest`: serves the background jobs to Inngest.
// Deploy with --no-verify-jwt; Inngest signs its own requests (INNGEST_SIGNING_KEY).
import { serve } from 'npm:inngest@4/edge';
import { generateAvatar } from './avatar.ts';
import { inngest } from './client.ts';

Deno.serve(
  serve({
    client: inngest,
    functions: [generateAvatar],
    // Supabase rewrites the path, so tell Inngest where this function lives.
    servePath: '/functions/v1/inngest',
  }),
);
