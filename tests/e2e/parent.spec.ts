import type { Page } from '@playwright/test';
import { expect, expectNoHorizontalOverflow, QUIZ, test } from './support/test';

// Two seeded children (tests/e2e/support/fixture.php): the parent of OFF has every switch off, the parent of
// ON has every switch on. The browser plays as a child by holding that child's session, as after a hand-over.
const OFF = 'guest_e2e_child_off';
const ON = 'guest_e2e_child_on';
const asChild = async (page: Page, token: string): Promise<void> => {
  await page.addInitScript((t) => {
    localStorage.setItem(
      'dyk-guest',
      JSON.stringify({ token: t, expires_at: '2099-01-01T00:00:00Z' }),
    );
  }, token);
};
const nav = (page: Page) => page.getByRole('link', { name: /^(Leaderboards|Boards)$/ });

test.describe('the default path: every switch off', () => {
  test('there is no leaderboards tab, no board on a quiz, and play is practice', async ({
    page,
  }) => {
    await asChild(page, OFF);
    await page.goto(`/q/${QUIZ.slug}`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(QUIZ.title);
    await expect(nav(page)).toHaveCount(0);
    await expect(page.getByText('Top players')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Just practise' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Play now' })).toHaveAttribute(
      'href',
      /mode=practice/,
    );
    await expectNoHorizontalOverflow(page);
  });

  test('a direct link to the leaderboards still opens', async ({ page }) => {
    await asChild(page, OFF);
    await page.goto('/leaderboards');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Leaderboards');
  });

  test('a game is untimed and uses the number keypad, and ends with no challenge button', async ({
    page,
  }) => {
    await asChild(page, OFF);
    const started = page.waitForRequest(
      (r) => r.url().endsWith('/attempts') && r.method() === 'POST',
    );
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    expect(JSON.parse((await started).postData() ?? '{}')).not.toHaveProperty('timed');
    for (let i = 0; i < 3; i += 1) {
      const prompt = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
      if (prompt === 'How many sides does a pentagon have?') {
        await expect(page.getByRole('group', { name: 'Your number' })).toBeVisible();
        await expect(page.getByRole('slider')).toHaveCount(0);
        await page.getByRole('button', { name: '5', exact: true }).click();
        await page
          .getByRole('button', { name: /lock it in|check|answer/i })
          .first()
          .click();
      } else {
        await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
      }
      await page.getByRole('button', { name: i === 2 ? 'See my score' : 'Next question' }).click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('/ 3');
    await expect(page.getByRole('button', { name: 'Challenge a friend' })).toHaveCount(0);
  });

  test('adult and trivia sets are not listed for a child, but their link opens', async ({
    page,
  }) => {
    await asChild(page, OFF);
    await page.goto('/c/e2e-general');
    await expect(
      page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) }).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /E2E Build Quiz/ })).toHaveCount(0);
    await page.goto('/q/e2e-build-quiz');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E Build Quiz');
  });

  test('the easy-read font is not applied', async ({ page }) => {
    await asChild(page, OFF);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-easy-read', 'false');
  });
});

test.describe('the same child once the parent turns everything on', () => {
  test('boards, ranked play and the challenge appear', async ({ page }) => {
    await asChild(page, ON);
    await page.goto(`/q/${QUIZ.slug}`);
    await expect(nav(page).first()).toBeVisible();
    await expect(page.getByText('Top players')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Just practise' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Play now' })).not.toHaveAttribute(
      'href',
      /mode=practice/,
    );
  });

  test('a game asks for the countdown and shows a slider for number questions', async ({
    page,
  }) => {
    await asChild(page, ON);
    const started = page.waitForRequest(
      (r) => r.url().endsWith('/attempts') && r.method() === 'POST',
    );
    await page.goto(`/play/${QUIZ.slug}?mode=practice`);
    expect(JSON.parse((await started).postData() ?? '{}')).toMatchObject({ timed: true });
    for (let i = 0; i < 3; i += 1) {
      const prompt = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
      if (prompt === 'How many sides does a pentagon have?') {
        await expect(page.getByRole('slider')).toBeVisible();
        return;
      }
      await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next question' }).click();
    }
    throw new Error('the number question never came up');
  });

  test('adult sets are listed, and the easy-read font is on', async ({ page }) => {
    await asChild(page, ON);
    await page.goto('/c/e2e-general');
    await expect(page.getByRole('link', { name: /E2E Build Quiz/ }).first()).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-easy-read', 'true');
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family).toContain('Atkinson Hyperlegible');
  });
});

test.describe('a guest is the same as a child whose parent turned nothing on', () => {
  test('no leaderboards tab for a fresh guest', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: new RegExp(`^${QUIZ.title}`) }).last(),
    ).toBeVisible();
    await expect(nav(page)).toHaveCount(0);
  });
});
