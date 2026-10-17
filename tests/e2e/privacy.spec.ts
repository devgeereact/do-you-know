import { expect, expectNoHorizontalOverflow, playThrough, QUIZ, test } from './support/test';

test.describe('my games and deleting my data', () => {
  test('a new visitor sees an empty history; after a game it lists the score', async ({ page }) => {
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1, name: 'My games' })).toBeVisible();
    await expect(page.getByText('No games yet. Pick a quiz and give it a go!')).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page, [true, true, false]);

    await page.goto('/me');
    const games = page
      .getByRole('heading', { name: 'Recent games' })
      .locator('xpath=following-sibling::ul');
    await expect(games.getByRole('listitem')).toHaveCount(1);
    await expect(games).toContainText(QUIZ.title);
    await expect(games).toContainText('2/3');
    await expectNoHorizontalOverflow(page);
  });

  test('delete my data removes the player and their scores, and the next visit starts fresh', async ({
    page,
    api,
  }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page);
    await page.goto('/me');
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();

    // Nothing is deleted until the player confirms; keeping is the safe default.
    await page.getByRole('button', { name: 'Delete my account' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('This can’t be undone');
    await expect(dialog.getByRole('button', { name: 'Keep my account' })).toBeFocused();
    await dialog.getByRole('button', { name: 'Keep my account' }).click();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(api.records.some((r) => r.path === '/me/delete')).toBe(false);

    await page.getByRole('button', { name: 'Delete my account' }).click();
    await page.getByRole('button', { name: 'Yes, delete everything' }).click();
    await expect(page).toHaveURL('/');
    expect(api.records.find((r) => r.path === '/me/delete')?.status).toBe(200);

    // The guest token is gone from the browser, and a fresh visit has no history.
    const stored = await page.evaluate(() => localStorage.getItem('dyk-guest'));
    expect(stored).toBeNull();
    await page.goto('/me');
    await expect(page.getByText('No games yet. Pick a quiz and give it a go!')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your profile' })).toHaveCount(0);
  });

  test('the app stores no personal data: a guest token only', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page);
    const stored = await page.evaluate(() => {
      const entries: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key) entries[key] = localStorage.getItem(key) ?? '';
      }
      return entries;
    });
    expect(JSON.stringify(stored)).not.toMatch(/@|email|birth|name/i);
    expect(Object.keys(stored)).toContain('dyk-guest');
    expect(await page.context().cookies()).toEqual([]);
  });
});
