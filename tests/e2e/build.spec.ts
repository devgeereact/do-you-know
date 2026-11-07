import { expect, expectNoHorizontalOverflow, test } from './support/test';

const START = '/play/e2e-build-quiz?mode=practice';

/** What the seeded build quiz asks and how to answer it by tapping. */
const QUESTIONS: Record<string, { right: string[]; wrong: string[] }> = {
  'Spell the pet that purrs.': { right: ['c', 'a', 't'], wrong: ['t', 'a', 'c'] },
  'Finish the sentence.': { right: ['sat', 'mat'], wrong: ['mat', 'sat'] },
  'Put the day in order.': {
    right: ['morning', 'noon', 'night'],
    wrong: ['night', 'noon', 'morning'],
  },
};

async function currentPrompt(page: import('@playwright/test').Page): Promise<string> {
  return ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
}

async function answer(page: import('@playwright/test').Page, labels: string[]): Promise<void> {
  const tiles = page.getByRole('list', { name: 'Tiles to tap' });
  for (const label of labels) {
    await tiles.getByRole('button', { name: label, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Check', exact: true }).click();
}

test.describe('build questions: spell, fill the gap, order the cards', () => {
  test('a child plays all three by tapping, and nothing about the answer is sent early', async ({
    page,
    api,
  }, info) => {
    await page.goto(START);
    for (let i = 0; i < 3; i += 1) {
      await expect(page.getByRole('list', { name: 'Tiles to tap' })).toBeVisible();
      const spec = QUESTIONS[await currentPrompt(page)];
      if (!spec) throw new Error('Unexpected build question');

      // Check is not ready until every space is full, there is no text box, and targets are big enough.
      await expect(page.getByRole('button', { name: 'Check', exact: true })).toBeDisabled();
      await expect(page.getByRole('textbox')).toHaveCount(0);
      const sizes = await page
        .getByRole('list', { name: 'Tiles to tap' })
        .getByRole('button')
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(56);
      await expectNoHorizontalOverflow(page);
      if (i === 0 && info.project.name === 'mobile') {
        // Place one tile, then take it back: its space empties and the tile is free again.
        const first = spec.right[0] ?? '';
        await page
          .getByRole('list', { name: 'Tiles to tap' })
          .getByRole('button', { name: first, exact: true })
          .click();
        await page
          .getByRole('button', {
            name: new RegExp(`space 1 of ${spec.right.length}: ${first}`, 'i'),
          })
          .click();
        await expect(
          page.getByRole('button', {
            name: new RegExp(`space 1 of ${spec.right.length}, empty`, 'i'),
          }),
        ).toBeVisible();
      }

      await answer(page, spec.right);
      await expect(page.getByRole('heading', { level: 2 })).toContainText('Correct');
      await page.getByRole('button', { name: i === 2 ? 'See my score' : 'Next question' }).click();
    }
    await expect(page.getByRole('heading', { level: 1 })).toContainText('3 / 3');
    await expect(page.getByText('sat mat').first()).toBeVisible();
    api.assertNoAnswersLeaked();
    api.assertClientPostsNoScores();
  });

  test('a wrong answer shows the right one, and the child can keep going', async ({ page }) => {
    await page.goto(START);
    await expect(page.getByRole('list', { name: 'Tiles to tap' })).toBeVisible();
    const prompt = await currentPrompt(page);
    const spec = QUESTIONS[prompt];
    if (!spec) throw new Error('Unexpected build question');
    await answer(page, spec.wrong);
    await expect(page.getByRole('heading', { level: 2 })).toContainText(
      /close|not quite|oops|nearly/i,
    );
    await expect(
      page.getByText(spec.right.join(prompt.startsWith('Spell') ? '' : ' ')).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible();
  });
});

test.describe('number questions on tiles', () => {
  test('there is no slider and no text box, only a keypad', async ({ page }) => {
    await page.goto('/play/e2e-quick-quiz?mode=practice');
    // Rounds are shuffled: answer whatever comes up until the number question appears.
    for (let i = 0; i < 3; i += 1) {
      const prompt = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
      if (prompt === 'How many sides does a pentagon have?') break;
      await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
      await page.getByRole('button', { name: 'Next question' }).click();
    }
    await expect(page.getByRole('group', { name: 'Your number' })).toBeVisible();
    await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '7', exact: true })).toBeVisible();
  });
});
