# Edge Functions — Do You Know

The only server compute in this project. Nothing here runs on cPanel or in the browser.
Secrets: `supabase/functions/.env.example` → `supabase secrets set --env-file …`.

| Function | Called by | Contract |
| --- | --- | --- |
| `inngest` | Inngest (signed requests) | Serves the Inngest functions below via the Inngest SDK `serve()` handler |
| `trigger-rebuild` | `send_rebuild_hook()` (pg_cron + pg_net) | `POST` with header `x-rebuild-secret`; on match, sends GitHub `repository_dispatch` `content-published`; returns 202 |

## Inngest functions (inside `inngest`)
### `avatar/requested` → generate-avatar
Input `{ avatar_id }`. Steps (each retried up to 3× with backoff):
1. Load the avatar row with the service role; continue only if `status = 'pending'`
   (prevents spoofed or duplicate events). Set `generating`.
2. Build the prompt from `traits` + the fixed house style (soft-lit 3D cartoon
   head-and-shoulders portrait, large expressive eyes, warm plain background, everyday
   clothing, friendly expression, no text, no logos, not resembling any real person or
   existing character).
3. Call OpenRouter with the image model from `site_config.ai_models.image`.
4. Safety check the result (OpenRouter moderation or a vision model yes/no); on fail →
   `rejected` (frees the trait combination).
5. Upload to ImageKit `/avatars/<user_id>/<avatar_id>.webp` (512×512).
6. Set `ready`, `image_url`, `model`. On final failure → `failed` with `error`.

### `questions/draft.requested` → draft-questions
Input `{ draft_id }`. Staff-only row created via RLS.
1. Load the draft; continue only if `status = 'queued'`; set `running`.
2. Call OpenRouter with `site_config.ai_models.text` (a web-search-capable model) and a
   strict JSON schema: `{ questions: [{ type, prompt, options[{label,is_correct}] | slider{min,max,step,unit,correct,accept_min,accept_max}, explanation, source_url }] }`.
   Instructions: age-appropriate for `age_min–age_max`, one unambiguous correct answer,
   current facts, every question with a real `source_url`.
3. Validate the JSON; store it in `result`; set `ready` (or `failed` with `error`).
4. Staff review in `/admin` and run `import_ai_draft()` — **never auto-publish.**

## Deploy
```bash
supabase functions deploy inngest --no-verify-jwt          # Inngest signs its own requests
supabase functions deploy trigger-rebuild --no-verify-jwt  # checked by x-rebuild-secret
```
Then register `https://<ref>.supabase.co/functions/v1/inngest` as the Inngest app URL.

> Status: `inngest` serves `generate-avatar` (Milestone 2): `inngest/index.ts`,
> `inngest/avatar.ts`, prompt builder `inngest/prompt.ts` (+ `prompt_test.ts`).
> `draft-questions` and `trigger-rebuild` come with the CMS in Milestone 3.

### Secrets for `inngest`
`OPENROUTER_API_KEY`, `IMAGEKIT_PRIVATE_KEY`, `INNGEST_SIGNING_KEY` (set with
`supabase secrets set`, never in the repo). `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are provided by Supabase. Model ids come from `site_config.ai_models`.

### Check and test locally (no paid keys needed)
```bash
cd supabase/functions/inngest && deno task check && deno task test
# Full pipeline against the local stack (runs until the missing OpenRouter key, then
# the failure handler marks the avatar 'failed'):
printf 'INNGEST_DEV=1\nINNGEST_BASE_URL=http://host.docker.internal:8288\nINNGEST_SERVE_HOST=http://host.docker.internal:55421\n' > /tmp/fn.env
supabase functions serve inngest --env-file /tmp/fn.env
docker run --rm -p 8288:8288 inngest/inngest inngest dev --no-discovery \
  -u http://host.docker.internal:55421/functions/v1/inngest
```
`INNGEST_SERVE_HOST` is needed locally because the edge runtime reports its internal
port (8081) when it registers. Confirm on the first production deploy that Inngest
records `https://<ref>.supabase.co/functions/v1/inngest`; if not, set the same secret.
