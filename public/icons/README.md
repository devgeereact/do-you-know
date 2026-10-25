# App icons

Drop your generated PNG icons here. The manifest in `vite.config.ts` expects:

| File                     | Size    | Purpose   |
| ------------------------ | ------- | --------- |
| `pwa-192.png`            | 192×192 | any       |
| `pwa-512.png`            | 512×512 | any       |
| `pwa-maskable-512.png`   | 512×512 | maskable  |

Fast way to generate all sizes from one source image:

```bash
npx pwa-asset-generator ./logo.png ./public/icons \
  --background "#1570C2" --padding "18%" --icon-only
```

Then confirm the filenames match the `manifest.icons` entries in `vite.config.ts`.

Current icons are the Do You Know mark (yellow speech bubble with a "?" on sky blue),
rendered from `public/favicon.svg`. The maskable icon keeps the mark inside the 70% safe zone.
