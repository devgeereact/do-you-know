import { assert, assertStringIncludes } from 'jsr:@std/assert@1';
import { buildAvatarPrompt, type AvatarTraits } from './prompt.ts';

const base: AvatarTraits = {
  age_look: 'child',
  skin_tone: 'light-olive',
  face_shape: 'round',
  hair_style: 'two-puffs',
  hair_colour: 'dark-brown',
  eye_colour: 'hazel',
  outfit: 'denim-jacket',
  outfit_colour: 'sky-blue',
  accessory: 'none',
  facial_hair: 'none',
};

Deno.test('describes every trait in plain words', () => {
  const p = buildAvatarPrompt(base);
  assertStringIncludes(p, 'a young child with light olive skin');
  assertStringIncludes(p, 'dark brown two puffs hair');
  assertStringIncludes(p, 'wearing a sky blue denim jacket');
});

Deno.test('always carries the house style and safety rules', () => {
  const p = buildAvatarPrompt(base);
  assertStringIncludes(p, 'No text');
  assertStringIncludes(p, 'Must not resemble any real person');
  assertStringIncludes(p, 'suitable for children');
});

Deno.test('facial hair only for the adult look', () => {
  assert(!buildAvatarPrompt({ ...base, facial_hair: 'goatee' }).includes('goatee'));
  assertStringIncludes(
    buildAvatarPrompt({ ...base, age_look: 'adult', facial_hair: 'goatee' }),
    'and a goatee',
  );
});

Deno.test('head coverings and bald read naturally', () => {
  assertStringIncludes(
    buildAvatarPrompt({ ...base, hair_style: 'hijab', hair_colour: 'black' }),
    'a black-toned hijab',
  );
  assertStringIncludes(buildAvatarPrompt({ ...base, hair_style: 'bald' }), 'a bald head');
});
