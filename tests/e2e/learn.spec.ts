import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { expect, expectNoHorizontalOverflow, test } from './support/test';
import { FIXTURE_PHP, REPO_ROOT } from './support/env';

// A fresh child for each test (an Explorer, every switch off): learning sessions belong to a child with a record.
async function asChild(page: Page): Promise<void> {
  const token = `guest_e2e_learn_${randomBytes(8).toString('hex')}`;
  execFileSync('php', [FIXTURE_PHP, 'child', 'off', token], { cwd: REPO_ROOT, env: process.env });
  await page.addInitScript((t) => {
    localStorage.setItem(
      'dyk-guest',
      JSON.stringify({ token: t, expires_at: '2099-01-01T00:00:00Z' }),
    );
  }, token);
}

test.describe('a child learns', () => {
  test.use({ allowConsoleErrors: [/no_learn_content|status of 4\d\d/] });
  test('home offers four areas, and a session of ten ends with stars, a sticker and a next step', async ({
    page,
    api,
  }) => {
    await asChild(page);
    await page.goto('/');
    const tile = page.getByRole('link', { name: 'Practise Words' });
    await expect(tile).toBeVisible();
    await expect(
      page.getByRole('link', { name: /^Practise (Numbers|Science|Our world)$/ }),
    ).toHaveCount(3);
    await expectNoHorizontalOverflow(page);
    await tile.click();
    await expect(page).toHaveURL(/\/learn\/literacy$/);

    for (let i = 0; i < 10; i += 1) {
      await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
      await page.getByRole('button', { name: i === 9 ? 'See my score' : 'Next question' }).click();
    }
    await expect(page.getByRole('img', { name: /out of 3$/ })).toBeVisible();
    await expect(page.getByText('You earned a sticker')).toBeVisible();
    await expect(page.getByRole('link', { name: /^Practise .+ next$/ })).toBeVisible();
    // A learning session is private to the child: nothing to share, no friend challenge, no board.
    await expect(page.getByRole('button', { name: 'Challenge a friend' })).toHaveCount(0);
    await expect(page.getByText(/Leaderboard/)).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
    api.assertNoAnswersLeaked();

    // The sticker is in the book on the profile page.
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'My stickers' })).toBeVisible();
    await expect(page.getByText('Earned').first()).toBeVisible();
  });

  test('an area with nothing at the child level says so kindly instead of failing', async ({
    page,
  }) => {
    await asChild(page);
    await page.goto('/learn/science');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/nothing to practise here at your level/i).first()).toBeVisible();
  });

  test('a guest sees no learning tiles and no sticker book', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Practise Words' })).toHaveCount(0);
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'My stickers' })).toHaveCount(0);
  });
});
