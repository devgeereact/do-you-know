-- Read-only daily preview uses the same London date as start_attempt.
create or replace function public.get_daily_challenge()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  preview jsonb;
  played boolean := false;
  current_streak int := 0;
begin
  select jsonb_build_object('date', d.challenge_date,
    'quiz', jsonb_build_object('slug', q.slug, 'title', q.title, 'cover_image_url', q.cover_image_url))
  into preview from public.daily_challenges d join public.quizzes q on q.id = d.quiz_id
  where d.challenge_date = public._london_today() and d.status = 'live';
  if auth.uid() is not null then
    select exists(select 1 from public.attempts a join public.daily_challenges d on d.id = a.daily_challenge_id
      where a.user_id = auth.uid() and a.status = 'finished' and d.challenge_date = public._london_today()) into played;
    select coalesce(streak_current, 0) into current_streak from public.profiles where id = auth.uid();
  end if;
  return jsonb_build_object('today', preview, 'played_today', played, 'streak', coalesce(current_streak, 0));
end;
$$;
revoke all on function public.get_daily_challenge() from public;
grant execute on function public.get_daily_challenge() to anon, authenticated;
