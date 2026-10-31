import { expect, expectNoHorizontalOverflow, QUIZ, test } from './support/test';

test.describe('browse', () => {
  test('home loads, lists the seeded quiz and fits the screen', async ({ page }, info) => {
    await page.goto('/');
    const desktop = info.project.name === 'desktop';
    // Computer and phone are different layouts: a hero on desktop, an app-style home on a phone.
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      desktop ? 'Every question is a new world to explore.' : 'Let’s play a quiz!',
    );
    const card = page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) }).last();
    await expect(card).toBeVisible();
    await expect(card).toContainText('3 questions');
    if (desktop) {
      await expect(page.getByRole('heading', { name: 'Explore by subject' })).toBeVisible();
      await expect(page.getByRole('link', { name: new RegExp(`^${QUIZ.category}`) })).toBeVisible();
    } else {
      await expect(page.getByRole('button', { name: QUIZ.category })).toBeVisible();
    }
    // Today's challenge card is offered because the fixture has a live daily.
    await expect(page.getByRole('link', { name: /Daily ·/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('a category page lists its quizzes', async ({ page }, info) => {
    await page.goto('/');
    if (info.project.name === 'desktop') {
      await page.getByRole('link', { name: new RegExp(`^${QUIZ.category}`) }).click();
    } else {
      // On a phone the subject chips filter the list; the chosen subject links to its page.
      await page.getByRole('button', { name: QUIZ.category }).click();
      await page.getByRole('link', { name: new RegExp(`See all .*${QUIZ.category}`) }).click();
    }
    await expect(page.getByRole('heading', { level: 1, name: QUIZ.category })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('the leaderboards page loads and switches boards', async ({ page }) => {
    await page.goto('/leaderboards');
    await expect(page.getByRole('heading', { level: 1, name: 'Leaderboards' })).toBeVisible();
    await page.getByRole('button', { name: 'This week' }).click();
    await expect(page.getByRole('button', { name: 'This week' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.getByRole('button', { name: 'This month' }).click();
    await expect(page.getByRole('button', { name: 'This month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expectNoHorizontalOverflow(page);
  });

  test('settings lets the player switch colours and remembers it', async ({ page }) => {
    await page.goto('/me/settings');
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
    await page.getByRole('radio', { name: /Dark/ }).check();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.getByRole('radio', { name: /Dark/ })).toBeChecked();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('radio', { name: /Light/ }).check();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('an unknown address shows the friendly 404 with a way home', async ({ page }) => {
    await page.goto('/this/page/does/not/exist');
    await expect(
      page.getByRole('heading', { level: 1, name: 'We can’t find that page' }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Find a quiz' }).click();
    await expect(page).toHaveURL('/');
  });

  test('an unknown friend challenge code explains itself kindly', async ({ page }) => {
    await page.goto('/challenge/ZZZZZZZZ');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Challenge not found' }),
    ).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('expired or doesn’t exist');
    await expectNoHorizontalOverflow(page);
  });

  test('the offline banner appears when the connection drops and goes when it returns', async ({
    page,
    context,
  }) => {
    await page.goto('/');
    // Wait for the catalogue to finish loading so no request is still in flight when we cut off.
    await expect(
      page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) }).last(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /Daily ·/ }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('You’re offline')).toHaveCount(0);

    await context.setOffline(true);
    const banner = page.getByRole('status').filter({ hasText: 'You’re offline' });
    await expect(banner).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await context.setOffline(false);
    await expect(banner).toBeHidden();
  });
});

test.describe('browse, when the server answers 404', () => {
  // The browser logs every 4xx response as a console error; these are the expected ones.
  test.use({ allowConsoleErrors: [/status of 404/] });

  test('an unknown quiz also shows the 404 page', async ({ page }) => {
    await page.goto('/q/no-such-quiz');
    await expect(
      page.getByRole('heading', { level: 1, name: 'We can’t find that page' }),
    ).toBeVisible();
  });
});
