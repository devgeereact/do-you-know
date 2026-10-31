import { execFileSync } from 'node:child_process';
import {
  test as base,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
} from '@playwright/test';
import { API_URL, FIXTURE_PHP, REPO_ROOT } from './env';

export { expect };

/** What the seeded quiz asks, in the shape the journeys need. */
export const QUIZ = {
  slug: 'e2e-quick-quiz',
  title: 'E2E Quick Quiz',
  category: 'E2E General',
  questions: {
    'Which city is the capital of France?': { kind: 'choice', right: 'Paris', wrong: 'Lyon' },
    'The sun is a star.': { kind: 'choice', right: 'True', wrong: 'False' },
    'How many sides does a pentagon have?': { kind: 'slider', right: 5, wrong: 2 },
  },
} as const;

/** Fields that only an answered or finished question may carry. */
const ANSWER_FIELDS =
  /is_correct|correct_option_ids|correct_value|correct_answer|accept_min|accept_max|explanation|snapshot/;

interface ApiRecord {
  method: string;
  path: string; // after /api/v1
  status: number;
  requestBody: string | null;
  body: string;
}

/** Records every API exchange of a page so tests can assert on what crossed the wire. */
export class ApiWatcher {
  readonly records: ApiRecord[] = [];

  constructor(page: Page) {
    page.on('response', (response: Response) => {
      const url = response.url();
      if (!url.startsWith(API_URL)) return;
      void (async (): Promise<void> => {
        let body = '';
        try {
          body = await response.text();
        } catch {
          /* navigation tore the response down */
        }
        this.records.push({
          method: response.request().method(),
          path: new URL(url).pathname.replace('/api/v1', ''),
          status: response.status(),
          requestBody: response.request().postData(),
          body,
        });
      })();
    });
  }

  /** Every payload that is not an answer or a finished game must be free of answer data. */
  assertNoAnswersLeaked(): void {
    const exempt = /\/attempts\/[^/]+\/(answer|finish)$/;
    const checked = this.records.filter((r) => !exempt.test(r.path));
    for (const record of checked) {
      expect(record.body, `${record.method} ${record.path} leaked answer data`).not.toMatch(
        ANSWER_FIELDS,
      );
    }
    // The question shown to the player is exactly id, type, prompt, image, options, slider and
    // its cosmetic scene (the world it is drawn in, which says nothing about the answer).
    for (const record of checked.filter((r) => /\/attempts(\/[^/]+\/next)?$/.test(r.path))) {
      const parsed = JSON.parse(record.body) as {
        question: { options: object[]; slider: object | null } | null;
      };
      if (!parsed.question) continue;
      expect(Object.keys(parsed.question).sort()).toEqual(
        ['id', 'image_url', 'options', 'prompt', 'scene', 'slider', 'type'].sort(),
      );
      for (const option of parsed.question.options) {
        expect(Object.keys(option).sort()).toEqual(['id', 'label']);
      }
      if (parsed.question.slider) {
        expect(Object.keys(parsed.question.slider).sort()).toEqual(
          ['max', 'min', 'step', 'unit'].sort(),
        );
      }
    }
  }

  /** The player only ever posts a choice, a slider value or nothing. Never a score or a time. */
  assertClientPostsNoScores(): void {
    const forbidden =
      /^(score|rank|time_ms|elapsed|correct|correct_count|is_correct|answer_time_ms)$/i;
    const keysOf = (value: unknown): string[] =>
      typeof value === 'object' && value !== null
        ? Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)])
        : [];
    for (const record of this.records.filter((r) => r.method === 'POST' && r.requestBody)) {
      const keys = keysOf(JSON.parse(record.requestBody ?? '{}'));
      expect(
        keys.filter((key) => forbidden.test(key)),
        `${record.path} request carries a score-like field`,
      ).toEqual([]);
    }
    for (const answer of this.records.filter((r) => r.path.endsWith('/answer'))) {
      const keys = Object.keys(JSON.parse(answer.requestBody ?? '{}') as object);
      expect(keys.every((key) => key === 'option_id' || key === 'value')).toBe(true);
    }
  }

  count(pathSuffix: string): number {
    return this.records.filter((r) => r.path.endsWith(pathSuffix)).length;
  }
}

/** True when the document is wider than the viewport (a horizontal scroll bar appears). */
export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  // Let fonts and the entrance animation settle before measuring.
  await page.evaluate(() => document.fonts.ready);
  const widths = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    url: location.pathname,
  }));
  expect(widths.scroll, `horizontal overflow on ${widths.url}`).toBeLessThanOrEqual(widths.client);
}

interface Fixtures {
  /** Console errors and uncaught page errors are failures unless a test allows them. */
  allowConsoleErrors: RegExp[];
  consoleGuard: void;
  api: ApiWatcher;
  newPlayer: () => Promise<{ context: BrowserContext; page: Page; api: ApiWatcher }>;
}

function watchConsole(page: Page, errors: string[]): void {
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
}

/**
 * Every test starts with throttling cleared (the API limits new guests to 10 an hour per
 * address, far below what a full run creates) and fails on any console error.
 */
export const test = base.extend<Fixtures>({
  allowConsoleErrors: [[], { option: true }],

  consoleGuard: [
    async ({ page, allowConsoleErrors }, provide) => {
      execFileSync('php', [FIXTURE_PHP, 'reset-limits'], { cwd: REPO_ROOT, env: process.env });
      const errors: string[] = [];
      watchConsole(page, errors);
      await provide();
      const unexpected = errors.filter(
        (e) => !allowConsoleErrors.some((allowed) => allowed.test(e)),
      );
      expect(unexpected, 'unexpected console errors').toEqual([]);
    },
    { auto: true },
  ],

  api: async ({ page }, provide) => {
    await provide(new ApiWatcher(page));
  },

  // A second, fully separate player (own storage, own guest token) for head-to-head tests.
  newPlayer: async (
    { browser, viewport, isMobile, hasTouch, deviceScaleFactor, baseURL, locale, timezoneId },
    provide,
  ) => {
    const opened: { context: BrowserContext; errors: string[] }[] = [];
    await provide(async () => {
      const context = await (browser as Browser).newContext({
        viewport,
        isMobile,
        hasTouch,
        deviceScaleFactor,
        baseURL,
        locale,
        timezoneId,
      });
      const page = await context.newPage();
      const errors: string[] = [];
      watchConsole(page, errors);
      opened.push({ context, errors });
      return { context, page, api: new ApiWatcher(page) };
    });
    const errors = opened.flatMap((entry) => entry.errors);
    await Promise.all(opened.map((entry) => entry.context.close()));
    expect(errors, 'unexpected console errors for the second player').toEqual([]);
  },
});

/** Answer the question on screen. The prompt tells us which seeded question it is. */
export async function answerCurrentQuestion(page: Page, correct: boolean): Promise<void> {
  // textContent, not innerText: the game shows prompts in CSS capitals.
  const prompt = ((await page.getByRole('heading', { level: 1 }).textContent()) ?? '').trim();
  const spec = (
    QUIZ.questions as Record<string, (typeof QUIZ.questions)[keyof typeof QUIZ.questions]>
  )[prompt];
  if (!spec) throw new Error(`Unexpected question: ${prompt}`);
  if (spec.kind === 'slider') {
    await page.getByRole('slider').fill(String(correct ? spec.right : spec.wrong));
    await page.getByRole('button', { name: 'Lock it in' }).click();
  } else {
    await page
      .getByRole('region', { name: 'Answers' })
      .getByRole('button', { name: correct ? String(spec.right) : String(spec.wrong), exact: true })
      .click();
  }
}

/** Plays all three questions, then opens the score screen. */
export async function playThrough(
  page: Page,
  correct: boolean[] = [true, true, true],
): Promise<void> {
  for (const [index, isRight] of correct.entries()) {
    await expect(page.getByText(`Question ${index + 1} of 3`)).toBeVisible();
    await answerCurrentQuestion(page, isRight);
    await page
      .getByRole('button', {
        name: index === correct.length - 1 ? 'See my score' : 'Next question',
      })
      .click();
  }
  await expect(page.getByRole('heading', { level: 1 })).toContainText('/ 3');
}
