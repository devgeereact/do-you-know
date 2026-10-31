/**
 * Brand artwork as SVG markup: the object characters, world glyphs, question scenes and the
 * full-bleed world backgrounds. Original artwork made for Do You Know (October 2026), drawn in
 * code so there are no image downloads. Everything here is static markup with no user input,
 * so components may inject it. Animation classes (swim, sway, drift, twinkle, beat, pulse-sun)
 * are defined in src/index.css and switched off under reduced motion.
 */
export type Mood = 'happy' | 'sad' | 'oh';
export const WORLD_KEYS = [
  'ocean',
  'space',
  'jungle',
  'desert',
  'arctic',
  'body',
  'past',
  'city',
] as const;
export type WorldKey = (typeof WORLD_KEYS)[number];
export function isWorld(value: unknown): value is WorldKey {
  return typeof value === 'string' && (WORLD_KEYS as readonly string[]).includes(value);
}

const face = (cx: number, cy: number, s = 1, mood: Mood = 'happy'): string => {
  const e = 4.6 * s,
    dx = 8.5 * s;
  const mouth =
    mood === 'oh'
      ? `<ellipse cx="${cx}" cy="${cy + 8 * s}" rx="${2.6 * s}" ry="${3.2 * s}" fill="#2A1F3D"/>`
      : mood === 'sad'
        ? `<path d="M${cx - 4 * s} ${cy + 10 * s} q${4 * s} ${-4.5 * s} ${8 * s} 0" stroke="#2A1F3D" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round"/>`
        : `<path d="M${cx - 4 * s} ${cy + 6.5 * s} q${4 * s} ${4.5 * s} ${8 * s} 0" stroke="#2A1F3D" stroke-width="${2.2 * s}" fill="none" stroke-linecap="round"/>`;
  return `<circle cx="${cx - dx}" cy="${cy}" r="${e}" fill="#2A1F3D"/><circle cx="${cx + dx}" cy="${cy}" r="${e}" fill="#2A1F3D"/>
  <circle cx="${cx - dx + 1.5 * s}" cy="${cy - 1.6 * s}" r="${1.5 * s}" fill="#fff"/><circle cx="${cx + dx + 1.5 * s}" cy="${cy - 1.6 * s}" r="${1.5 * s}" fill="#fff"/>
  <ellipse cx="${cx - dx - 5 * s}" cy="${cy + 6 * s}" rx="${3.6 * s}" ry="${2.2 * s}" fill="#FF7FA8" opacity=".5"/><ellipse cx="${cx + dx + 5 * s}" cy="${cy + 6 * s}" rx="${3.6 * s}" ry="${2.2 * s}" fill="#FF7FA8" opacity=".5"/>${mouth}`;
};

export const CHARACTER_ART = {
  owl: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="34" ry="5" fill="#17153A" opacity=".12"/><ellipse cx="60" cy="70" rx="36" ry="40" fill="#B9845A"/><ellipse cx="60" cy="80" rx="24" ry="26" fill="#F6E3C8"/><circle cx="47" cy="60" r="14" fill="#FFF8EE"/><circle cx="73" cy="60" r="14" fill="#FFF8EE"/>${face(60, 60, 1, m)}<path d="M56 72 l4 6 l4 -6z" fill="#FF8A3D"/><path d="M26 32 L60 18 L94 32 L60 44Z" fill="#17153A"/><rect x="48" y="36" width="24" height="10" fill="#17153A"/><path d="M90 32 v16" stroke="#FFD23F" stroke-width="3"/><circle cx="90" cy="50" r="4" fill="#FFD23F"/><path d="M38 100 q22 10 44 0" stroke="#6C4CF5" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  bulb: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="24" ry="5" fill="#17153A" opacity=".12"/><circle cx="60" cy="50" r="36" fill="#FFD23F"/><circle cx="48" cy="36" r="9" fill="#fff" opacity=".6"/><rect x="44" y="82" width="32" height="10" rx="3" fill="#8A87A8"/><rect x="46" y="92" width="28" height="8" rx="3" fill="#6B6889"/><rect x="50" y="100" width="20" height="7" rx="3" fill="#4A4770"/>${face(60, 52, 1, m)}`,
  globe: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="30" ry="5" fill="#17153A" opacity=".12"/><circle cx="60" cy="58" r="44" fill="#4FB6F0"/><path d="M28 40 q14-14 30-6 q6 12-8 18 q-10 2-12 14 q-12-6-10-26z M70 24 q20 4 26 22 q-14 4-20-6 q-10-6-6-16z M66 84 q12-8 22 2 q-6 12-20 10z" fill="#3DCB7A"/>${face(60, 62, 1, m)}<path d="M26 54 q34 14 68 0" stroke="#EF4E56" stroke-width="7" fill="none" opacity=".0"/>`,
  boat: (m: Mood): string =>
    `<ellipse cx="60" cy="108" rx="40" ry="5" fill="#17153A" opacity=".12"/><path d="M10 64 L110 64 L92 100 L28 100Z" fill="#fff" stroke="#D9D5E8" stroke-width="3"/><path d="M60 14 L60 64 L22 64Z" fill="#E9E6F5"/><path d="M60 22 L92 64 L60 64Z" fill="#fff" stroke="#D9D5E8" stroke-width="2"/>${face(60, 80, 0.9, m)}`,
  battery: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="26" ry="5" fill="#17153A" opacity=".12"/><rect x="50" y="6" width="20" height="10" rx="3" fill="#6C4CF5"/><rect x="30" y="14" width="60" height="94" rx="14" fill="#fff" stroke="#6C4CF5" stroke-width="5"/><rect x="38" y="58" width="44" height="14" rx="6" fill="#1FB57A"/><rect x="38" y="76" width="44" height="14" rx="6" fill="#1FB57A"/><rect x="38" y="94" width="44" height="8" rx="4" fill="#1FB57A"/>${face(60, 36, 0.85, m)}`,
  mug: (m: Mood): string =>
    `<ellipse cx="56" cy="112" rx="32" ry="5" fill="#17153A" opacity=".12"/><path d="M84 46 q24 0 22 24 q-2 20 -24 18" stroke="#FF8A3D" stroke-width="9" fill="none"/><path d="M22 30 h64 l-6 76 q-26 6 -52 0z" fill="#FF8A3D"/><ellipse cx="54" cy="30" rx="32" ry="7" fill="#E06A1C"/>${face(54, 60, 1, m)}<text x="54" y="100" text-anchor="middle" font-family="Fredoka" font-size="20" font-weight="700" fill="#fff">?</text>`,
  rocket: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="22" ry="5" fill="#17153A" opacity=".12"/><path d="M60 8 q30 26 24 76 h-48 q-6-50 24-76z" fill="#fff" stroke="#D9D5E8" stroke-width="3"/><path d="M60 8 q16 14 21 34 h-42 q5-20 21-34z" fill="#EF4E56"/><path d="M36 70 l-16 24 h18z M84 70 l16 24 h-18z" fill="#6C4CF5"/><path d="M48 84 q12 30 24 0z" fill="#FFD23F"/>${face(60, 60, 0.8, m)}`,
  star: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="28" ry="5" fill="#17153A" opacity=".12"/><path d="M60 8 L74 42 L110 44 L82 66 L92 102 L60 82 L28 102 L38 66 L10 44 L46 42Z" fill="#FFD23F" stroke="#E8B500" stroke-width="3" stroke-linejoin="round"/>${face(60, 58, 0.85, m)}`,
  planet: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="28" ry="5" fill="#17153A" opacity=".12"/><circle cx="60" cy="58" r="36" fill="#FF8A3D"/><path d="M30 46 q30 8 60 -4 M28 66 q32 8 64 -2" stroke="#E06A1C" stroke-width="6" fill="none" opacity=".6"/><ellipse cx="60" cy="62" rx="56" ry="12" fill="none" stroke="#6C4CF5" stroke-width="5" transform="rotate(-12 60 62)"/>${face(60, 56, 0.9, m)}`,
  cactus: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="28" ry="5" fill="#17153A" opacity=".12"/><rect x="40" y="84" width="40" height="24" rx="5" fill="#FF6FA3"/><rect x="44" y="18" width="32" height="70" rx="16" fill="#1FB57A"/><path d="M44 54 h-12 q-6 0 -6 -6 v-14" stroke="#1FB57A" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M76 62 h12 q6 0 6 -6 v-10" stroke="#1FB57A" stroke-width="12" fill="none" stroke-linecap="round"/>${face(60, 48, 0.8, m)}`,
  turtle: (): string =>
    `<ellipse cx="60" cy="108" rx="44" ry="5" fill="#17153A" opacity=".12"/><circle cx="98" cy="70" r="14" fill="#7DD3A6"/><circle cx="102" cy="66" r="3" fill="#17153A"/><path d="M14 92 q4-52 46-52 q42 0 46 52z" fill="#14B8A6"/><path d="M34 72 l12-12 h28 l12 12 l-12 14 h-28z" fill="none" stroke="#0E8F81" stroke-width="3"/><rect x="24" y="90" width="14" height="12" rx="5" fill="#7DD3A6"/><rect x="80" y="90" width="14" height="12" rx="5" fill="#7DD3A6"/>`,
  penguin: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="28" ry="5" fill="#17153A" opacity=".12"/><ellipse cx="60" cy="66" rx="36" ry="44" fill="#17153A"/><ellipse cx="60" cy="74" rx="24" ry="32" fill="#fff"/><path d="M24 70 q-10 16 4 28 M96 70 q10 16 -4 28" stroke="#17153A" stroke-width="9" fill="none" stroke-linecap="round"/>${face(60, 56, 0.85, m)}<path d="M54 66 l6 6 l6 -6z" fill="#FF8A3D"/><path d="M44 108 h12 M64 108 h12" stroke="#FF8A3D" stroke-width="7" stroke-linecap="round"/><path d="M34 28 q26 -14 52 0" stroke="#EF4E56" stroke-width="8" fill="none" stroke-linecap="round"/>`,
  heart: (m: Mood): string =>
    `<ellipse cx="60" cy="112" rx="26" ry="5" fill="#17153A" opacity=".12"/><path d="M60 102 C10 70 14 26 40 22 C52 20 58 30 60 36 C62 30 68 20 80 22 C106 26 110 70 60 102Z" fill="#EF4E56"/>${face(60, 56, 0.9, m)}`,
} satisfies Record<string, (m: Mood) => string>;
export type CharacterKey = keyof typeof CHARACTER_ART;

export const WORLD_GLYPHS: Record<WorldKey, string> = {
  ocean:
    '<path d="M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  space:
    '<circle cx="10" cy="10" r="5" fill="currentColor"/><ellipse cx="10" cy="10" rx="9" ry="3" stroke="currentColor" stroke-width="1.6" fill="none" transform="rotate(-20 10 10)"/>',
  jungle:
    '<path d="M10 18V9M10 9C10 4 15 2 18 2c0 4-3 7-8 7zM10 12C10 8 5 6 2 6c0 4 3 6 8 6z" fill="currentColor"/>',
  desert:
    '<circle cx="14" cy="5" r="3" fill="currentColor"/><path d="M1 17c4-5 8-5 12-2 2-1 4-1 6 0v2H1z" fill="currentColor"/>',
  arctic:
    '<path d="M10 1v18M2.5 5.5l15 9M17.5 5.5l-15 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  body: '<path d="M10 17S2 12 2 7a4 4 0 018-1 4 4 0 018 1c0 5-8 10-8 10z" fill="currentColor"/>',
  past: '<path d="M2 17h16M3 7h14L10 2zM5 8v8M10 8v8M15 8v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
  city: '<path d="M2 18V8h5v10M7 18V3h6v15M13 18v-8h5v8" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>',
};

/** Inner question scene (sky band, ground and props) in an 800x420 box, cropped to fit. */
export function sceneArt(w: WorldKey): string {
  const r = (n: number): number[] => Array.from({ length: n }, (_, i) => i);
  const A: Record<WorldKey, string> = {
    ocean: `<g class="drift">${r(7)
      .map(
        (i) =>
          `<circle cx="${80 + i * 110}" cy="${60 + ((i * 53) % 160)}" r="${6 + (i % 3) * 4}" fill="#fff" opacity=".55"/>`,
      )
      .join('')}</g>
  <path d="M640 120 q20-14 40 0 q-20 14-40 0z M660 120 l14-10 v20z" fill="#FF8A3D" class="swim"/><path d="M120 200 q16-12 32 0 q-16 12-32 0z M136 200 l12-8 v16z" fill="#FFD23F" class="swim s2"/>
  <path d="M0 330 Q200 290 400 320 T800 305 V420 H0Z" fill="#2A9FD6"/><path d="M0 365 Q200 330 400 355 T800 350 V420 H0Z" fill="#1E86BC"/>
  ${r(5)
    .map(
      (i) =>
        `<path d="M${600 + i * 36} 420 q-14-40 0-70 q14-30 0-60" stroke="#14B8A6" stroke-width="10" fill="none" stroke-linecap="round" class="sway"/>`,
    )
    .join('')}`,
    space: `${r(40)
      .map(
        (i) =>
          `<circle cx="${(i * 197) % 800}" cy="${(i * 83) % 300}" r="${i % 4 ? 1.4 : 2.6}" fill="#FFD23F" opacity="${0.4 + (i % 3) * 0.2}" class="${i % 5 ? '' : 'twinkle'}"/>`,
      )
      .join('')}
  <circle cx="690" cy="80" r="34" fill="#FF8A3D"/><ellipse cx="690" cy="84" rx="58" ry="12" fill="none" stroke="#FFD23F" stroke-width="5" transform="rotate(-14 690 84)"/>
  <ellipse cx="400" cy="470" rx="560" ry="150" fill="#D9D3F5"/><circle cx="170" cy="355" r="22" fill="#BEB4EE"/><circle cx="560" cy="345" r="14" fill="#BEB4EE"/><circle cx="660" cy="375" r="28" fill="#BEB4EE"/>`,
    jungle: `<path d="M0 0 q60 70 0 140 M800 0 q-50 60 0 130" stroke="#2FA36B" stroke-width="14" fill="none"/>
  ${r(6)
    .map(
      (i) =>
        `<ellipse cx="${i * 150 + 30}" cy="${i % 2 ? 14 : 4}" rx="70" ry="34" fill="${i % 2 ? '#2FA36B' : '#1F8A57'}"/>`,
    )
    .join('')}
  <path d="M0 320 Q150 270 330 310 T800 290 V420 H0Z" fill="#7FCB6E"/><path d="M0 360 Q250 330 450 360 T800 350 V420 H0Z" fill="#2FA36B"/>
  <g class="sway">${r(4)
    .map(
      (i) =>
        `<path d="M${620 + i * 40} 360 q-30-40 -10-90" stroke="#1F8A57" stroke-width="8" fill="none"/><ellipse cx="${610 + i * 40}" cy="270" rx="18" ry="8" fill="#1FB57A" transform="rotate(-30 ${610 + i * 40} 270)"/>`,
    )
    .join('')}</g>`,
    desert: `<circle cx="660" cy="90" r="46" fill="#FFD23F" class="pulse-sun"/>
  <path d="M0 320 Q200 250 420 310 T800 280 V420 H0Z" fill="#F4C27A"/><path d="M0 365 Q300 320 520 360 T800 350 V420 H0Z" fill="#E8A95A"/>
  <g transform="translate(600 250)"><rect x="18" y="0" width="22" height="100" rx="11" fill="#1FB57A"/><path d="M18 50 h-12 q-6 0-6-6 v-22" stroke="#1FB57A" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M40 40 h12 q6 0 6-6 v-14" stroke="#1FB57A" stroke-width="12" fill="none" stroke-linecap="round"/></g>`,
    arctic: `<g class="drift">${r(16)
      .map(
        (i) =>
          `<text x="${(i * 131) % 800}" y="${((i * 61) % 280) + 20}" font-size="${10 + (i % 3) * 6}" fill="#fff" opacity=".85">❄</text>`,
      )
      .join('')}</g>
  <path d="M560 330 L640 200 L700 250 L760 170 L800 330Z" fill="#fff"/><path d="M640 200 L660 330 L560 330Z" fill="#DCEFFA"/>
  <path d="M0 340 Q200 320 400 340 T800 335 V420 H0Z" fill="#7CC4EA"/><ellipse cx="150" cy="355" rx="140" ry="22" fill="#fff"/>`,
    body: `<path d="M0 150 h220 l20-40 l24 80 l20-60 l14 20 h502" stroke="#EF4E56" stroke-width="4" fill="none" opacity=".35" class="beat"/>
  ${r(9)
    .map(
      (i) =>
        `<circle cx="${(i * 173) % 800}" cy="${((i * 97) % 260) + 30}" r="${10 + (i % 3) * 6}" fill="#FF6FA3" opacity=".22"/>`,
    )
    .join('')}
  <path d="M0 340 Q200 310 400 335 T800 325 V420 H0Z" fill="#FF8FB0"/><path d="M0 375 Q250 350 450 372 T800 365 V420 H0Z" fill="#F0648C"/>`,
    past: `<circle cx="120" cy="90" r="38" fill="#FFD23F" opacity=".9"/>
  <path d="M480 330 L590 190 L700 330Z" fill="#E3B567"/><path d="M590 190 L700 330 L630 330Z" fill="#C9963F"/><path d="M640 330 L710 245 L780 330Z" fill="#E3B567"/>
  <path d="M0 330 Q200 300 400 325 T800 320 V420 H0Z" fill="#E8C98A"/><path d="M0 370 Q250 350 450 368 T800 362 V420 H0Z" fill="#D7AE5E"/>`,
    city: `${r(9)
      .map((i) => {
        const h = 80 + ((i * 53) % 120);
        return `<rect x="${380 + i * 48}" y="${330 - h}" width="40" height="${h}" rx="6" fill="${['#6C4CF5', '#8E78FA', '#5233D9'][i % 3]}"/>${r(
          Math.floor(h / 30),
        )
          .map(
            (j) =>
              `<rect x="${388 + i * 48}" y="${340 - h + j * 28}" width="9" height="9" rx="2" fill="#FFD23F" opacity=".8"/><rect x="${403 + i * 48}" y="${340 - h + j * 28}" width="9" height="9" rx="2" fill="#FFD23F" opacity=".5"/>`,
          )
          .join('')}`;
      })
      .join('')}
  ${['+', '×', '÷', '='].map((s, i) => `<text x="${60 + i * 80}" y="${80 + (i % 2) * 60}" font-family="Fredoka" font-size="40" font-weight="700" fill="#6C4CF5" opacity=".25" class="drift">${s}</text>`).join('')}
  <path d="M0 330 H800 V420 H0Z" fill="#B9AEF7"/><path d="M0 360 H800" stroke="#fff" stroke-width="4" stroke-dasharray="30 20"/>`,
  };
  return `<svg class="scene" viewBox="0 0 800 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${A[w]}</svg>`;
}

/** Full-bleed world palettes: a = deep, b = light, frame = game frame colour. */
export const WORLD_BG: Record<WorldKey, { a: string; b: string; frame: string }> = {
  ocean: { a: '#0B5FA8', b: '#3FB6EA', frame: '#2D9BE0' },
  space: { a: '#120F3A', b: '#3B2E91', frame: '#6C4CF5' },
  jungle: { a: '#14704A', b: '#3DBB7E', frame: '#5CC28A' },
  desert: { a: '#C9652C', b: '#F6B66A', frame: '#F0954A' },
  arctic: { a: '#3D8BC4', b: '#BFE6FA', frame: '#7CC4EA' },
  body: { a: '#B83A6A', b: '#FF9DBB', frame: '#F06A97' },
  past: { a: '#8B5A2B', b: '#E8C182', frame: '#D29A4F' },
  city: { a: '#2D2270', b: '#8E78FA', frame: '#7A63F0' },
};
/** Full-bleed world background in a 1600x900 box, cropped to cover. */
export function worldBg(w: WorldKey): string {
  const r = (n: number): number[] => Array.from({ length: n }, (_, i) => i),
    c = WORLD_BG[w];
  const L: Record<WorldKey, string> = {
    ocean: `<g opacity=".18">${r(5)
      .map(
        (i) =>
          `<path d="M${200 + i * 260} 0 L${120 + i * 260} 900 L${320 + i * 260} 900Z" fill="#fff"/>`,
      )
      .join('')}</g>
  <g class="drift" opacity=".35">${r(14)
    .map(
      (i) =>
        `<circle cx="${(i * 197) % 1600}" cy="${((i * 131) % 760) + 40}" r="${4 + (i % 4) * 4}" fill="none" stroke="#fff" stroke-width="2"/>`,
    )
    .join('')}</g>
  <g opacity=".22" fill="#E6F6FF">${[
    [180, 170, 1],
    [1380, 320, 0.8],
    [1460, 120, 0.6],
  ]
    .map(
      ([x, y, s]) =>
        `<g transform="translate(${x} ${y}) scale(${s})" class="drift"><path d="M-40 0a40 34 0 0180 0z"/>${r(
          4,
        )
          .map(
            (k) =>
              `<path d="M${-28 + k * 18} 0q-6 30 4 60" stroke="#E6F6FF" stroke-width="5" fill="none"/>`,
          )
          .join('')}</g>`,
    )
    .join('')}</g>
  <g opacity=".25" fill="#E6F6FF">${r(9)
    .map(
      (i) =>
        `<path d="M${1050 + i * 48} ${140 + (i % 3) * 30} q12-8 24 0 q-12 8-24 0z M${1074 + i * 48} ${140 + (i % 3) * 30} l8-6 v12z"/>`,
    )
    .join('')}</g>
  <path d="M0 760 Q300 700 640 740 T1600 720 V900 H0Z" fill="#0A4E8C"/><path d="M0 820 Q400 780 800 810 T1600 800 V900 H0Z" fill="#083F73"/>
  <g class="sway" fill="none" stroke="#1C9C8E" stroke-width="16" stroke-linecap="round">${r(5)
    .map((i) => `<path d="M${1380 + i * 42} 900 q-24-70 0-130 q24-60 0-120"/>`)
    .join('')}${r(4)
    .map((i) => `<path d="M${40 + i * 40} 900 q-20-60 0-110 q20-50 0-100"/>`)
    .join('')}</g>
  <g transform="translate(70 760)"><rect x="0" y="34" width="150" height="80" rx="10" fill="#1F4E7A"/><path d="M0 40 q75-70 150 0z" fill="#2A6496"/><rect x="62" y="40" width="26" height="30" rx="5" fill="#F5C33B"/>${r(
    6,
  )
    .map(
      (i) =>
        `<ellipse cx="${20 + i * 24}" cy="${30 - (i % 2) * 10}" rx="13" ry="7" fill="#F5C33B" stroke="#C9930F" stroke-width="2"/>`,
    )
    .join('')}</g>`,
    space: `${r(70)
      .map(
        (i) =>
          `<circle cx="${(i * 233) % 1600}" cy="${(i * 127) % 900}" r="${i % 5 ? 1.3 : 2.6}" fill="#FFE27A" opacity="${0.35 + (i % 3) * 0.2}" class="${i % 6 ? '' : 'twinkle'}"/>`,
      )
      .join('')}
  <circle cx="1420" cy="140" r="70" fill="#FF8A3D"/><ellipse cx="1420" cy="148" rx="120" ry="24" fill="none" stroke="#FFD23F" stroke-width="8" transform="rotate(-14 1420 148)"/>
  <circle cx="150" cy="700" r="110" fill="#5B4BC4"/><circle cx="110" cy="660" r="24" fill="#4A3BB0"/><circle cx="190" cy="740" r="16" fill="#4A3BB0"/>`,
    jungle: `<path d="M0 260 Q300 180 620 240 T1600 200 V900 H0Z" fill="#1F8A57" opacity=".7"/><path d="M0 420 Q400 340 820 400 T1600 380 V900 H0Z" fill="#2FA36B" opacity=".55"/>
  <g fill="#0F5C3A">${[
    [0, 0, 1.2],
    [1400, 40, 1],
    [1380, 760, 1.3],
    [-40, 780, 1.2],
  ]
    .map(
      ([x, y, s]) =>
        `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="80" cy="80" r="90"/><circle cx="180" cy="40" r="70"/><circle cx="20" cy="170" r="70"/></g>`,
    )
    .join('')}</g>
  <g>${[
    [120, 720],
    [1480, 420],
    [1300, 860],
  ]
    .map(
      ([x, y]) =>
        `<g transform="translate(${x} ${y})">${r(8)
          .map(
            (k) =>
              `<ellipse rx="12" ry="26" fill="#fff" transform="rotate(${k * 45}) translate(0 -24)"/>`,
          )
          .join('')}<circle r="11" fill="#FFC93C"/></g>`,
    )
    .join('')}</g>`,
    desert: `<circle cx="1360" cy="170" r="90" fill="#FFE08A" class="pulse-sun"/><path d="M0 600 Q400 480 820 580 T1600 540 V900 H0Z" fill="#E59A4D"/><path d="M0 720 Q500 640 980 710 T1600 690 V900 H0Z" fill="#D27E35"/>
  <g transform="translate(1380 560)" fill="#2F9E62"><rect x="30" y="0" width="40" height="190" rx="20"/><path d="M30 90 h-26 q-12 0-12-12 v-44" stroke="#2F9E62" stroke-width="24" fill="none" stroke-linecap="round"/><path d="M70 70 h26 q12 0 12-12 v-30" stroke="#2F9E62" stroke-width="24" fill="none" stroke-linecap="round"/></g>`,
    arctic: `<g class="drift" fill="#fff" opacity=".8">${r(30)
      .map(
        (i) => `<circle cx="${(i * 211) % 1600}" cy="${(i * 97) % 800}" r="${2 + (i % 3) * 2}"/>`,
      )
      .join('')}</g>
  <path d="M1150 760 L1300 470 L1400 560 L1520 400 L1600 760Z" fill="#F4FBFF"/><path d="M1300 470 L1340 760 L1150 760Z" fill="#D6ECF8"/><path d="M0 760 Q400 720 800 750 T1600 740 V900 H0Z" fill="#5FA9D6"/>`,
    body: `${r(18)
      .map(
        (i) =>
          `<circle cx="${(i * 173) % 1600}" cy="${(i * 97) % 880}" r="${20 + (i % 4) * 14}" fill="#fff" opacity=".12"/>`,
      )
      .join(
        '',
      )}<path d="M0 450 h420 l40-80 l50 160 l40-120 l30 40 h1020" stroke="#fff" stroke-width="6" fill="none" opacity=".3" class="beat"/>`,
    past: `<circle cx="210" cy="170" r="80" fill="#FFE08A" opacity=".9"/><path d="M960 760 L1180 420 L1400 760Z" fill="#C9963F"/><path d="M1180 420 L1400 760 L1250 760Z" fill="#A87A2E"/><path d="M1300 760 L1440 560 L1580 760Z" fill="#C9963F"/><path d="M0 760 Q400 720 800 750 T1600 740 V900 H0Z" fill="#B07F3D"/>`,
    city: `${r(16)
      .map((i) => {
        const h = 160 + ((i * 61) % 260);
        return `<rect x="${i * 104}" y="${900 - h}" width="88" height="${h}" rx="10" fill="${['#3B2E91', '#4A3BB0', '#2D2270'][i % 3]}"/>${r(
          Math.floor(h / 48),
        )
          .map(
            (j) =>
              `<rect x="${i * 104 + 16}" y="${920 - h + j * 44}" width="16" height="16" rx="3" fill="#FFD23F" opacity="${0.3 + (j % 3) * 0.25}"/><rect x="${i * 104 + 50}" y="${920 - h + j * 44}" width="16" height="16" rx="3" fill="#FFD23F" opacity=".35"/>`,
          )
          .join('')}`;
      })
      .join('')}
  ${['+', '×', '÷', '='].map((s, i) => `<text x="${120 + i * 380}" y="${180 + (i % 2) * 90}" font-family="Baloo 2" font-size="90" font-weight="800" fill="#fff" opacity=".12" class="drift">${s}</text>`).join('')}`,
  };
  return `<svg class="wbg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="wg-${w}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#wg-${w})"/>${L[w] || ''}</svg>`;
}
