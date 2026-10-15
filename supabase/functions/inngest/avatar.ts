// avatar/requested → generate-avatar (contract: supabase/functions/README.md).
// Runs with the service role, so it re-checks everything itself: it only works
// on a row that is still 'pending', which makes spoofed or repeated events harmless.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { NonRetriableError } from 'npm:inngest@4';
import { inngest } from './client.ts';
import { buildAvatarPrompt, type AvatarTraits } from './prompt.ts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const IMAGEKIT_UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';

const SAFETY_QUESTION =
  'You check pictures for a quiz app used by children. Reply with exactly YES if this ' +
  'image is a friendly cartoon portrait with no text, logos, nudity, violence, weapons ' +
  'or scary content, and it does not look like a real photograph, a real person or a ' +
  'famous character. Otherwise reply with exactly NO.';

const TRAIT_KEYS: (keyof AvatarTraits)[] = [
  'age_look',
  'skin_tone',
  'face_shape',
  'hair_style',
  'hair_colour',
  'eye_colour',
  'outfit',
  'outfit_colour',
  'accessory',
  'facial_hair',
];

function hasAllTraits(traits: unknown): traits is AvatarTraits {
  if (typeof traits !== 'object' || traits === null) return false;
  const t = traits as Record<string, unknown>;
  return TRAIT_KEYS.every((key) => typeof t[key] === 'string' && t[key] !== '');
}

function secret(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new NonRetriableError(`${name} is not set`);
  return value;
}

function admin(): SupabaseClient {
  return createClient(secret('SUPABASE_URL'), secret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

/** Model ids are chosen by admins in the CMS (site_config.ai_models). */
async function aiModels(db: SupabaseClient): Promise<{ text: string; image: string }> {
  const { data, error } = await db
    .from('site_config')
    .select('value')
    .eq('key', 'ai_models')
    .single();
  if (error) throw error;
  return data.value as { text: string; image: string };
}

async function openRouter(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as Record<string, unknown>;
}

type Message = { content?: string; images?: { image_url?: { url?: string } }[] };
const firstMessage = (json: Record<string, unknown>): Message | undefined =>
  (json.choices as { message?: Message }[] | undefined)?.[0]?.message;

/** Returns the generated image as a data URL (or a hosted URL, if the provider sends one). */
async function paint(model: string, prompt: string): Promise<string> {
  const json = await openRouter({
    model,
    messages: [{ role: 'user', content: prompt }],
    modalities: ['image', 'text'],
    provider: { sort: 'price' },
    image_config: { aspect_ratio: '1:1' },
  });
  const url = firstMessage(json)?.images?.[0]?.image_url?.url;
  if (!url) throw new Error('The image model returned no image');
  return url;
}

/** A yes/no check by a vision-capable text model. Anything but YES fails safe. */
async function looksSafe(model: string, image: string): Promise<boolean> {
  const json = await openRouter({
    model,
    max_tokens: 3,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SAFETY_QUESTION },
          { type: 'image_url', image_url: { url: image } },
        ],
      },
    ],
  });
  return (firstMessage(json)?.content ?? '').trim().toUpperCase().startsWith('YES');
}

/** Uploads to ImageKit /avatars/<user>/<avatar>.png; returns a 512×512 WebP delivery URL. */
async function upload(image: string, userId: string, avatarId: string): Promise<string> {
  const form = new FormData();
  // ImageKit takes raw base64 or a URL; strip any data-URL prefix.
  form.append('file', image.startsWith('data:') ? image.slice(image.indexOf(',') + 1) : image);
  form.append('fileName', `${avatarId}.png`);
  form.append('folder', `/avatars/${userId}`);
  form.append('useUniqueFileName', 'false');
  form.append('overwriteFile', 'true');
  const res = await fetch(IMAGEKIT_UPLOAD_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`${secret('IMAGEKIT_PRIVATE_KEY')}:`)}` },
    body: form,
  });
  if (!res.ok) throw new Error(`ImageKit ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error('ImageKit returned no URL');
  return `${url}?tr=w-512,h-512,f-webp`;
}

export const generateAvatar = inngest.createFunction(
  {
    id: 'generate-avatar',
    retries: 3,
    triggers: { event: 'avatar/requested' },
    // After the last retry: mark it failed, which frees the trait combination.
    onFailure: async ({ event, error }) => {
      const avatarId = (event.data as { event?: { data?: { avatar_id?: unknown } } }).event?.data
        ?.avatar_id;
      if (typeof avatarId !== 'string') return;
      await admin()
        .from('avatars')
        .update({ status: 'failed', error: String(error.message).slice(0, 500) })
        .eq('id', avatarId)
        .in('status', ['pending', 'generating']);
    },
  },
  async ({ event, step }) => {
    const avatarId = (event.data as { avatar_id?: unknown }).avatar_id;
    if (typeof avatarId !== 'string') throw new NonRetriableError('avatar_id missing');

    // 1. Claim: pending → generating, atomically. Anything else is ignored.
    const row = await step.run('claim', async () => {
      const { data, error } = await admin()
        .from('avatars')
        .update({ status: 'generating' })
        .eq('id', avatarId)
        .eq('status', 'pending')
        .select('id, user_id, traits')
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; user_id: string; traits: AvatarTraits } | null;
    });
    if (!row) return { skipped: true };
    // request_avatar() validates traits; anything incomplete here is bad data, not a blip.
    if (!hasAllTraits(row.traits)) throw new NonRetriableError('Avatar traits are incomplete');

    // 2. Paint, check and upload in one step, so the image never sits in step state.
    const outcome = await step.run('paint-check-upload', async () => {
      const models = await aiModels(admin());
      const image = await paint(models.image, buildAvatarPrompt(row.traits));
      if (!(await looksSafe(models.text, image))) {
        return { rejected: true as const, model: models.image };
      }
      const url = await upload(image, row.user_id, row.id);
      return { rejected: false as const, model: models.image, url };
    });

    // 3. Save the result. Rejected frees the trait combination.
    await step.run('save', async () => {
      const patch = outcome.rejected
        ? { status: 'rejected', model: outcome.model, error: 'Did not pass the safety check' }
        : { status: 'ready', model: outcome.model, image_url: outcome.url, error: null };
      const { error } = await admin().from('avatars').update(patch).eq('id', row.id);
      if (error) throw error;
    });

    return { status: outcome.rejected ? 'rejected' : 'ready' };
  },
);
