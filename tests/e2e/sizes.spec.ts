import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { FIXTURE_PHP, REPO_ROOT } from './support/env';
import {
  answerCurrentQuestion,
  expect,
  expectNoHorizontalOverflow,
  QUIZ,
  test,
} from './support/test';

// The Phase 1 phone checks (.planning/phases/01-clean-up-and-foundations/01-HUMAN-UAT.md, tests 1 to 3)
// repeated at the common phone and tablet sizes. Chromium with touch, so this is the layout and tap
// behaviour at each size, not Safari's own engine.
const SIZES = [
  { name: 'iPhone SE', width: 375, height: 667, phone: true },
  { name: 'iPhone 15', width: 390, height: 844, phone: true },
  { name: 'iPhone Pro Max', width: 430, height: 932, phone: true },
  { name: 'small Android', width: 360, height: 740, phone: true },
  { name: 'iPad mini', width: 768, height: 1024, phone: false },
  { name: 'iPad Air', width: 820, height: 1180, phone: false },
  { name: 'iPad landscape', width: 1024, height: 768, phone: false },
  { name: 'small laptop', width: 1280, height: 800, phone: false },
  { name: 'laptop', width: 1440, height: 900, phone: false },
];

async function asChild(page: Page): Promise<void> {
  const token = `guest_e2e_sizes_${randomBytes(8).toString('hex')}`;
  execFileSync('php', [FIXTURE_PHP, 'child', 'off', token], { cwd: REPO_ROOT, env: process.env });
  await page.addInitScript((t) => {
    localStorage.setItem(
      'dyk-guest',
      JSON.stringify({ token: t, expires_at: '2099-01-01T00:00:00Z' }),
    );
  }, token);
}

for (const size of SIZES) {
  test.describe(`${size.name} ${size.width}x${size.height}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: true,
      isMobile: size.phone,
      allowConsoleErrors: [/no_learn_content|status of 4\d\d/],
    });

    // Playwright needs an object pattern for the fixtures argument, even an empty one.
    // eslint-disable-next-line no-empty-pattern
    test.beforeEach(({}, info) => {
      test.skip(
        info.project.name === 'mobile',
        'sizes are set per describe; one project is enough',
      );
    });

    test('a guest cannot type anywhere and nothing overflows', async ({ page }, info) => {
      for (const path of ['/', `/q/${QUIZ.slug}`, '/contact', '/me', '/leaderboards', '/privacy']) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await expect(page.locator('textarea')).toHaveCount(0);
        await expect(
          page.locator('input[type=text], input[type=email], input:not([type])'),
        ).toHaveCount(0);
        await expect(page.locator('input[type=checkbox]')).toHaveCount(0);
        await expectNoHorizontalOverflow(page);
        if (path === '/') {
          await page.screenshot({ path: info.outputPath(`guest-home-${size.width}.png`) });
        }
      }
      await page.goto('/contact');
      await expect(page.getByText(/grown-up/i).first()).toBeVisible();
    });

    test('the friend never covers an answer and never catches a tap', async ({ page }, info) => {
      await page.goto(`/play/${QUIZ.slug}?mode=practice`);
      await expect(page.getByText('Question 1 of 3')).toBeVisible();
      await answerCurrentQuestion(page, true);
      await expect(page.getByRole('heading', { name: 'Correct!' })).toBeVisible();
      await page.waitForTimeout(900); // the friend hops once, then the sheet has risen
      const host = page.locator('[data-q-host]');
      await expect(host).toBeVisible();
      const box = await host.boundingBox();
      if (!box) throw new Error('friend has no box');
      // A tap on the friend lands on whatever is underneath, never on the friend itself.
      const caught = await page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y);
          return !!el?.closest('[data-q-host]');
        },
        { x: box.x + box.width / 2, y: box.y + box.height / 2 },
      );
      expect(caught).toBe(false);
      // The friend sits clear of every answer button.
      for (const b of await page
        .getByRole('region', { name: 'Answers' })
        .getByRole('button')
        .all()) {
        const r = await b.boundingBox();
        if (!r) continue;
        const overlap = !(
          box.x + box.width <= r.x ||
          r.x + r.width <= box.x ||
          box.y + box.height <= r.y ||
          r.y + r.height <= box.y
        );
        expect(overlap).toBe(false);
      }
      // The way on is always on screen: the Next button sits inside the visible window.
      const next = await page
        .getByRole('button', { name: /Next question|See my score/ })
        .boundingBox();
      if (!next) throw new Error('no next button');
      if (!size.phone) expect(next.y + next.height).toBeLessThanOrEqual(size.height);
      await page.screenshot({ path: info.outputPath(`friend-right-${size.width}.png`) });
      await page.getByRole('button', { name: 'Next question' }).click();
      await expect(page.getByText('Question 2 of 3')).toBeVisible();
      await answerCurrentQuestion(page, false);
      await expect(page.getByRole('heading', { name: 'So close!' })).toBeVisible();
      await page.waitForTimeout(900);
      await page.screenshot({ path: info.outputPath(`friend-wrong-${size.width}.png`) });
      await expectNoHorizontalOverflow(page);
    });

    test('a child plays a session of ten and reads the end screen', async ({ page }, info) => {
      await asChild(page);
      await page.goto('/');
      await page.getByRole('link', { name: 'Practise Words' }).click();
      await expect(page).toHaveURL(/\/learn\/literacy$/);
      for (let i = 0; i < 10; i += 1) {
        await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
        if (i === 4)
          await page.screenshot({ path: info.outputPath(`child-feedback-${size.width}.png`) });
        await page
          .getByRole('button', { name: i === 9 ? 'See my score' : 'Next question' })
          .click();
      }
      await expect(page.getByText('You earned a sticker')).toBeVisible();
      await expect(page.getByText(/Uh-oh/)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: info.outputPath(`child-end-${size.width}.png`) });
    });
  });
}
