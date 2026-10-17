import { expect, expectNoHorizontalOverflow, playThrough, QUIZ, test } from './support/test';

test.describe('friend challenge', () => {
  test('create a link, open it as another player and play head to head', async ({
    page,
    newPlayer,
    api,
  }) => {
    // Player one finishes a perfect game and makes a challenge link.
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page, [true, true, true]);
    await page.getByRole('button', { name: 'Challenge a friend' }).click();
    const shown = page.getByText(/\/challenge\/[A-Za-z0-9]{8}$/);
    await expect(shown).toBeVisible();
    const link = (await shown.innerText()).replace(/^Challenge link:\s*/, '').trim();
    expect(link).toMatch(/^http:\/\/localhost:\d+\/challenge\/[A-Za-z0-9]{8}$/);
    await expectNoHorizontalOverflow(page);

    // Player two has their own browser storage, so no shared session.
    const friend = await newPlayer();
    await friend.page.goto(link);
    await expect(friend.page.getByRole('heading', { level: 1 })).toContainText('scored 3/3');
    await expect(friend.page.getByText('Can you beat it?')).toBeVisible();
    await expect(friend.page.getByText('E2E Quick Quiz')).toBeVisible();
    // The preview shows a nickname and a score only.
    const preview = friend.api.records.find((r) => r.path.startsWith('/challenges/'));
    expect(
      Object.keys((JSON.parse(preview?.body ?? '{}') as { creator: object }).creator).sort(),
    ).toEqual(['avatar_id', 'nickname']);
    await expectNoHorizontalOverflow(friend.page);

    await friend.page.getByRole('link', { name: 'Accept the challenge' }).click();
    await expect(friend.page).toHaveURL(/\/challenge\/[A-Za-z0-9]{8}\/play$/);
    await playThrough(friend.page, [true, false, true]);

    // Head to head: the server decides the winner (3/3 beats 2/3).
    await expect(friend.page.getByRole('heading', { level: 1 })).toContainText('2 / 3');
    const versus = friend.page.getByRole('region', { name: 'Head to head' });
    await expect(versus).toBeVisible();
    await expect(versus).toContainText('wins this time');
    await expect(versus.getByText('You', { exact: true })).toBeVisible();
    await expect(versus).toContainText('2/3');
    await expect(versus).toContainText('3/3');
    // A challenge game cannot be re-challenged and has no leaderboard.
    await expect(friend.page.getByRole('button', { name: 'Challenge a friend' })).toHaveCount(0);
    await expect(friend.page.getByRole('heading', { name: 'Leaderboard' })).toHaveCount(0);
    await expectNoHorizontalOverflow(friend.page);

    friend.api.assertNoAnswersLeaked();
    friend.api.assertClientPostsNoScores();
    api.assertNoAnswersLeaked();
  });
});

test.describe('friend challenge, refused by the server', () => {
  // The browser logs the refusal (a 4xx) as a console error; that is expected here.
  test.use({ allowConsoleErrors: [/status of 4\d\d/] });

  test('the creator cannot play their own challenge', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page);
    await page.getByRole('button', { name: 'Challenge a friend' }).click();
    const shown = page.getByText(/\/challenge\/[A-Za-z0-9]{8}$/);
    const link = (await shown.innerText()).replace(/^Challenge link:\s*/, '').trim();

    await page.goto(new URL(link).pathname + '/play');
    await expect(page.getByRole('alert')).toContainText('your own challenge');
  });
});
