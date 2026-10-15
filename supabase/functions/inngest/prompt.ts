// Builds the avatar image prompt from validated traits plus the fixed house
// style (docs/03-design/DESIGN-SYSTEM.md §1). Pure, so it can be unit-tested.

export interface AvatarTraits {
  age_look: 'child' | 'teen' | 'adult';
  skin_tone: string;
  face_shape: string;
  hair_style: string;
  hair_colour: string;
  eye_colour: string;
  outfit: string;
  outfit_colour: string;
  accessory: string;
  facial_hair: string;
}

const HOUSE_STYLE =
  'Soft-lit 3D cartoon head-and-shoulders portrait, square image, large expressive eyes, ' +
  'friendly smile, warm plain pastel background, gentle studio lighting, everyday clothing. ' +
  'No text, no letters, no logos, no watermark. Must not resemble any real person or any ' +
  'existing cartoon or film character. Wholesome and suitable for children.';

const AGE: Record<AvatarTraits['age_look'], string> = {
  child: 'a young child',
  teen: 'a teenager',
  adult: 'an adult',
};

/** "light-olive" → "light olive". */
const words = (value: string): string => value.replace(/-/g, ' ');

/** Turns a hair style value into a natural phrase. */
function hair(traits: AvatarTraits): string {
  const style = words(traits.hair_style);
  if (traits.hair_style === 'bald') return 'a bald head';
  if (['hijab', 'turban', 'headwrap'].includes(traits.hair_style)) {
    return `a ${words(traits.hair_colour)}-toned ${style}`;
  }
  return `${words(traits.hair_colour)} ${style} hair`;
}

export function buildAvatarPrompt(traits: AvatarTraits): string {
  const parts = [
    `A portrait of ${AGE[traits.age_look]} with ${words(traits.skin_tone)} skin`,
    `a ${words(traits.face_shape)} face`,
    hair(traits),
    `${words(traits.eye_colour)} eyes`,
    `wearing a ${words(traits.outfit_colour)} ${words(traits.outfit)}`,
  ];
  if (traits.accessory !== 'none') parts.push(`with ${words(traits.accessory)}`);
  if (traits.age_look === 'adult' && traits.facial_hair !== 'none') {
    parts.push(`and a ${words(traits.facial_hair)}`);
  }
  return `${parts.join(', ')}. ${HOUSE_STYLE}`;
}
