import { expect, expectNoHorizontalOverflow, test } from './support/test';
import type { Page } from '@playwright/test';

const START = '/play/e2e-assign-quiz?mode=practice';

/** What the seeded assign quiz asks and where each thing goes. */
const KEY: Record<string, { right: [string, string][]; wrong: [string, string][] }> = {
  'Match each animal to its home.': {
    right: [
      ['Fish', 'Sea'],
      ['Bird', 'Nest'],
      ['Rabbit', 'Burrow'],
    ],
    wrong: [
      ['Fish', 'Nest'],
      ['Bird', 'Sea'],
      ['Rabbit', 'Burrow'],
    ],
  },
  'Sort the numbers.': {
    right: [
      ['3', 'Odd'],
      ['8', 'Even'],
      ['5', 'Odd'],
      ['12', 'Even'],
    ],
    wrong: [
      ['3', 'Even'],
      ['8', 'Even'],
      ['5', 'Odd'],
      ['12', 'Even'],
    ],
  },
  'Sort the things by how hot they are.': {
    right: [
      ['Fire', 'Hot'],
      ['Ice', 'Cold'],
      ['Tea', 'Warm'],
    ],
    wrong: [
      ['Fire', 'Cold'],
      ['Ice', 'Hot'],
      ['Tea', 'Warm'],
    ],
  },
};

const prompt = async (page: Page): Promise<string> =>
  ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();

async function place(page: Page, pairs: [string, string][]): Promise<void> {
  const tray = page.getByRole('list', { name: 'Things to place' });
  for (const [item, to] of pairs) {
    await tray.getByRole('button', { name: item, exact: true }).click();
    await page.getByRole('button', { name: `Put it in ${to}`, exact: true }).click();
  }
}

test.describe('assign questions: match pairs, sort into groups', () => {
  test('a child plays all three by tapping, and the key is never sent early', async ({
    page,
    api,
  }, info) => {
    await page.goto(START);
    for (let i = 0; i < 3; i += 1) {
      await expect(page.getByRole('list', { name: 'Things to place' })).toBeVisible();
      const spec = KEY[await prompt(page)];
      if (!spec) throw new Error('Unexpected assign question');

      await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeDisabled();
      await expect(page.getByRole('textbox')).toHaveCount(0);
      const sizes = await page
        .locator('[data-q-assign] button')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(56);
      await expectNoHorizontalOverflow(page);

      if (i === 0 && info.project.name === 'mobile') {
        // Place one, take it back: it returns to the tray and Check is still not ready.
        const [item, to] = spec.right[0] ?? ['', ''];
        await place(page, [[item, to]]);
        await page.getByRole('button', { name: new RegExp(`${item} is in ${to}`, 'i') }).click();
        await expect(
          page
            .getByRole('list', { name: 'Things to place' })
            .getByRole('button', { name: item, exact: true }),
        ).toBeVisible();
      }

      await place(page, spec.right);
      await page.getByRole('button', { name: 'Check', exact: true }).click();
      await expect(page.getByRole('heading', { level: 2 })).toContainText('Correct');
      await page.getByRole('button', { name: i === 2 ? 'See my score' : 'Next question' }).click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 / 3');
    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });

  test('a wrong answer shows the right pairs, and the child can keep going', async ({ page }) => {
    await page.goto(START);
    await expect(page.getByRole('list', { name: 'Things to place' })).toBeVisible();
    const spec = KEY[await prompt(page)];
    if (!spec) throw new Error('Unexpected assign question');
    await place(page, spec.wrong);
    await page.getByRole('button', { name: 'Check', exact: true }).click();
    await expect(page.getByRole('heading', { level: 2 })).toContainText(
      /close|not quite|oops|nearly/i,
    );
    const [first] = spec.right;
    await expect(page.getByText(`${first?.[0]} → ${first?.[1]}`).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
  });
});
