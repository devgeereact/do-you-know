import {
  answerCurrentQuestion,
  expect,
  expectNoHorizontalOverflow,
  playThrough,
  QUIZ,
  test,
} from './support/test';

test.describe('playing a quiz', () => {
  test('practice: quiz page to results with a full review, and no answer leaks before answering', async ({
    page,
    api,
  }) => {
    await page.goto(`/q/${QUIZ.slug}`);
    await page.getByRole('link', { name: 'Just practise' }).click();
    await expect(page).toHaveURL(new RegExp(`/play/${QUIZ.slug}\\?mode=practice`));

    // First question: no answer is shown or marked before the player picks.
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await expect(page.getByText('✓')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // Answer 1 right, 2 wrong, 3 right so the review has both outcomes.
    await answerCurrentQuestion(page, true);
    await expect(page.getByRole('heading', { name: 'Correct!' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Next question' }).click();

    await expect(page.getByText('Question 2 of 3')).toBeVisible();
    await answerCurrentQuestion(page, false);
    await expect(page.getByRole('heading', { name: 'So close!' })).toBeVisible();
    await page.getByRole('button', { name: 'Next question' }).click();

    await expect(page.getByText('Question 3 of 3')).toBeVisible();
    await answerCurrentQuestion(page, true);
    await page.getByRole('button', { name: 'See my score' }).click();

    // Results: score from the server and a review of all three.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('2 / 3');
    await expect(page.getByRole('heading', { name: 'Your answers' })).toBeVisible();
    const review = page.getByRole('list').filter({ hasText: 'Answer:' });
    await expect(review.getByRole('listitem')).toHaveCount(3);
    await expect(review).toContainText('Not quite');
    await expect(review).toContainText('Right');
    await expect(
      review.getByRole('link', { name: 'Where this comes from' }).first(),
    ).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('navigation', { name: 'What next' })).toBeVisible();
    // Practice has no leaderboard.
    await expect(page.getByRole('heading', { name: 'Leaderboard' })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // Integrity: nothing with answers crossed the wire before an answer, and the
    // browser never posted a score, rank or time.
    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
    expect(api.count('/answer')).toBe(3);
  });

  test('play again starts a fresh attempt', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await playThrough(page);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
  });

  test('a refresh resumes where the player was, and Leave returns to the quiz page', async ({
    page,
  }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    await answerCurrentQuestion(page, true);
    await page.getByRole('button', { name: 'Next question' }).click();
    await expect(page.getByText('Question 2 of 3')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Question 2 of 3')).toBeVisible();

    await page.getByRole('link', { name: 'Leave' }).click();
    await expect(page).toHaveURL(new RegExp(`/q/${QUIZ.slug}$`));
  });

  test('the play screen lays out side by side on desktop and stacks on a phone', async ({
    page,
  }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    const prompt = await page.getByRole('heading', { level: 1 }).boundingBox();
    const answers = await page.getByRole('region', { name: 'Answers' }).boundingBox();
    if (!prompt || !answers) throw new Error('layout boxes missing');
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 1024) {
      expect(answers.x).toBeGreaterThan(prompt.x + prompt.width * 0.5);
    } else {
      expect(answers.y).toBeGreaterThan(prompt.y);
    }
    await expectNoHorizontalOverflow(page);
  });

  test('answer buttons are comfortable tap targets', async ({ page }) => {
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    const buttons = await page.getByRole('region', { name: 'Answers' }).getByRole('button').all();
    // A slider question has a single "Lock it in" button; the others have two or three options.
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    for (const button of buttons) {
      expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
    }
  });
});

test.describe('an expired device code', () => {
  // The first /me is expected to answer 401 for the stale code.
  test.use({ allowConsoleErrors: [/status of 401/] });

  test('a cold link straight into play starts a fresh guest instead of failing', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'dyk-guest',
        JSON.stringify({ token: `guest_${'0'.repeat(64)}`, expires_at: '2000-01-01T00:00:00Z' }),
      );
    });
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    await expect(page.getByText('Question 1 of 3')).toBeVisible();
    const stored = await page.evaluate(() => localStorage.getItem('dyk-guest'));
    expect(stored).not.toContain('0'.repeat(64));
  });
});
