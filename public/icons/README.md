# App icons

Drop your generated PNG icons here. The manifest in `vite.config.ts` expects:

| File                     | Size    | Purpose   |
| ------------------------ | ------- | --------- |
| `pwa-192.png`            | 192×192 | any       |
| `pwa-512.png`            | 512×512 | any       |
| `pwa-maskable-512.png`   | 512×512 | maskable  |

Also `apple-touch-icon.png` (180×180, linked from index.html).

All of these, plus `public/og-image.png`, are rendered from the brand mark in `public/favicon.svg`
by `node scripts/brand-assets.mjs` (Playwright with the installed Chrome). Change the mark, run the
script, commit the PNGs.

Current mark (31 October 2026): the Do You Know logo, a chunky purple speech bubble with a yellow
question mark and an orange spark, on the Mist background. The maskable icon keeps the mark
inside the central 60% so every platform mask leaves it whole. The same artwork is the
`LogoMark` React component in `src/components/brand/Logo.tsx`.
