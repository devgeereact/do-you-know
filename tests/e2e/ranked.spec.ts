import { expect, expectNoHorizontalOverflow, playThrough, QUIZ, test } from './support/test';

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

    // Character: the presets are the Do You Know characters (ids unchanged), picked on the profile.
    await page.goto('/me/avatar');
    await expect(page).toHaveURL('/me#character');
    const characters = page.getByRole('region', { name: 'Your character' }).getByRole('button');
    await expect(characters).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
    await characters.filter({ hasText: 'Mug' }).click();
    await expect(page.getByText('Mug is your character now.')).toBeVisible();
    await expect(characters.filter({ hasText: 'Mug' })).toHaveAttribute('aria-pressed', 'true');

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

  test('a player can change their nickname exactly once', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}`);
    await playThrough(page, [true, false, true]);
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/);

    await page.getByRole('button', { name: 'Change my nickname' }).click();
    const options = page.getByRole('radiogroup', { name: 'Pick a new nickname' }).getByRole('radio');
    await expect(options).toHaveCount(4);
    const pick = (await options.nth(2).textContent())?.trim() ?? '';
    await options.nth(2).click();
    await page.getByRole('button', { name: `Use ${pick}` }).click();
    // Nothing changes until the player confirms the one change.
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toContainText(`Become ${pick} for good?`);
    await confirm.getByRole('button', { name: 'Yes, change it' }).click();

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(pick);
    await expect(page.getByRole('link', { name: `Your profile: ${pick}` })).toBeVisible();
    await expect(page.getByText('Your nickname is set for good', { exact: false })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Change my nickname' })).toHaveCount(0);
  });

  test('guests never get a free-text name box', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'Your character' })).toBeVisible();
    await page.getByRole('button', { name: 'Change my nickname' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Pick a new nickname' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('textbox')).toHaveCount(0);
  });
});
