-- =====================================================================
-- 0003_game_functions.sql — Do You Know: server-side game logic (RPC)
--
-- These SECURITY DEFINER functions are the ONLY way to play. The browser
-- never receives an answer before it has answered, never posts a score,
-- and never measures its own time.
--
--   start_attempt   → opens (or resumes) an attempt, shows question 1
--   answer_question → grades one answer, returns result + explanation
--   next_question   → shows the next question (starts its clock)
--   finish_attempt  → totals score, writes leaderboards, returns review
--
-- Errors are raised with short machine codes (e.g. 'daily_already_played')
-- that the client maps to friendly copy.
-- =====================================================================

-- ---------- Internal helpers (not callable by clients) ----------------
create or replace function public._london_today()
returns date
language sql stable
as $$ select (now() at time zone 'Europe/London')::date $$;

create or replace function public._london_week_start()
returns date
language sql stable
as $$ select date_trunc('week', now() at time zone 'Europe/London')::date $$;

create or replace function public._snapshot_question(p_version_id uuid, p_question_id uuid)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select q
    from public.quiz_versions v, jsonb_array_elements(v.snapshot) q
   where v.id = p_version_id and q ->> 'id' = p_question_id::text
$$;

-- Strip every answer field. Options are shuffled with a stable, per-attempt order.
create or replace function public._public_question(p_q jsonb, p_attempt_id uuid, p_shuffle boolean)
returns jsonb
language sql stable
as $$
  select jsonb_build_object(
    'id', p_q ->> 'id',
    'type', p_q ->> 'type',
    'prompt', p_q ->> 'prompt',
    'image_url', p_q ->> 'image_url',
    'options', coalesce((
      select jsonb_agg(jsonb_build_object('id', o ->> 'id', 'label', o ->> 'label')
                       order by case when p_shuffle and p_q ->> 'type' = 'choice'
                                     then md5(p_attempt_id::text || (o ->> 'id')) end,
                                ord)
        from jsonb_array_elements(p_q -> 'options') with ordinality as t(o, ord)
    ), '[]'::jsonb),
    'slider', case when p_q ->> 'type' = 'slider' then jsonb_build_object(
        'min', (p_q -> 'slider' ->> 'min')::numeric,
        'max', (p_q -> 'slider' ->> 'max')::numeric,
        'step', (p_q -> 'slider' ->> 'step')::numeric,
        'unit', p_q -> 'slider' ->> 'unit') end
  )
$$;

-- The client-facing state of an attempt (never contains answers).
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
    'server_now', now()
  );
end;
$$;

-- Keep the better of two results for one board row.
create or replace function public._record_best(
  p_board text, p_quiz_id uuid, p_period date, p_user_id uuid, p_attempt_id uuid,
  p_correct int, p_total int, p_time_ms int)
returns void
language sql security definer set search_path = public
as $$
  insert into public.leaderboard_entries
    (board, quiz_id, period_start, user_id, attempt_id, correct_count, total, answer_time_ms)
  values (p_board, p_quiz_id, p_period, p_user_id, p_attempt_id, p_correct, p_total, p_time_ms)
  on conflict (board, quiz_id, period_start, user_id) do update
     set attempt_id = excluded.attempt_id,
         correct_count = excluded.correct_count,
         total = excluded.total,
         answer_time_ms = excluded.answer_time_ms,
         achieved_at = timezone('utc', now())
   where excluded.correct_count > leaderboard_entries.correct_count
      or (excluded.correct_count = leaderboard_entries.correct_count
          and excluded.answer_time_ms < leaderboard_entries.answer_time_ms)
$$;

-- Rank among publicly visible rows (nickname set, not hidden).
create or replace function public._rank_of(p_board text, p_quiz_id uuid, p_period date, p_user_id uuid)
returns int
language sql stable security definer set search_path = public
as $$
  select case when mine.id is null then null else (
    select count(*)::int + 1
      from public.leaderboard_entries e
      join public.profiles p on p.id = e.user_id
     where e.board = p_board and e.quiz_id = p_quiz_id and e.period_start = p_period
       and not e.is_hidden and p.nickname is not null
       and (e.correct_count > mine.correct_count
            or (e.correct_count = mine.correct_count and e.answer_time_ms < mine.answer_time_ms)
            or (e.correct_count = mine.correct_count and e.answer_time_ms = mine.answer_time_ms
                and e.achieved_at < mine.achieved_at))
  ) end
  from (select * from public.leaderboard_entries
         where board = p_board and quiz_id = p_quiz_id and period_start = p_period
           and user_id = p_user_id) mine
  right join (select 1) one on true
$$;

-- ---------- Publishing (admins) ---------------------------------------
create or replace function public.publish_quiz(p_quiz_id uuid, p_publish_at timestamptz default null)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  qz public.quizzes;
  pool int;
  bad record;
  snap jsonb;
  v int;
  new_version uuid;
  go_live timestamptz := coalesce(p_publish_at, now());
begin
  if not public.is_admin() then
    raise exception 'admins_only';
  end if;

  select * into qz from public.quizzes where id = p_quiz_id for update;
  if qz.id is null then raise exception 'quiz_not_found'; end if;

  select count(*) into pool from public.quiz_questions where quiz_id = p_quiz_id;
  if pool < qz.question_count then
    raise exception 'not_enough_questions' using detail = format('%s linked, %s needed', pool, qz.question_count);
  end if;

  -- Every question must be complete and correct-by-construction.
  for bad in
    select q.prompt,
           case
             when q.status = 'retired' then 'retired'
             when q.explanation is null or q.source_url is null or q.review_by is null
               then 'missing explanation, source or review date'
             when q.type = 'choice' and (select count(*) from public.question_options o where o.question_id = q.id) not between 2 and 6
               then 'choice needs 2–6 options'
             when q.type = 'boolean' and (select count(*) from public.question_options o where o.question_id = q.id) <> 2
               then 'true/false needs exactly 2 options'
             when q.type in ('choice', 'boolean')
                  and (select count(*) from public.question_options o where o.question_id = q.id and o.is_correct) <> 1
               then 'needs exactly one correct option'
           end as problem
      from public.quiz_questions qq
      join public.questions q on q.id = qq.question_id
     where qq.quiz_id = p_quiz_id
  loop
    if bad.problem is not null then
      raise exception 'question_invalid' using detail = format('"%s": %s', left(bad.prompt, 80), bad.problem);
    end if;
  end loop;

  select jsonb_agg(jsonb_build_object(
           'id', q.id, 'type', q.type, 'prompt', q.prompt,
           'explanation', q.explanation, 'source_url', q.source_url, 'image_url', q.image_url,
           'options', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'is_correct', o.is_correct)
                                                 order by o.sort_order, o.id)
                                  from public.question_options o where o.question_id = q.id), '[]'::jsonb),
           'slider', case when q.type = 'slider' then jsonb_build_object(
                       'min', q.slider_min, 'max', q.slider_max, 'step', q.slider_step, 'unit', q.slider_unit,
                       'correct', q.correct_value, 'accept_min', q.accept_min, 'accept_max', q.accept_max) end)
         order by qq.position)
    into snap
    from public.quiz_questions qq
    join public.questions q on q.id = qq.question_id
   where qq.quiz_id = p_quiz_id;

  select coalesce(max(version), 0) + 1 into v from public.quiz_versions where quiz_id = p_quiz_id;

  insert into public.quiz_versions (quiz_id, version, snapshot, question_count, published_by)
  values (p_quiz_id, v, snap, qz.question_count, auth.uid())
  returning id into new_version;

  update public.quizzes
     set current_version_id = new_version,
         status = case when go_live > now() then 'scheduled' else 'published' end,
         publish_at = go_live,
         updated_by = auth.uid()
   where id = p_quiz_id;

  update public.questions set status = 'approved'
   where id in (select question_id from public.quiz_questions where quiz_id = p_quiz_id)
     and status in ('draft', 'in_review');

  insert into public.rebuild_requests (reason) values ('publish ' || qz.slug);
  return new_version;
end;
$$;

-- ---------- Playing ---------------------------------------------------
create or replace function public.start_attempt(
  p_quiz_slug text default null,
  p_mode text default 'practice',
  p_challenge_code text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  qz public.quizzes;
  ver public.quiz_versions;
  dc public.daily_challenges;
  fc public.friend_challenges;
  existing public.attempts;
  q_order uuid[];
  v_mode text := p_mode;
  new_id uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if v_mode not in ('practice', 'ranked', 'daily', 'challenge') then raise exception 'invalid_mode'; end if;

  if (select count(*) from public.attempts
       where user_id = uid and started_at > now() - interval '1 minute') >= 5 then
    raise exception 'too_many_attempts';
  end if;

  if v_mode = 'daily' then
    select * into dc from public.daily_challenges
     where challenge_date = public._london_today() and status = 'live';
    if dc.id is null or dc.quiz_version_id is null then raise exception 'no_daily_today'; end if;

    select * into existing from public.attempts where user_id = uid and daily_challenge_id = dc.id and attempts.mode = 'daily';
    if existing.id is not null then
      if existing.status = 'in_progress' then
        if existing.current_sent_at is null and existing.current_index < array_length(existing.question_order, 1) then
          update public.attempts set current_sent_at = now() where id = existing.id;
        end if;
        return public._attempt_state(existing.id);
      end if;
      raise exception 'daily_already_played';
    end if;

    select * into ver from public.quiz_versions where id = dc.quiz_version_id;
    select * into qz from public.quizzes where id = ver.quiz_id;
    -- Same questions, same order, for everyone today.
    select array_agg((e ->> 'id')::uuid order by ord) into q_order
      from jsonb_array_elements(ver.snapshot) with ordinality t(e, ord)
     where ord <= ver.question_count;

  elsif v_mode = 'challenge' then
    select * into fc from public.friend_challenges where code = p_challenge_code;
    if fc.id is null or fc.expires_at < now() then raise exception 'challenge_not_found'; end if;
    if fc.creator_id = uid then raise exception 'own_challenge'; end if;
    select * into ver from public.quiz_versions where id = fc.quiz_version_id;
    select * into qz from public.quizzes where id = fc.quiz_id;
    -- Exactly the creator's questions, in the creator's order.
    select question_order into q_order from public.attempts where id = fc.creator_attempt_id;

  else
    select * into qz from public.quizzes where slug = p_quiz_slug and status = 'published';
    if qz.id is null or qz.current_version_id is null then raise exception 'quiz_not_found'; end if;
    if v_mode = 'ranked' and not qz.is_ranked then v_mode := 'practice'; end if;
    select * into ver from public.quiz_versions where id = qz.current_version_id;
    -- A random selection from the published pool.
    select array_agg(id) into q_order from (
      select (e ->> 'id')::uuid as id
        from jsonb_array_elements(ver.snapshot) e
       order by random()
       limit ver.question_count) s;
  end if;

  -- Resume an unfinished attempt of the same kind (refresh-safe; clock not reset).
  select * into existing from public.attempts
   where user_id = uid and quiz_version_id = ver.id and attempts.mode = v_mode
     and status = 'in_progress' and started_at > now() - interval '24 hours'
     and friend_challenge_id is not distinct from fc.id
   order by started_at desc limit 1;
  if existing.id is not null then
    if existing.current_sent_at is null and existing.current_index < array_length(existing.question_order, 1) then
      update public.attempts set current_sent_at = now() where id = existing.id;
    end if;
    return public._attempt_state(existing.id);
  end if;

  insert into public.attempts
    (user_id, quiz_id, quiz_version_id, mode, daily_challenge_id, friend_challenge_id, question_order, current_sent_at)
  values (uid, qz.id, ver.id, v_mode, dc.id, fc.id, q_order, now())
  returning id into new_id;

  return public._attempt_state(new_id);
end;
$$;

create or replace function public.next_question(p_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare a public.attempts;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if a.id is null or a.user_id <> auth.uid() then raise exception 'attempt_not_found'; end if;
  if a.status <> 'in_progress' then raise exception 'attempt_closed'; end if;
  if a.current_index >= array_length(a.question_order, 1) then raise exception 'no_more_questions'; end if;
  -- Idempotent: if already shown, keep the original start time.
  if a.current_sent_at is null then
    update public.attempts set current_sent_at = now() where id = a.id;
  end if;
  return public._attempt_state(a.id);
end;
$$;

create or replace function public.answer_question(
  p_attempt_id uuid,
  p_option_id uuid default null,
  p_value numeric default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  a public.attempts;
  qz public.quizzes;
  q jsonb;
  qid uuid;
  total int;
  elapsed_ms int;
  limit_ms int;
  timed_out boolean := false;
  correct boolean := false;
  chosen jsonb;
  correct_ids jsonb;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if a.id is null or a.user_id <> auth.uid() then raise exception 'attempt_not_found'; end if;
  if a.status <> 'in_progress' then raise exception 'attempt_closed'; end if;
  if a.current_sent_at is null then raise exception 'question_not_shown'; end if;

  total := array_length(a.question_order, 1);
  qid := a.question_order[a.current_index + 1];
  q := public._snapshot_question(a.quiz_version_id, qid);
  select * into qz from public.quizzes where id = a.quiz_id;

  elapsed_ms := greatest(0, (extract(epoch from (now() - a.current_sent_at)) * 1000)::int);
  limit_ms := case when qz.time_limit_seconds is not null then qz.time_limit_seconds * 1000 end;
  if limit_ms is not null and elapsed_ms > limit_ms + 1500 then  -- 1.5 s network grace
    timed_out := true;
  end if;

  if q ->> 'type' in ('choice', 'boolean') then
    if not timed_out then
      select o into chosen from jsonb_array_elements(q -> 'options') o where o ->> 'id' = p_option_id::text;
      if chosen is null then raise exception 'invalid_option'; end if;
      correct := (chosen ->> 'is_correct')::boolean;
    end if;
    select jsonb_agg(o ->> 'id') into correct_ids
      from jsonb_array_elements(q -> 'options') o where (o ->> 'is_correct')::boolean;
  else
    if not timed_out then
      if p_value is null
         or p_value < (q -> 'slider' ->> 'min')::numeric
         or p_value > (q -> 'slider' ->> 'max')::numeric then
        raise exception 'invalid_value';
      end if;
      correct := p_value between (q -> 'slider' ->> 'accept_min')::numeric and (q -> 'slider' ->> 'accept_max')::numeric;
    end if;
  end if;

  insert into public.attempt_answers
    (attempt_id, question_id, position, chosen_option_id, chosen_value, is_correct, timed_out, sent_at, time_ms)
  values (a.id, qid, a.current_index + 1,
          case when timed_out then null else p_option_id end,
          case when timed_out then null else p_value end,
          correct, timed_out, a.current_sent_at,
          least(elapsed_ms, coalesce(limit_ms, 60000)));   -- cap: a paused phone can't wreck a run

  update public.attempts
     set answered_count = answered_count + 1,
         correct_count = correct_count + case when correct then 1 else 0 end,
         answer_time_ms = answer_time_ms + least(elapsed_ms, coalesce(limit_ms, 60000)),
         current_index = current_index + 1,
         current_sent_at = null   -- reading the explanation is NOT timed
   where id = a.id;

  return jsonb_build_object(
    'is_correct', correct,
    'timed_out', timed_out,
    'correct_option_ids', coalesce(correct_ids, '[]'::jsonb),
    'correct_value', (q -> 'slider' ->> 'correct')::numeric,
    'accept_min', (q -> 'slider' ->> 'accept_min')::numeric,
    'accept_max', (q -> 'slider' ->> 'accept_max')::numeric,
    'explanation', q ->> 'explanation',
    'source_url', q ->> 'source_url',
    'position', a.current_index + 1,
    'total', total,
    'is_last', a.current_index + 1 >= total
  );
end;
$$;

create or replace function public.finish_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  a public.attempts;
  prof public.profiles;
  total int;
  wk date := public._london_week_start();
  today date := public._london_today();
  dc_date date;
  review jsonb;
  ranks jsonb := '{}'::jsonb;
  versus jsonb;
begin
  select * into a from public.attempts where id = p_attempt_id for update;
  if a.id is null or a.user_id <> auth.uid() then raise exception 'attempt_not_found'; end if;
  total := array_length(a.question_order, 1);

  if a.status = 'in_progress' then
    if a.answered_count < total then raise exception 'not_all_answered'; end if;
    update public.attempts set status = 'finished', finished_at = now() where id = a.id;

    if a.mode in ('ranked', 'daily') then
      perform public._record_best('all_time', a.quiz_id, '1970-01-01', a.user_id, a.id, a.correct_count, total, a.answer_time_ms);
      perform public._record_best('weekly', a.quiz_id, wk, a.user_id, a.id, a.correct_count, total, a.answer_time_ms);
    end if;

    if a.mode = 'daily' then
      select challenge_date into dc_date from public.daily_challenges where id = a.daily_challenge_id;
      perform public._record_best('daily', a.quiz_id, dc_date, a.user_id, a.id, a.correct_count, total, a.answer_time_ms);

      -- Streaks: consecutive London days with a finished daily.
      perform set_config('dyk.trusted', 'on', true);
      update public.profiles
         set streak_current = case
               when last_daily_date = today then streak_current
               when last_daily_date = today - 1 then streak_current + 1
               else 1 end,
             last_daily_date = today
       where id = a.user_id;
      update public.profiles set streak_best = greatest(streak_best, streak_current) where id = a.user_id;
    end if;
  elsif a.status <> 'finished' then
    raise exception 'attempt_closed';
  end if;

  select * into prof from public.profiles where id = a.user_id;

  -- Full review: what you picked, what was right, why.
  select jsonb_agg(jsonb_build_object(
           'position', ans.position,
           'prompt', q ->> 'prompt',
           'type', q ->> 'type',
           'is_correct', ans.is_correct,
           'timed_out', ans.timed_out,
           'your_answer', case when q ->> 'type' = 'slider' then to_jsonb(ans.chosen_value)
                               else (select to_jsonb(o ->> 'label') from jsonb_array_elements(q -> 'options') o
                                      where o ->> 'id' = ans.chosen_option_id::text) end,
           'correct_answer', case when q ->> 'type' = 'slider' then to_jsonb(q -> 'slider' -> 'correct')
                                  else (select to_jsonb(o ->> 'label') from jsonb_array_elements(q -> 'options') o
                                         where (o ->> 'is_correct')::boolean limit 1) end,
           'explanation', q ->> 'explanation',
           'source_url', q ->> 'source_url',
           'time_ms', ans.time_ms)
         order by ans.position)
    into review
    from public.attempt_answers ans
    cross join lateral (select public._snapshot_question(a.quiz_version_id, ans.question_id) as q) s
   where ans.attempt_id = a.id;

  if a.mode in ('ranked', 'daily') then
    ranks := jsonb_build_object(
      'all_time', public._rank_of('all_time', a.quiz_id, '1970-01-01', a.user_id),
      'weekly', public._rank_of('weekly', a.quiz_id, wk, a.user_id));
    if a.mode = 'daily' then
      ranks := ranks || jsonb_build_object('daily', public._rank_of('daily', a.quiz_id,
                 (select challenge_date from public.daily_challenges where id = a.daily_challenge_id), a.user_id));
    end if;
  end if;

  if a.friend_challenge_id is not null then
    select jsonb_build_object(
             'creator_nickname', coalesce(cp.nickname, 'Your friend'),
             'creator_correct', ca.correct_count,
             'creator_time_ms', ca.answer_time_ms,
             'you_won', a.correct_count > ca.correct_count
                        or (a.correct_count = ca.correct_count and a.answer_time_ms < ca.answer_time_ms),
             'tie', a.correct_count = ca.correct_count and a.answer_time_ms = ca.answer_time_ms)
      into versus
      from public.friend_challenges fc
      join public.attempts ca on ca.id = fc.creator_attempt_id
      join public.profiles cp on cp.id = fc.creator_id
     where fc.id = a.friend_challenge_id;
  end if;

  return jsonb_build_object(
    'attempt_id', a.id,
    'mode', a.mode,
    'correct', (select correct_count from public.attempts where id = a.id),
    'total', total,
    'answer_time_ms', (select answer_time_ms from public.attempts where id = a.id),
    'review', coalesce(review, '[]'::jsonb),
    'ranks', ranks,
    'versus', versus,
    'needs_nickname', prof.nickname is null,
    'streak', prof.streak_current
  );
end;
$$;

-- ---------- Leaderboards (public) -------------------------------------
-- p_board: 'all_time' | 'weekly' | 'daily'. For 'daily', the slug may be null (today's challenge).
create or replace function public.get_leaderboard(
  p_quiz_slug text default null,
  p_board text default 'all_time',
  p_limit int default 50)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  qid uuid;
  period date;
  top jsonb;
  me jsonb;
begin
  if p_board not in ('all_time', 'weekly', 'daily') then raise exception 'invalid_board'; end if;

  if p_board = 'daily' then
    select d.quiz_id, d.challenge_date into qid, period
      from public.daily_challenges d
      join public.quizzes q on q.id = d.quiz_id
     where d.challenge_date = public._london_today()
       and (p_quiz_slug is null or q.slug = p_quiz_slug);
  else
    select id into qid from public.quizzes where slug = p_quiz_slug and status = 'published';
    period := case when p_board = 'weekly' then public._london_week_start() else '1970-01-01'::date end;
  end if;
  if qid is null then return jsonb_build_object('top', '[]'::jsonb, 'me', null); end if;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.rank, t.achieved_at), '[]'::jsonb) into top
    from (
      select rank() over (order by e.correct_count desc, e.answer_time_ms asc, e.achieved_at asc) as rank,
             p.nickname, av.image_url as avatar_url, e.correct_count as correct, e.total,
             e.answer_time_ms, e.achieved_at, (e.user_id = auth.uid()) as is_me
        from public.leaderboard_entries e
        join public.profiles p on p.id = e.user_id
        left join public.avatars av on av.id = p.avatar_id and av.status = 'ready'
       where e.board = p_board and e.quiz_id = qid and e.period_start = period
         and not e.is_hidden and p.nickname is not null
       order by e.correct_count desc, e.answer_time_ms asc, e.achieved_at asc
       limit least(greatest(p_limit, 1), 100)
    ) t;

  if auth.uid() is not null then
    select jsonb_build_object('rank', public._rank_of(p_board, qid, period, auth.uid()),
                              'correct', e.correct_count, 'total', e.total, 'answer_time_ms', e.answer_time_ms)
      into me
      from public.leaderboard_entries e
     where e.board = p_board and e.quiz_id = qid and e.period_start = period and e.user_id = auth.uid();
  end if;

  return jsonb_build_object('top', top, 'me', me);
end;
$$;

-- ---------- Friend challenges -----------------------------------------
create or replace function public.create_friend_challenge(p_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  a public.attempts;
  existing public.friend_challenges;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  new_code text;
  tries int := 0;
begin
  select * into a from public.attempts where id = p_attempt_id;
  if a.id is null or a.user_id <> auth.uid() then raise exception 'attempt_not_found'; end if;
  if a.status <> 'finished' then raise exception 'attempt_not_finished'; end if;

  select * into existing from public.friend_challenges
   where creator_attempt_id = a.id and expires_at > now();
  if existing.id is not null then
    return jsonb_build_object('code', existing.code, 'expires_at', existing.expires_at);
  end if;

  loop
    tries := tries + 1;
    select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '')
      into new_code from generate_series(1, 8);
    begin
      insert into public.friend_challenges (code, quiz_id, quiz_version_id, creator_id, creator_attempt_id)
      values (new_code, a.quiz_id, a.quiz_version_id, a.user_id, a.id)
      returning * into existing;
      exit;
    exception when unique_violation then
      if tries >= 5 then raise; end if;
    end;
  end loop;

  return jsonb_build_object('code', existing.code, 'expires_at', existing.expires_at);
end;
$$;

-- Public preview of a challenge link: nickname + score only, never email.
create or replace function public.get_friend_challenge(p_code text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
           'code', fc.code,
           'expired', fc.expires_at < now(),
           'quiz', jsonb_build_object('slug', q.slug, 'title', q.title, 'cover_image_url', q.cover_image_url),
           'creator', jsonb_build_object('nickname', coalesce(p.nickname, 'A friend'), 'avatar_url', av.image_url),
           'creator_correct', a.correct_count,
           'total', array_length(a.question_order, 1),
           'creator_time_ms', a.answer_time_ms)
    from public.friend_challenges fc
    join public.quizzes q on q.id = fc.quiz_id
    join public.attempts a on a.id = fc.creator_attempt_id
    join public.profiles p on p.id = fc.creator_id
    left join public.avatars av on av.id = p.avatar_id and av.status = 'ready'
   where fc.code = p_code
$$;

-- ---------- Profile: age band, nickname --------------------------------
create or replace function public.set_age_band(p_band text)
returns void
language plpgsql security definer set search_path = public
as $$
declare current_band text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  if p_band not in ('under_13', '13_17', '18_plus') then raise exception 'invalid_age_band'; end if;
  select age_band into current_band from public.profiles where id = auth.uid();
  -- Once set, only an admin can change it (stops a child switching to adult).
  if current_band is not null and current_band <> p_band then raise exception 'age_band_locked'; end if;
  perform set_config('dyk.trusted', 'on', true);
  update public.profiles set age_band = p_band where id = auth.uid();
end;
$$;

-- Friendly generated nicknames ("BraveOtter42"); the only option for under-13s.
create or replace function public.assign_random_nickname()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  adjectives constant text[] := array['Brave','Clever','Happy','Swift','Bright','Lucky','Mighty','Sunny','Jolly','Witty',
                                      'Calm','Bold','Cosmic','Curious','Gentle','Quick','Sharp','Speedy','Super','Wise'];
  animals constant text[] := array['Otter','Panda','Falcon','Tiger','Koala','Dolphin','Fox','Owl','Lion','Zebra',
                                   'Eagle','Gecko','Rhino','Puffin','Turtle','Lynx','Bison','Hedgehog','Penguin','Whale'];
  nick text;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  nick := adjectives[1 + floor(random() * array_length(adjectives, 1))::int]
       || animals[1 + floor(random() * array_length(animals, 1))::int]
       || (10 + floor(random() * 90))::int::text;
  perform set_config('dyk.trusted', 'on', true);
  update public.profiles set nickname = nick where id = auth.uid();
  return nick;
end;
$$;

-- Free-text nicknames for 13+ only, filtered against blocked words.
create or replace function public.set_nickname(p_nickname text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  band text;
  nick text := btrim(regexp_replace(p_nickname, '\s+', ' ', 'g'));
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select age_band into band from public.profiles where id = auth.uid();
  if band is null then raise exception 'age_band_required'; end if;
  if band = 'under_13' then raise exception 'kids_use_generated_nickname'; end if;
  if nick !~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{1,18}[A-Za-z0-9]$' then raise exception 'invalid_nickname'; end if;
  if exists (select 1 from public.blocked_words w
              where position(w.word in regexp_replace(lower(nick), '[^a-z0-9]', '', 'g')) > 0) then
    raise exception 'nickname_not_allowed';
  end if;
  perform set_config('dyk.trusted', 'on', true);
  update public.profiles set nickname = nick where id = auth.uid();
  return nick;
end;
$$;

-- A parent confirms after signing in with their own email on the child's account.
create or replace function public.confirm_parental_consent()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.parental_consents
     set status = 'confirmed', confirmed_at = now()
   where child_id = auth.uid() and status = 'pending';
  if not found then raise exception 'no_pending_consent'; end if;
end;
$$;

-- ---------- Avatars ---------------------------------------------------
-- Validates traits against site_config.avatar_traits, enforces one live avatar
-- per trait combination and a daily generation limit. The image itself is made
-- by the background job (Inngest → Supabase Edge Function → OpenRouter → ImageKit).
create or replace function public.request_avatar(p_traits jsonb)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  uid uuid := auth.uid();
  allowed jsonb;
  k text;
  v text;
  band text;
  daily_limit int;
  v_key text;
  new_id uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select value into allowed from public.site_config where key = 'avatar_traits';
  select (value #>> '{}')::int into daily_limit from public.site_config where key = 'avatar_daily_limit';
  select age_band into band from public.profiles where id = uid;

  for k in select jsonb_object_keys(allowed) loop
    v := p_traits ->> k;
    if v is null or not (allowed -> k) ? v then
      raise exception 'invalid_trait' using detail = k;
    end if;
  end loop;
  if (select count(*) from jsonb_object_keys(p_traits)) <> (select count(*) from jsonb_object_keys(allowed)) then
    raise exception 'invalid_trait' using detail = 'unexpected keys';
  end if;
  if p_traits ->> 'facial_hair' <> 'none' and p_traits ->> 'age_look' <> 'adult' then
    raise exception 'invalid_trait' using detail = 'facial_hair';
  end if;
  if band = 'under_13' and p_traits ->> 'age_look' = 'adult' then
    raise exception 'invalid_trait' using detail = 'age_look';
  end if;

  if (select count(*) from public.avatars
       where user_id = uid
         and (created_at at time zone 'Europe/London')::date = public._london_today()) >= coalesce(daily_limit, 3) then
    raise exception 'avatar_limit_reached';
  end if;

  select string_agg(t.key || '=' || t.value, '|' order by t.key) into v_key
    from jsonb_each_text(p_traits) t;

  begin
    insert into public.avatars (user_id, traits, trait_key)
    values (uid, p_traits, v_key)
    returning id into new_id;
  exception when unique_violation then
    raise exception 'avatar_combo_taken';
  end;

  return jsonb_build_object('avatar_id', new_id, 'status', 'pending');
end;
$$;

create or replace function public.set_active_avatar(p_avatar_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.avatars
                  where id = p_avatar_id and user_id = auth.uid() and status = 'ready') then
    raise exception 'avatar_not_ready';
  end if;
  perform set_config('dyk.trusted', 'on', true);
  update public.profiles set avatar_id = p_avatar_id where id = auth.uid();
end;
$$;

-- ---------- AI drafts → question bank (staff) -------------------------
-- Imports a ready draft as 'in_review' questions. Anything without a source URL is skipped.
create or replace function public.import_ai_draft(p_draft_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  d public.ai_question_drafts;
  item jsonb;
  opt jsonb;
  qid uuid;
  imported int := 0;
  skipped int := 0;
  i int;
begin
  if not public.is_staff() then raise exception 'staff_only'; end if;
  select * into d from public.ai_question_drafts where id = p_draft_id for update;
  if d.id is null or d.status <> 'ready' then raise exception 'draft_not_ready'; end if;

  for item in select * from jsonb_array_elements(coalesce(d.result -> 'questions', '[]'::jsonb)) loop
    if coalesce(item ->> 'source_url', '') = '' or coalesce(item ->> 'prompt', '') = ''
       or item ->> 'type' not in ('choice', 'boolean', 'slider') then
      skipped := skipped + 1;
      continue;
    end if;
    begin
      insert into public.questions
        (category_id, type, prompt, explanation, source_url, review_by, difficulty, age_min, age_max,
         slider_min, slider_max, slider_step, slider_unit, correct_value, accept_min, accept_max,
         status, origin, ai_draft_id, created_by)
      values
        (d.category_id, item ->> 'type', item ->> 'prompt', item ->> 'explanation', item ->> 'source_url',
         (current_date + interval '6 months')::date, d.difficulty, d.age_min, d.age_max,
         (item -> 'slider' ->> 'min')::numeric, (item -> 'slider' ->> 'max')::numeric,
         (item -> 'slider' ->> 'step')::numeric, item -> 'slider' ->> 'unit',
         (item -> 'slider' ->> 'correct')::numeric, (item -> 'slider' ->> 'accept_min')::numeric,
         (item -> 'slider' ->> 'accept_max')::numeric,
         'in_review', 'ai', d.id, auth.uid())
      returning id into qid;

      i := 0;
      for opt in select * from jsonb_array_elements(coalesce(item -> 'options', '[]'::jsonb)) loop
        insert into public.question_options (question_id, label, is_correct, sort_order)
        values (qid, opt ->> 'label', coalesce((opt ->> 'is_correct')::boolean, false), i);
        i := i + 1;
      end loop;
      imported := imported + 1;
    exception when others then
      skipped := skipped + 1;   -- malformed item: skip, keep importing the rest
    end;
  end loop;

  update public.ai_question_drafts set status = 'imported' where id = d.id;
  return jsonb_build_object('imported', imported, 'skipped', skipped);
end;
$$;

-- ---------- Account deletion ------------------------------------------
-- Removes the auth user; profile, attempts, avatars and board rows cascade.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------- Grants ----------------------------------------------------
-- Internal helpers: nobody calls these directly.
revoke all on function public._london_today() from public, anon, authenticated;
revoke all on function public._london_week_start() from public, anon, authenticated;
revoke all on function public._snapshot_question(uuid, uuid) from public, anon, authenticated;
revoke all on function public._public_question(jsonb, uuid, boolean) from public, anon, authenticated;
revoke all on function public._attempt_state(uuid) from public, anon, authenticated;
revoke all on function public._record_best(text, uuid, date, uuid, uuid, int, int, int) from public, anon, authenticated;
revoke all on function public._rank_of(text, uuid, date, uuid) from public, anon, authenticated;

-- Signed-in users (anonymous guests count as 'authenticated').
revoke all on function public.start_attempt(text, text, text) from public, anon;
revoke all on function public.next_question(uuid) from public, anon;
revoke all on function public.answer_question(uuid, uuid, numeric) from public, anon;
revoke all on function public.finish_attempt(uuid) from public, anon;
revoke all on function public.create_friend_challenge(uuid) from public, anon;
revoke all on function public.set_age_band(text) from public, anon;
revoke all on function public.assign_random_nickname() from public, anon;
revoke all on function public.set_nickname(text) from public, anon;
revoke all on function public.confirm_parental_consent() from public, anon;
revoke all on function public.request_avatar(jsonb) from public, anon;
revoke all on function public.set_active_avatar(uuid) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
revoke all on function public.publish_quiz(uuid, timestamptz) from public, anon;
revoke all on function public.import_ai_draft(uuid) from public, anon;

grant execute on function public.start_attempt(text, text, text) to authenticated;
grant execute on function public.next_question(uuid) to authenticated;
grant execute on function public.answer_question(uuid, uuid, numeric) to authenticated;
grant execute on function public.finish_attempt(uuid) to authenticated;
grant execute on function public.create_friend_challenge(uuid) to authenticated;
grant execute on function public.set_age_band(text) to authenticated;
grant execute on function public.assign_random_nickname() to authenticated;
grant execute on function public.set_nickname(text) to authenticated;
grant execute on function public.confirm_parental_consent() to authenticated;
grant execute on function public.request_avatar(jsonb) to authenticated;
grant execute on function public.set_active_avatar(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.publish_quiz(uuid, timestamptz) to authenticated;   -- admin check inside
grant execute on function public.import_ai_draft(uuid) to authenticated;             -- staff check inside

-- Public (also used by the build-time prerender with the anon key).
grant execute on function public.get_leaderboard(text, text, int) to anon, authenticated;
grant execute on function public.get_friend_challenge(text) to anon, authenticated;
