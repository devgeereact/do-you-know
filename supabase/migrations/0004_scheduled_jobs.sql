-- =====================================================================
-- 0004_scheduled_jobs.sql — Do You Know: scheduled work (pg_cron + pg_net)
--
-- All times are handled in Europe/London inside the functions, so the hourly
-- cron schedule (UTC) stays correct across BST/GMT changes.
--
-- Jobs:
--   dyk-daily-switch     hourly  → activate today's daily challenge at 00:00 London
--   dyk-publish-due      5 min   → flip scheduled quizzes to published when due
--   dyk-rebuild-hook     5 min   → call the rebuild Edge Function if anything was published
--   dyk-cleanup          daily   → abandon stale attempts, purge long-expired challenges
--
-- Before enabling the rebuild hook:
--   1. Deploy the `trigger-rebuild` Edge Function (see docs/ARCHITECTURE.md).
--   2. update public.site_config set value = to_jsonb('https://<ref>.supabase.co/functions/v1/trigger-rebuild'::text)
--        where key = 'rebuild_hook_url';
--   3. select vault.create_secret('<random string>', 'rebuild_hook_secret');
--      (set the same value as REBUILD_HOOK_SECRET on the Edge Function)
-- =====================================================================

-- ---------- Extensions (present on Supabase; skipped where unavailable) --
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  end if;
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- ---------- Daily challenge switch ------------------------------------
-- Idempotent: safe to run every hour. Freezes the quiz version when a day goes live,
-- so editing the quiz later never changes that day's challenge.
create or replace function public.activate_daily_challenge()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  today date := public._london_today();
  dc public.daily_challenges;
  ver uuid;
begin
  update public.daily_challenges set status = 'done'
   where challenge_date < today and status <> 'done';

  select * into dc from public.daily_challenges where challenge_date = today;
  if dc.id is null then
    return 'no challenge scheduled for ' || today;
  end if;
  if dc.status = 'live' then
    return 'already live';
  end if;

  select current_version_id into ver from public.quizzes
   where id = dc.quiz_id and status = 'published';
  if ver is null then
    insert into public.audit_log (action, table_name, row_id, new_data)
    values ('DAILY_SKIPPED', 'daily_challenges', dc.id::text,
            jsonb_build_object('reason', 'quiz not published', 'date', today));
    return 'quiz not published';
  end if;

  update public.daily_challenges
     set status = 'live', quiz_version_id = coalesce(quiz_version_id, ver)
   where id = dc.id;
  insert into public.rebuild_requests (reason) values ('daily ' || today);
  return 'live';
end;
$$;

-- ---------- Scheduled publishing --------------------------------------
create or replace function public.publish_due_quizzes()
returns int
language plpgsql security definer set search_path = public
as $$
declare n int;
begin
  update public.quizzes set status = 'published'
   where status = 'scheduled' and publish_at <= now() and current_version_id is not null;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.rebuild_requests (reason) values (format('%s scheduled quiz(zes) went live', n));
  end if;
  return n;
end;
$$;

-- ---------- Rebuild hook (debounced) ----------------------------------
-- Sends ONE request for any number of pending publishes, so a busy editing
-- session triggers one site rebuild rather than dozens.
create or replace function public.send_rebuild_hook()
returns text
language plpgsql security definer set search_path = public
as $$
declare
  hook_url text;
  secret text;
  pending int;
begin
  select count(*) into pending from public.rebuild_requests where sent_at is null;
  if pending = 0 then return 'nothing pending'; end if;

  select value #>> '{}' into hook_url from public.site_config where key = 'rebuild_hook_url';
  if coalesce(hook_url, '') = '' then return 'rebuild_hook_url not set'; end if;
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return 'pg_net not installed'; end if;

  execute $q$ select decrypted_secret from vault.decrypted_secrets where name = 'rebuild_hook_secret' $q$ into secret;
  if secret is null then return 'rebuild_hook_secret missing in vault'; end if;

  execute $q$ select net.http_post(url := $1, body := $2, headers := $3) $q$
    using hook_url,
          jsonb_build_object('pending', pending),
          jsonb_build_object('Content-Type', 'application/json', 'x-rebuild-secret', secret);

  update public.rebuild_requests set sent_at = now() where sent_at is null;
  return format('sent (%s pending)', pending);
end;
$$;

-- ---------- Housekeeping ----------------------------------------------
create or replace function public.cleanup_stale_data()
returns void
language sql security definer set search_path = public
as $$
  update public.attempts set status = 'abandoned'
   where status = 'in_progress' and started_at < now() - interval '24 hours';
  delete from public.friend_challenges where expires_at < now() - interval '60 days';
  delete from public.rebuild_requests where sent_at < now() - interval '30 days';
$$;

-- Jobs are server-only.
revoke all on function public.activate_daily_challenge() from public, anon, authenticated;
revoke all on function public.publish_due_quizzes() from public, anon, authenticated;
revoke all on function public.send_rebuild_hook() from public, anon, authenticated;
revoke all on function public.cleanup_stale_data() from public, anon, authenticated;

-- ---------- Schedules (cron.schedule upserts by job name) --------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('dyk-daily-switch', '0 * * * *',   'select public.activate_daily_challenge()');
    perform cron.schedule('dyk-publish-due',  '*/5 * * * *', 'select public.publish_due_quizzes()');
    perform cron.schedule('dyk-rebuild-hook', '2-59/5 * * * *', 'select public.send_rebuild_hook()');
    perform cron.schedule('dyk-cleanup',      '30 3 * * *',  'select public.cleanup_stale_data()');
  else
    raise notice 'pg_cron not available: schedules skipped (expected outside Supabase)';
  end if;
end $$;
