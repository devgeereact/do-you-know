-- =====================================================================
-- 0006_avatar_options.sql — Do You Know: let the avatar builder read its options.
--
-- site_config is admin-only, so players could not see the allowed avatar
-- traits that request_avatar() validates against. This read-only function
-- returns just those lists, the daily limit and how many the caller has
-- used today (London date). No other site_config keys are exposed.
-- =====================================================================

create or replace function public.get_avatar_options()
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'traits', (select value from public.site_config where key = 'avatar_traits'),
    'daily_limit', coalesce(
      (select (value #>> '{}')::int from public.site_config where key = 'avatar_daily_limit'), 3),
    'used_today', case when auth.uid() is null then 0 else (
      select count(*)::int from public.avatars
       where user_id = auth.uid()
         and (created_at at time zone 'Europe/London')::date = public._london_today()) end
  );
$$;

revoke all on function public.get_avatar_options() from public;
grant execute on function public.get_avatar_options() to anon, authenticated;
