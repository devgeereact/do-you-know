/* eslint-env node */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// Reads only browser-safe credentials from this machine's ignored environment.
const entries = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .filter((line) => /^VITE_SUPABASE_(URL|ANON_KEY)=/.test(line))
  .map((line) => { const at = line.indexOf('='); return [line.slice(0, at), JSON.parse(line.slice(at + 1))]; }));
assert.equal(entries.VITE_SUPABASE_URL, 'http://127.0.0.1:55321', 'Local API checks cannot target a hosted backend');
const client = createClient(entries.VITE_SUPABASE_URL, entries.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
async function rpc(name, args = {}) {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}
function noAnswers(value) {
  if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      assert.ok(!['is_correct', 'correct_value', 'accept_min', 'accept_max', 'explanation', 'source_url'].includes(key), `Premature answer field: ${key}`);
      noAnswers(nested);
    }
  }
}
const { data: quizzes, error: catalogueError } = await client.from('quizzes').select('slug,title').eq('status', 'published');
assert.equal(catalogueError, null);
assert.ok(quizzes.some((quiz) => quiz.slug === 'solar-system-starter'));
const { data: auth, error: authError } = await client.auth.signInAnonymously();
assert.equal(authError, null);
assert.equal(auth.user.is_anonymous, true);
try {
  for (const table of ['questions', 'question_options', 'quiz_versions']) {
    const { data, error } = await client.from(table).select('*');
    assert.equal(error, null);
    assert.deepEqual(data, [], `${table} must hide answer keys from guests`);
  }
  let state = await rpc('start_attempt', { p_quiz_slug: 'solar-system-starter', p_mode: 'practice' });
  assert.equal(state.question_deadline, null);
  const attemptId = state.attempt_id;
  const resumed = await rpc('start_attempt', { p_quiz_slug: 'solar-system-starter', p_mode: 'practice' });
  assert.equal(resumed.attempt_id, attemptId);
  assert.deepEqual(resumed.question, state.question);
  const types = new Set();
  while (!state.complete) {
    noAnswers(state.question);
    types.add(state.question.type);
    const result = await rpc('answer_question', {
      p_attempt_id: attemptId,
      p_option_id: state.question.options[0]?.id ?? null,
      p_value: state.question.slider?.min ?? null,
    });
    assert.equal(typeof result.is_correct, 'boolean');
    assert.ok(result.explanation);
    assert.ok(result.source_url.startsWith('https://science.nasa.gov/'));
    const afterAnswer = await rpc('start_attempt', { p_quiz_slug: 'solar-system-starter', p_mode: 'practice' });
    assert.equal(afterAnswer.attempt_id, attemptId);
    if (result.is_last) {
      assert.equal(afterAnswer.question, null);
      assert.equal(afterAnswer.complete, true);
      break;
    }
    // Reloading during feedback starts the next question in the current RPC.
    noAnswers(afterAnswer.question);
    assert.notEqual(afterAnswer.question.id, state.question.id);
    state = await rpc('next_question', { p_attempt_id: attemptId });
    assert.deepEqual(state.question, afterAnswer.question);
  }
  assert.deepEqual([...types].sort(), ['boolean', 'choice', 'slider']);
  const summary = await rpc('finish_attempt', { p_attempt_id: attemptId });
  assert.equal(summary.total, 3);
  assert.equal(summary.review.length, 3);
  assert.equal(typeof summary.correct, 'number');
  assert.deepEqual(await rpc('finish_attempt', { p_attempt_id: attemptId }), summary);
  process.stdout.write('PASS: local catalogue, anonymous auth, answer isolation, all question types, resume and server results\n');
} finally {
  await rpc('delete_my_account');
  await client.auth.signOut({ scope: 'local' });
}
