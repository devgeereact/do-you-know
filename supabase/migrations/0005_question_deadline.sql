-- Add display-only server deadline. Grading and elapsed time remain in 0003.
create or replace function public._attempt_state(p_attempt_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  a public.attempts;
  qz public.quizzes;
  total int;
  q jsonb;
begin
  select * into a from public.attempts where id = p_attempt_id;
  select * into qz from public.quizzes where id = a.quiz_id;
  total := array_length(a.question_order, 1);

  if a.current_sent_at is not null and a.current_index < total then
    q := public._public_question(
           public._snapshot_question(a.quiz_version_id, a.question_order[a.current_index + 1]),
           a.id, qz.shuffle_options);
  end if;

  return jsonb_build_object(
    'attempt_id', a.id,
    'mode', a.mode,
    'status', a.status,
    'quiz', jsonb_build_object('slug', qz.slug, 'title', qz.title),
    'position', least(a.current_index + 1, total),
    'total', total,
    'answered', a.answered_count,
    'correct', a.correct_count,
    'awaiting_next', a.current_sent_at is null and a.current_index < total,
    'complete', a.current_index >= total,
    'time_limit_seconds', qz.time_limit_seconds,
    'question', q,
    'server_now', now(),
    'question_deadline', case when a.current_sent_at is not null and qz.time_limit_seconds is not null
      then a.current_sent_at + make_interval(secs => qz.time_limit_seconds) end
  );
end;
$$;

