import { expect, expectNoHorizontalOverflow, QUIZ, test } from './support/test';

test.describe('browse', () => {
  test('home loads, lists the seeded quiz and fits the screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Quick quizzes for curious minds',
    );
    await expect(page.getByRole('heading', { name: 'Pick a quiz' })).toBeVisible();

    // The quiz shows twice: in "Trending this week" and in the full list below it.
    const trending = page.getByRole('region', { name: /Trending/ });
    await expect(trending.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) })).toBeVisible();
    const card = page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) }).last();
    await expect(card).toBeVisible();
    await expect(card).toContainText('3 questions');
    await expect(
      page
        .getByRole('navigation', { name: 'Categories' })
        .getByRole('link', { name: QUIZ.category }),
    ).toBeVisible();
    // Today's challenge banner is offered because the fixture has a live daily.
    await expect(page.getByRole('link', { name: /Today’s challenge/ }).first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('a category page lists its quizzes', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Categories' })
      .getByRole('link', { name: QUIZ.category })
      .click();
    await expect(page).toHaveURL(/\/c\/e2e-general$/);
    await expect(page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('the quiz landing page shows the facts and both ways to play', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('link', { name: new RegExp(`^${QUIZ.title}`) })
      .last()
      .click();
    await expect(page).toHaveURL(new RegExp(`/q/${QUIZ.slug}$`));
    await expect(page.getByRole('heading', { level: 1, name: QUIZ.title })).toBeVisible();
    await expect(page.getByText('3 questions')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play now' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Just practise' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top players' })).toBeVisible();
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
    await page.getByRole('button', { name: "Today's challenge" }).click();
    await expect(page.getByRole('button', { name: "Today's challenge" })).toHaveAttribute(
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
    await expect(page.getByRole('link', { name: /Today’s challenge/ }).first()).toBeVisible();
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
