#!/usr/bin/env node
// Renders the PWA icons and the social share image from public/favicon.svg (the brand mark).
// Run after changing the logo: node scripts/brand-assets.mjs
// Uses the Playwright already in devDependencies with the installed Chrome. Output is committed.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const mark = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const out = (f) => new URL(`../public/${f}`, import.meta.url).pathname;
const MIST = '#F6F4FD';

const page = (body, w, h) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Outfit:wght@500;600&display=block" rel="stylesheet">
<style>html,body{margin:0;width:${w}px;height:${h}px;overflow:hidden}*{box-sizing:border-box}</style></head><body>${body}</body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
async function shot(html, w, h, file) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.setContent(page(html, w, h), { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: out(file), omitBackground: false });
  await p.close();
}

const square = (size, scale) =>
  `<div style="width:${size}px;height:${size}px;background:${MIST};display:grid;place-items:center">
   <div style="width:${size * scale}px;height:${size * scale}px">${mark.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div>`;

await shot(square(192, 0.82), 192, 192, 'icons/pwa-192.png');
await shot(square(512, 0.82), 512, 512, 'icons/pwa-512.png');
// Maskable: the mark sits inside the central 60% so any platform mask keeps it whole.
await shot(square(512, 0.6), 512, 512, 'icons/pwa-maskable-512.png');
await shot(square(180, 0.8), 180, 180, 'icons/apple-touch-icon.png');

const og = `<div style="width:1200px;height:630px;background:linear-gradient(135deg,#6C4CF5 0%,#5233D9 55%,#17153A 100%);color:#fff;display:flex;align-items:center;gap:56px;padding:0 96px;font-family:Outfit,sans-serif;position:relative;overflow:hidden">
  <div style="position:absolute;right:-120px;top:-120px;width:520px;height:520px;border-radius:50%;background:rgba(255,210,63,.14)"></div>
  <div style="position:absolute;right:120px;bottom:-160px;width:380px;height:380px;border-radius:50%;background:rgba(20,184,166,.16)"></div>
  <div style="width:260px;height:260px;flex:none;background:#fff;border-radius:64px;display:grid;place-items:center;box-shadow:0 18px 0 rgba(0,0,0,.18)"><div style="width:200px;height:200px">${mark.replace('<svg ', '<svg width="100%" height="100%" ')}</div></div>
  <div style="position:relative"><div style="font-family:'Baloo 2';font-weight:800;font-size:96px;line-height:.95;letter-spacing:-1px">Do You <span style="color:#FFD23F">Know?</span></div>
  <div style="font-size:34px;font-weight:500;margin-top:18px;opacity:.92;max-width:640px">Quick, bright quizzes for curious kids. A new daily challenge every morning.</div>
  <div style="margin-top:28px;font-size:26px;font-weight:600;color:#FFD23F">doyouknow.space</div></div></div>`;
await shot(og, 1200, 630, 'og-image.png');

await browser.close();
console.log('Brand assets written: icons/pwa-192.png, pwa-512.png, pwa-maskable-512.png, apple-touch-icon.png, og-image.png');
