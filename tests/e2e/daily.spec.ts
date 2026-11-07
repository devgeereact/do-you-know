import { expect, expectNoHorizontalOverflow, playThrough, test } from './support/test';

test.describe('daily challenge', () => {
  // Replaying a finished daily is refused by the server, which the browser logs as a 4xx.
  test.use({ allowConsoleErrors: [/status of 4\d\d/] });

  test('play today once, then the app says it is done', async ({ page, api }, info) => {
    const desktop = info.project.name === 'desktop';
    await page.goto('/daily');
    // Every player is dealt their own questions from the whole bank, so the page is named for the day, not one quiz.
    await expect(page.getByRole('heading', { level: 1, name: 'Today’s challenge' })).toBeVisible();
    await expect(page.getByLabel('Top score today')).toBeVisible();
    await expect(page.getByTitle('The board updates by itself every few seconds.')).toBeVisible();
    await expect(page.getByText(/questions across \d+ worlds?/)).toBeVisible();
    // The daily page fits one screen: no page scroll.
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight),
    ).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);

    await page.getByRole('link', { name: 'Play today’s challenge' }).click();
    await expect(page).toHaveURL(/\/daily\/play$/);
    await playThrough(page, [true, true, false]);

    // Results show today's board, with no "play again" because it is one go a day.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('2 / 3');
    await expect(page.getByRole('heading', { name: "Today's leaderboard" })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Play again' })).toHaveCount(0);
    // A daily hand is private to its player, so it cannot be sent to a friend.
    await expect(page.getByRole('button', { name: 'Challenge a friend' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // Back on the daily page: done for today, streak started, no play button.
    await page.goto('/daily');
    await expect(page.getByText('Done for today. Come back tomorrow!')).toBeVisible();
    if (desktop) await expect(page.getByText('Your streak · 1 day')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play today’s challenge' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // The home banner agrees.
    await page.goto('/');
    await expect(page.getByText('Done for today. Back tomorrow.')).toBeVisible();

    // Going straight to the play URL again is refused kindly rather than starting a second game.
    await page.goto('/daily/play');
    await expect(page.getByRole('alert')).toContainText('played today');
    await expect(page.getByRole('link', { name: "Today's leaderboard" })).toBeVisible();

    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });
});
