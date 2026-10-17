import { expect, expectNoHorizontalOverflow, playThrough, QUIZ, test } from './support/test';

/** A nickname that passes the server's rules and is unlikely to repeat across runs. */
function nickname(prefix: string): string {
  return `${prefix}${Math.floor(Math.random() * 1e6)}`;
}

test.describe('ranked play, nickname, avatar and leaderboard', () => {
  test('a 13+ player plays ranked, picks a name and an avatar, and appears on the board', async ({
    page,
    api,
  }, testInfo) => {
    const name = nickname(`Ace${testInfo.project.name}`);

    await page.goto(`/q/${QUIZ.slug}`);
    await page.getByRole('link', { name: 'Play now' }).click();
    await expect(page).toHaveURL(new RegExp(`/play/${QUIZ.slug}$`));
    await playThrough(page, [true, true, true]);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 / 3');

    // Ranked results show the board and ask for an age group once, then a name.
    const board = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Leaderboard', exact: true }) });
    await expect(board).toBeVisible();
    await expect(board.getByRole('heading', { name: 'How old are you?' })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await board.getByRole('button', { name: '13 to 17' }).click();
    await expect(board.getByRole('heading', { name: 'Pick a leaderboard name' })).toBeVisible();
    // The save button stays off until the name is long enough.
    await expect(board.getByRole('button', { name: 'Save name' })).toBeDisabled();
    await board.getByRole('textbox', { name: 'Nickname' }).fill(name);
    await board.getByRole('button', { name: 'Save name' }).click();

    // The nickname form goes and the player is on the board marked as "You".
    await expect(board.getByRole('heading', { name: 'Pick a leaderboard name' })).toHaveCount(0);
    const mine = board.getByRole('listitem').filter({ hasText: name });
    await expect(mine).toBeVisible();
    await expect(mine).toContainText('You');
    await expect(mine).toContainText('3/3');

    // Avatar: choose the fox from the presets.
    await page.goto('/me/avatar');
    await expect(page.getByRole('heading', { level: 1, name: 'Pick your avatar' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('list').getByRole('button')).toHaveCount(12);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Fox' }).click();
    await expect(page).toHaveURL('/me');
    await expect(page.getByRole('img', { name: 'Your avatar' })).toContainText('🦊');
    await expect(page.getByText(`Leaderboard name:`)).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    // The full leaderboard for this quiz now shows name, avatar and score.
    await page.goto(`/leaderboards?quiz=${QUIZ.slug}`);
    const row = page.getByRole('listitem').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('🦊');
    await expect(row).toContainText('3/3');
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
      ].sort(),
    );

    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });

  test('an under-13 player can only shuffle a generated nickname', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}`);
    await playThrough(page, [true, false, true]);

    const board = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Leaderboard', exact: true }) });
    await board.getByRole('button', { name: 'Under 13' }).click();

    await expect(board.getByRole('heading', { name: 'Your leaderboard name' })).toBeVisible();
    // No free text box for children.
    await expect(board.getByRole('textbox')).toHaveCount(0);
    await expect(board.getByRole('button', { name: 'Shuffle' })).toBeVisible();
    await board.getByRole('button', { name: 'Use this name' }).click();
    await expect(board.getByRole('heading', { name: 'Your leaderboard name' })).toHaveCount(0);
    await expect(board.getByRole('listitem').filter({ hasText: 'You' })).toBeVisible();
  });

  test('choosing 18 or over leads to the typed nickname form and the age question is gone', async ({
    page,
  }) => {
    // A guest session is made when the player first plays; the profile card needs one.
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
    await page.getByRole('button', { name: '18 or over' }).click();
    await expect(page.getByRole('heading', { name: 'Pick a leaderboard name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Under 13' })).toHaveCount(0);
  });
});
