-- Fresh rounds are ordinary unranked practice, with a separate resume lane.
alter table public.attempts add column is_daily_practice boolean not null default false;
alter table public.attempts add constraint daily_practice_unranked
  check (not is_daily_practice or (mode = 'practice' and daily_challenge_id is null and friend_challenge_id is null));

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
     and not is_daily_practice
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

-- Serialise fresh starts for one account, including simultaneous devices/tabs.
create function public.start_daily_practice()
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  dc public.daily_challenges;
  ver public.quiz_versions;
  existing public.attempts;
  q_order uuid[];
  new_id uuid;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform 1 from public.profiles where id = uid for update;
  select * into existing from public.attempts where user_id = uid
    and is_daily_practice and status = 'in_progress'
    order by started_at desc limit 1;
  if existing.id is not null then
    if existing.current_sent_at is null and existing.current_index < array_length(existing.question_order, 1) then
      update public.attempts set current_sent_at = now() where id = existing.id;
    end if;
    return public._attempt_state(existing.id);
  end if;
  select * into dc from public.daily_challenges
    where challenge_date = public._london_today() and status = 'live';
  if dc.id is null or dc.quiz_version_id is null then raise exception 'no_daily_today'; end if;
  if not exists(select 1 from public.attempts where user_id = uid and mode = 'daily'
      and daily_challenge_id = dc.id and status = 'finished') then
    raise exception 'daily_not_finished';
  end if;
  select * into ver from public.quiz_versions where id = dc.quiz_version_id;
  if (select count(*) from public.attempts where user_id = uid
      and started_at > now() - interval '1 minute') >= 5 then
    raise exception 'too_many_attempts';
  end if;
  -- Exclude every question reserved by any previous attempt for this account.
  -- IDs survive republishing; changing order or version cannot reintroduce them.
  select array_agg(id) into q_order from (
    select (e ->> 'id')::uuid as id from jsonb_array_elements(ver.snapshot) e
    where not exists(select 1 from public.attempts a where a.user_id = uid
      and (e ->> 'id')::uuid = any(a.question_order))
    order by random() limit ver.question_count) available;
  if coalesce(array_length(q_order, 1), 0) < ver.question_count then
    raise exception 'fresh_questions_exhausted';
  end if;
  insert into public.attempts(user_id, quiz_id, quiz_version_id, mode, question_order, current_sent_at, is_daily_practice)
    values(uid, dc.quiz_id, ver.id, 'practice', q_order, now(), true) returning id into new_id;
  return public._attempt_state(new_id);
end;
$$;
revoke all on function public.start_daily_practice() from public, anon;
grant execute on function public.start_daily_practice() to authenticated;
