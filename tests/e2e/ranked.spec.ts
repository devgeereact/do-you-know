import { expect, expectNoHorizontalOverflow, playThrough, QUIZ, test } from './support/test';

/** A nickname that passes the server's rules and is unlikely to repeat across runs. */
function nickname(prefix: string): string {
  return `${prefix}${Math.floor(Math.random() * 1e6)}`;
}

test.describe('ranked play, nickname, avatar and leaderboard', () => {
  // Every new player gets a generated nickname (since 26 October 2026), so a ranked round goes
  // straight onto the board with no age question or typed name.
  test('a ranked round puts the player on the board, then they pick an avatar', async ({
    page,
    api,
  }) => {
    await page.goto(`/q/${QUIZ.slug}`);
    await page.getByRole('link', { name: 'Play now' }).click();
    await expect(page).toHaveURL(new RegExp(`/play/${QUIZ.slug}$`));
    await playThrough(page, [true, true, true]);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 / 3');

    const board = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Leaderboard', exact: true }) });
    await expect(board).toBeVisible();
    const mine = board.getByRole('listitem').filter({ hasText: 'You' });
    await expect(mine).toBeVisible();
    await expect(mine).toContainText('3/3');
    await expectNoHorizontalOverflow(page);

    // Avatar: the presets are the Do You Know characters (ids unchanged).
    await page.goto('/me/avatar');
    await expect(page.getByRole('heading', { level: 1, name: 'Pick your avatar' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('list').getByRole('button')).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Mug' }).click();
    await expect(page).toHaveURL('/me');
    await expect(page.getByRole('img', { name: 'Your avatar' }).locator('svg')).toBeVisible();

    // The quiz's own board shows the player with their score.
    await page.goto(`/leaderboards?quiz=${QUIZ.slug}`);
    await expect(page.getByRole('listitem').filter({ hasText: 'You' })).toContainText('3/3');
    await expectNoHorizontalOverflow(page);

    // Public data only: the board payload exposes nickname, avatar and score, never ids.
    const boardCall = api.records.filter((r) => r.path.startsWith('/leaderboards')).at(-1);
    const row0 = (JSON.parse(boardCall?.body ?? '{}') as { top: object[] }).top[0] ?? {};
    expect(Object.keys(row0).sort()).toEqual(
      [
        'achieved_at',
        'answer_time_ms',
        'avatar_id',
        'correct',
        'is_me',
        'nickname',
        'rank',
        'total',
        // Likes (migration 0011): an opaque entry handle and counts, never a player id.
        'entry_id',
        'liked_by_me',
        'likes',
      ].sort(),
    );

    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });

  test('the profile menu swaps the generated nickname for a new one', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}`);
    await playThrough(page, [true, false, true]);
    await page.goto('/me');
    const name = page.getByText(/^[A-Z][a-z]+[A-Z][a-z]+\d*$/).first();
    const before = (await name.textContent())?.trim();
    expect(before).toBeTruthy();

    await page.getByRole('button', { name: /^Your profile:/ }).click();
    await expect(page.getByRole('menu', { name: 'Profile menu' })).toBeVisible();
    await page.getByRole('menuitem', { name: 'New nickname' }).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Your profile:/ })).not.toHaveAccessibleName(
      `Your profile: ${before}`,
    );
  });

  test('guests never get a free-text name box', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('textbox')).toHaveCount(0);
  });
});
