import { expect, expectNoHorizontalOverflow, test } from './support/test';

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
    // The hand is ten questions drawn from every live quiz for children, so answer whatever comes up.
    const total = Number(
      /of (\d+)/.exec((await page.getByText(/Question 1 of \d+/).textContent()) ?? '')?.[1],
    );
    expect(total).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < total; i += 1) {
      await expect(page.getByText(`Question ${i + 1} of ${total}`)).toBeVisible();
      const keypad = page.getByRole('group', { name: 'Your number' });
      if (await keypad.isVisible()) {
        await keypad.getByRole('button', { name: '5', exact: true }).click();
        await page.getByRole('button', { name: 'Check', exact: true }).click();
      } else {
        await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
      }
      await page
        .getByRole('button', { name: i === total - 1 ? 'See my score' : 'Next question' })
        .click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText(`/ ${total}`);

    // Results show today's board, with no "play again" because it is one go a day.
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

    // Going straight to the play URL again does not start a second game and is not an error screen:
    // the player lands on the daily page, where the board is.
    await page.goto('/daily/play');
    await expect(page).toHaveURL(/\/daily$/);
    await expect(page.getByText('Done for today. Come back tomorrow!')).toBeVisible();

    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });
});
