import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuizAttempt } from '@/hooks/useQuizAttempt';
import * as service from '@/services/gameService';
import * as sentry from '@/lib/sentry';
import { ApiError } from '@/lib/api';
import { answerResult, attemptState, question, summary } from '../support/fixtures';

vi.mock('@/services/gameService');
vi.mock('@/lib/sentry', () => ({ reportError: vi.fn() }));
vi.mock('@/hooks/useGuestSession', () => {
  const ensureSession = vi.fn(() => Promise.resolve());
  return { useGuestSession: () => ({ ensureSession, ready: true, isGuest: true, error: null }) };
});

const start = vi.mocked(service.startAttempt);
const next = vi.mocked(service.nextQuestion);
const answer = vi.mocked(service.answerQuestion);
const finish = vi.mocked(service.finishAttempt);

function setup(mode: 'practice' | 'ranked' = 'practice') {
  return renderHook(() => useQuizAttempt({ mode, quizSlug: 'space' }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useQuizAttempt', () => {
  it('starts loading, then shows the first question without any answer fields', async () => {
    start.mockResolvedValue(attemptState());
    const { result } = setup();
    expect(result.current.phase).toBe('loading');
    await waitFor(() => expect(result.current.phase).toBe('question'));
    expect(start).toHaveBeenCalledWith({
      mode: 'practice',
      quizSlug: 'space',
      challengeCode: undefined,
    });
    const shown = result.current.state?.question;
    expect(shown?.prompt).toBe('Prompt q1');
    expect(JSON.stringify(shown)).not.toMatch(/correct|is_correct|answer/i);
  });

  it('moves to feedback with the server verdict after an option is answered', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockResolvedValue(answerResult({ is_correct: false, correct_option_ids: ['q1-b'] }));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    expect(answer).toHaveBeenCalledWith('att1', { optionId: 'q1-a' });
    expect(result.current.phase).toBe('feedback');
    expect(result.current.lastResult?.correct_option_ids).toEqual(['q1-b']);
    expect(result.current.submitting).toBe(false);
  });

  it('sends a slider value without an option', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockResolvedValue(answerResult());
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerValue(7));
    expect(answer).toHaveBeenCalledWith('att1', { value: 7 });
  });

  it('ignores a second answer while the first is still in flight', async () => {
    start.mockResolvedValue(attemptState());
    let release: (r: ReturnType<typeof answerResult>) => void = () => undefined;
    answer.mockReturnValue(new Promise((resolve) => (release = resolve)));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    act(() => {
      void result.current.answerOption('q1-a');
      void result.current.answerOption('q1-b');
    });
    expect(answer).toHaveBeenCalledTimes(1);
    await act(async () => release(answerResult()));
    expect(result.current.phase).toBe('feedback');
  });

  it('asks for the next question after feedback', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockResolvedValue(answerResult());
    next.mockResolvedValue(attemptState({ position: 2, question: question('q2') }));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    await act(() => result.current.next());
    expect(next).toHaveBeenCalledWith('att1');
    expect(result.current.phase).toBe('question');
    expect(result.current.state?.position).toBe(2);
    expect(result.current.lastResult).toBeNull();
  });

  it('finishes after the last answer and exposes the summary', async () => {
    start.mockResolvedValue(attemptState({ position: 3 }));
    answer.mockResolvedValue(answerResult({ is_last: true, position: 3 }));
    finish.mockResolvedValue(summary());
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    await act(() => result.current.next());
    expect(finish).toHaveBeenCalledWith('att1');
    expect(next).not.toHaveBeenCalled();
    expect(result.current.phase).toBe('results');
    expect(result.current.summary?.correct).toBe(2);
  });

  it('resumes an attempt that is waiting for its next question (refresh safe)', async () => {
    start.mockResolvedValue(attemptState({ awaiting_next: true, position: 2 }));
    next.mockResolvedValue(attemptState({ position: 3, question: question('q3') }));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    expect(next).toHaveBeenCalledWith('att1');
    expect(result.current.state?.question?.id).toBe('q3');
  });

  it('goes straight to results when the server says the attempt is complete', async () => {
    start.mockResolvedValue(attemptState({ complete: true, question: null }));
    finish.mockResolvedValue(summary());
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('results'));
  });

  it('shows friendly copy for a known rule error at start and offers a retry', async () => {
    start.mockRejectedValue(new ApiError('daily_already_played', 409));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/come back tomorrow/i);
    expect(sentry.reportError).not.toHaveBeenCalled();

    start.mockResolvedValue(attemptState());
    await act(() => result.current.restart());
    expect(result.current.phase).toBe('question');
    expect(result.current.error).toBeNull();
  });

  it('reports unexpected failures and shows the generic message', async () => {
    start.mockRejectedValue(new ApiError('request_failed', 500));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current.error).toMatch(/something went wrong/i);
    expect(sentry.reportError).toHaveBeenCalledTimes(1);
  });

  it('keeps the question on screen after a recoverable rule error such as invalid_value', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockRejectedValue(new ApiError('invalid_value', 400));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerValue(99));
    expect(result.current.phase).toBe('question');
    expect(result.current.error).toMatch(/pick a number/i);
    expect(result.current.submitting).toBe(false);
  });

  it('keeps the question and says the game is unreachable on a network error while answering', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockRejectedValue(new ApiError('network_error', 0));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    expect(result.current.phase).toBe('question');
    expect(result.current.error).toMatch(/couldn.t reach the game/i);
  });

  it('fails the game on an unexpected server error while answering', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockRejectedValue(new ApiError('request_failed', 500));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    expect(result.current.phase).toBe('error');
    expect(sentry.reportError).toHaveBeenCalledTimes(1);
  });

  it('resyncs with the server when it says the question was never shown', async () => {
    start.mockResolvedValue(attemptState());
    answer.mockRejectedValue(new ApiError('question_not_shown', 409));
    next.mockResolvedValue(attemptState({ position: 2, question: question('q2') }));
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.answerOption('q1-a'));
    expect(result.current.phase).toBe('question');
    expect(result.current.state?.question?.id).toBe('q2');
  });

  it('does not answer or advance when the phase is wrong', async () => {
    start.mockResolvedValue(attemptState());
    const { result } = setup();
    await waitFor(() => expect(result.current.phase).toBe('question'));
    await act(() => result.current.next());
    expect(next).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });
});
