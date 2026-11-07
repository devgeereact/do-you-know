import { expect, expectNoHorizontalOverflow, test } from './support/test';

test.describe('a question with a reading passage', () => {
  test('a long prompt reads as text, fits the phone and can be answered', async ({ page, api }) => {
    await page.goto('/play/e2e-passage-quiz?mode=practice');
    const prompt = page.getByRole('heading', { level: 1 });
    await expect(prompt).toContainText('Maya');
    await expect(prompt).toContainText('net hat');
    await expectNoHorizontalOverflow(page);
    // The passage is set as reading text, not as a headline.
    const size = await prompt.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeLessThan(26);
    await page.getByRole('region', { name: 'Answers' }).getByRole('button').first().click();
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();
    api.assertNoAnswersLeaked();
  });
});
