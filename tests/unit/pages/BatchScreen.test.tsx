import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BatchScreen } from '@/pages/admin/BatchScreen';
import { StudioContext, type StudioContextValue } from '@/pages/admin/studio';
import type { BatchQuiz, BatchSummary } from '@/services/adminService';

const BATCH = '11111111-1111-4111-8111-111111111111';

const quiz = (over: Partial<BatchQuiz>): BatchQuiz => ({
  id: 'q',
  slug: 'q',
  title: 'Quiz',
  category: { slug: 'maths', name: 'Maths' },
  level: 'adventurers',
  age_min: 9,
  age_max: 11,
  difficulty: 'medium',
  is_ranked: true,
  questions: 10,
  status: 'draft',
  publish_at: null,
  state: 'ready',
  problems: 0,
  warnings: 0,
  reasons: [],
  ...over,
});

const summary = (quizzes: BatchQuiz[]): BatchSummary => ({
  id: BATCH,
  counts: {
    total: quizzes.length,
    ready: quizzes.filter((q) => q.state === 'ready').length,
    look: quizzes.filter((q) => q.state === 'look').length,
    scheduled: quizzes.filter((q) => q.state === 'scheduled').length,
    live: quizzes.filter((q) => q.state === 'live').length,
    retired: 0,
    questions: quizzes.length * 10,
  },
  quizzes,
});

function setup(quizzes: BatchQuiz[], confirmAnswer = true) {
  const client = {
    batch: vi.fn(() => Promise.resolve(summary(quizzes))),
    publishBatch: vi.fn(() =>
      Promise.resolve({
        published: 2,
        per_day: 5,
        first: '2026-11-09',
        last: '2026-11-09',
        skipped: [],
      }),
    ),
    undoBatch: vi.fn(() => Promise.resolve({ undone: 1, kept_live: 0 })),
    saveQuiz: vi.fn(() => Promise.resolve({})),
    batchSample: vi.fn(() => Promise.resolve({ items: SAMPLE })),
  };
  const toast = vi.fn();
  const confirm = vi.fn(() => Promise.resolve(confirmAnswer));
  const value = {
    client,
    subjects: [],
    refreshSubjects: vi.fn(),
    counts: { todo: 0, inbox: 0, check: 0 },
    refreshCounts: vi.fn(),
    toast,
    confirm,
  } as unknown as StudioContextValue;
  render(
    <MemoryRouter initialEntries={[`/admin/batch/${BATCH}`]}>
      <StudioContext.Provider value={value}>
        <Routes>
          <Route path="/admin/batch/:id" element={<BatchScreen />} />
        </Routes>
      </StudioContext.Provider>
    </MemoryRouter>,
  );
  return { client, toast, confirm };
}

const SAMPLE = Array.from({ length: 5 }, (_, i) => ({
  quiz_id: i % 2 ? 'a' : 'b',
  title: i % 2 ? 'Fractions' : 'Rivers',
  number: i + 1,
  type: 'choice',
  prompt: `Sample question ${i + 1}?`,
  answer: `Answer ${i + 1}`,
  explanation: `Because ${i + 1}.`,
}));

const MIXED = [
  quiz({ id: 'a', title: 'Fractions' }),
  quiz({ id: 'b', title: 'Rivers' }),
  quiz({
    id: 'c',
    title: 'The Christian year',
    state: 'look',
    warnings: 1,
    reasons: ['Mentions “baptised”. Leave out sacraments.'],
  }),
];

describe('the Batch screen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sorts a batch into ready and needs a look, and says why', async () => {
    setup(MIXED);
    expect(await screen.findByText('2 ready')).toBeInTheDocument();
    expect(screen.getByText('1 need a look')).toBeInTheDocument();
    expect(screen.getByText(/Mentions “baptised”/)).toBeInTheDocument();
    expect(screen.getByText('Needs a look')).toBeInTheDocument();
  });

  it('asks you to read five questions first, and publishes only once they are all ticked', async () => {
    const { client } = setup(MIXED);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Publish 2 ready, 5 a day/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Sample question 1?')).toBeInTheDocument();
    expect(within(dialog).getByText('Answer 3')).toBeInTheDocument();
    const go = within(dialog).getByRole('button', { name: 'Publish' });
    expect(go).toBeDisabled();
    const ticks = within(dialog).getAllByRole('checkbox');
    expect(ticks).toHaveLength(5);
    for (const t of ticks.slice(0, 4)) await user.click(t);
    expect(go).toBeDisabled();
    await user.click(ticks[4]!);
    expect(go).toBeEnabled();
    await user.click(go);
    await waitFor(() => expect(client.publishBatch).toHaveBeenCalledWith(BATCH, { per_day: 5 }));
  });

  it('publishes nothing when the reading is cancelled', async () => {
    const { client } = setup(MIXED);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Publish 2 ready/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(client.publishBatch).not.toHaveBeenCalled();
  });

  it('changes the pace and the button says so', async () => {
    setup(MIXED);
    const user = userEvent.setup();
    await screen.findByText('2 ready');
    await user.selectOptions(screen.getByLabelText('Pace'), 'All now');
    expect(screen.getByRole('button', { name: 'Publish 2 ready now' })).toBeInTheDocument();
  });

  it('has nothing to publish when nothing is ready', async () => {
    setup([quiz({ id: 'c', state: 'look', reasons: ['x'] })]);
    const button = await screen.findByRole('button', { name: /Publish 0 ready/ });
    expect(button).toBeDisabled();
  });

  it('sets difficulty for the selected quizzes only', async () => {
    const { client } = setup(MIXED);
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('Select Fractions'));
    await user.click(screen.getByLabelText('Select Rivers'));
    const bar = screen.getByRole('group', { name: 'Change several at once' });
    await user.selectOptions(within(bar).getByLabelText('Difficulty'), 'Hard');
    await user.click(within(bar).getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(client.saveQuiz).toHaveBeenCalledTimes(2));
    expect(client.saveQuiz).toHaveBeenCalledWith('a', { meta: { difficulty: 'hard' } });
    expect(client.saveQuiz).toHaveBeenCalledWith('b', { meta: { difficulty: 'hard' } });
  });

  it('turns a level into its age band', async () => {
    const { client } = setup(MIXED);
    const user = userEvent.setup();
    await user.click(await screen.findByLabelText('Select Fractions'));
    const bar = screen.getByRole('group', { name: 'Change several at once' });
    await user.selectOptions(within(bar).getByLabelText('Level'), 'Scholars');
    await user.click(within(bar).getByRole('button', { name: 'Apply' }));
    await waitFor(() =>
      expect(client.saveQuiz).toHaveBeenCalledWith('a', { meta: { age_min: 15, age_max: 16 } }),
    );
  });

  it('offers to undo only what is scheduled', async () => {
    setup([
      quiz({ id: 'a', state: 'live', status: 'published' }),
      quiz({ id: 'b', state: 'scheduled', status: 'published' }),
    ]);
    expect(await screen.findByText(/scheduled for the days ahead/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo what is not live yet' })).toBeInTheDocument();
  });
});
