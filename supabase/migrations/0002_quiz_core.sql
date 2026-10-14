-- =====================================================================
-- 0002_quiz_core.sql — Do You Know: core tables, RLS and guards
-- Additive and idempotent. Never edit 0001_init.sql; this file adjusts it.
--
-- Golden rule: the browser can read questions' public text, NEVER answers.
-- Answers live in questions/question_options/quiz_versions, which only staff
-- and SECURITY DEFINER game functions (0003) can read.
-- =====================================================================

-- ---------- 0. Fixes to the base schema (0001) ------------------------
-- Guests use Supabase anonymous sign-in, which has no email.
alter table public.profiles alter column email drop not null;

-- Light is the app default.
alter table public.app_settings alter column theme set default 'light';

-- ---------- 1. Profile extensions ------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'guest',
  add column if not exists nickname text,
  add column if not exists age_band text,
  add column if not exists avatar_id uuid,
  add column if not exists streak_current int not null default 0,
  add column if not exists streak_best int not null default 0,
  add column if not exists last_daily_date date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check
      check (role in ('guest', 'player', 'editor', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_age_band_check') then
    alter table public.profiles add constraint profiles_age_band_check
      check (age_band is null or age_band in ('under_13', '13_17', '18_plus'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_nickname_check') then
    alter table public.profiles add constraint profiles_nickname_check
      check (nickname is null or nickname ~ '^[A-Za-z0-9][A-Za-z0-9 ._-]{1,18}[A-Za-z0-9]$');
  end if;
end $$;

-- ---------- 2. Role helpers ------------------------------------------
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public
as $$ select coalesce((select role from public.profiles where id = auth.uid()), 'guest') $$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role_name() in ('editor', 'admin') $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select public.current_role_name() = 'admin' $$;

-- ---------- 3. Global config (admin only) -----------------------------
-- Non-secret settings: OpenRouter model ids, avatar trait lists, rebuild hook URL.
-- Secrets (OpenRouter key, ImageKit private key) live in Edge Function secrets.
create table if not exists public.site_config (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default timezone('utc', now()),
  updated_by  uuid references public.profiles(id) on delete set null
);

insert into public.site_config (key, value) values
  ('ai_models', '{"text": "openai/gpt-4o-mini", "image": "google/gemini-2.5-flash-image"}'),
  ('avatar_daily_limit', '3'),
  ('rebuild_hook_url', '""'),
  ('avatar_traits', '{
     "age_look": ["child", "teen", "adult"],
     "skin_tone": ["porcelain", "fair", "light", "light-olive", "medium", "olive", "tan", "brown", "deep-brown", "ebony"],
     "face_shape": ["round", "oval", "square", "heart", "long"],
     "hair_style": ["afro", "short-curls", "high-top", "braids", "box-braids", "locs", "cornrows", "buzz-cut", "crew-cut", "side-part", "long-straight", "long-wavy", "ponytail", "two-puffs", "bun", "bob", "pixie", "hijab", "turban", "headwrap", "bald"],
     "hair_colour": ["black", "dark-brown", "brown", "auburn", "red", "blonde", "platinum", "grey"],
     "eye_colour": ["dark-brown", "brown", "hazel", "green", "blue", "grey"],
     "outfit": ["hoodie", "t-shirt", "denim-jacket", "sweater", "polo", "school-blazer", "cardigan", "sports-jersey", "dungarees", "button-shirt", "puffer-jacket", "kaftan"],
     "outfit_colour": ["navy", "red", "royal-blue", "sky-blue", "emerald", "mustard", "orange", "purple", "pink", "white", "black", "grey", "teal", "maroon"],
     "accessory": ["none", "glasses", "round-glasses", "headphones", "beanie", "cap", "earrings", "hair-clips", "bandana"],
     "facial_hair": ["none", "moustache", "short-beard", "goatee"]
   }')
on conflict (key) do nothing;

-- ---------- 4. Blocked words for nicknames -----------------------------
create table if not exists public.blocked_words (
  word        text primary key check (word = lower(word)),
  created_at  timestamptz not null default timezone('utc', now())
);

-- ---------- 5. Content: categories, questions, quizzes ----------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  description  text,
  kind         text not null default 'general' check (kind in ('general', 'school')),
  icon         text,                         -- icon name or ImageKit path
  scene        text,                         -- per-category illustrated scene set
  sort_order   int not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now())
);

-- Curriculum tags (e.g. uk-ks2, us-grade-4, ng-jss1). Quizzes reference codes.
create table if not exists public.curriculum_tags (
  code        text primary key check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  label       text not null,
  system      text not null,                 -- 'UK', 'US', 'West Africa', ...
  age_min     smallint,
  age_max     smallint,
  sort_order  int not null default 0
);

insert into public.curriculum_tags (code, label, system, age_min, age_max, sort_order) values
  ('uk-ks1', 'Key Stage 1', 'UK', 5, 7, 10),
  ('uk-ks2', 'Key Stage 2', 'UK', 7, 11, 11),
  ('uk-ks3', 'Key Stage 3', 'UK', 11, 14, 12),
  ('uk-ks4', 'Key Stage 4 (GCSE)', 'UK', 14, 16, 13),
  ('us-k-2', 'Grades K–2', 'US', 5, 8, 20),
  ('us-3-5', 'Grades 3–5', 'US', 8, 11, 21),
  ('us-6-8', 'Grades 6–8', 'US', 11, 14, 22),
  ('us-9-12', 'Grades 9–12', 'US', 14, 18, 23),
  ('wa-primary', 'Primary', 'West Africa', 6, 11, 30),
  ('wa-jss', 'Junior Secondary (JSS)', 'West Africa', 11, 14, 31),
  ('wa-sss', 'Senior Secondary (SSS / WAEC)', 'West Africa', 14, 18, 32)
on conflict (code) do nothing;

create table if not exists public.questions (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references public.categories(id) on delete set null,
  type          text not null check (type in ('choice', 'boolean', 'slider')),
  prompt        text not null check (char_length(prompt) between 5 and 300),
  explanation   text,
  source_url    text,
  review_by     date,                         -- re-check time-sensitive facts
  difficulty    text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  age_min       smallint,
  age_max       smallint,
  image_url     text,
  -- slider-only fields
  slider_min    numeric,
  slider_max    numeric,
  slider_step   numeric,
  slider_unit   text,
  correct_value numeric,
  accept_min    numeric,
  accept_max    numeric,
  status        text not null default 'draft'
                  check (status in ('draft', 'in_review', 'approved', 'retired')),
  origin        text not null default 'human' check (origin in ('human', 'ai')),
  ai_draft_id   uuid,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint questions_slider_fields check (
    type <> 'slider' or (
      slider_min is not null and slider_max is not null and slider_step is not null
      and correct_value is not null and accept_min is not null and accept_max is not null
      and slider_min < slider_max
      and accept_min <= correct_value and correct_value <= accept_max
    )
  )
);

create table if not exists public.question_options (
  id           uuid primary key default gen_random_uuid(),
  question_id  uuid not null references public.questions(id) on delete cascade,
  label        text not null check (char_length(label) between 1 and 120),
  is_correct   boolean not null default false,
  sort_order   smallint not null default 0
);

create index if not exists question_options_question_idx on public.question_options (question_id);
create index if not exists questions_category_idx on public.questions (category_id);
create index if not exists questions_review_by_idx on public.questions (review_by) where status <> 'retired';

create table if not exists public.quizzes (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title               text not null,
  intro               text,                   -- 150–300 words for the SEO landing page
  category_id         uuid references public.categories(id) on delete set null,
  difficulty          text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  age_min             smallint,
  age_max             smallint,
  curriculum_tags     text[] not null default '{}',
  cover_image_url     text,
  question_count      smallint not null default 10 check (question_count between 3 and 50),
  time_limit_seconds  smallint check (time_limit_seconds is null or time_limit_seconds between 5 and 120),
  shuffle_options     boolean not null default true,
  is_ranked           boolean not null default true,
  status              text not null default 'draft'
                        check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived')),
  publish_at          timestamptz,
  current_version_id  uuid,
  seo_title           text,
  seo_description     text,
  created_by          uuid references public.profiles(id) on delete set null,
  updated_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now())
);

create index if not exists quizzes_category_idx on public.quizzes (category_id);
create index if not exists quizzes_status_idx on public.quizzes (status);
create index if not exists quizzes_curriculum_idx on public.quizzes using gin (curriculum_tags);

create table if not exists public.quiz_questions (
  quiz_id      uuid not null references public.quizzes(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete restrict,
  position     smallint not null,
  primary key (quiz_id, question_id)
);

-- Frozen snapshot of a quiz's questions (WITH answers) at publish time.
-- Attempts point at a version, so editing a quiz never changes old results.
create table if not exists public.quiz_versions (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references public.quizzes(id) on delete cascade,
  version         int not null,
  snapshot        jsonb not null,             -- [{id,type,prompt,explanation,source_url,image_url,options:[{id,label,is_correct}],slider:{...}}]
  question_count  smallint not null,
  published_at    timestamptz not null default timezone('utc', now()),
  published_by    uuid references public.profiles(id) on delete set null,
  unique (quiz_id, version)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'quizzes_current_version_fk') then
    alter table public.quizzes add constraint quizzes_current_version_fk
      foreign key (current_version_id) references public.quiz_versions(id) on delete set null;
  end if;
end $$;

-- ---------- 6. Avatars (unique trait combinations) ---------------------
create table if not exists public.avatars (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  traits      jsonb not null,
  trait_key   text not null,                  -- canonical "k=v|k=v" string of the traits
  status      text not null default 'pending'
                check (status in ('pending', 'generating', 'ready', 'failed', 'rejected')),
  image_url   text,
  model       text,
  error       text,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now())
);

-- One live avatar per trait combination: failed/rejected ones free the combo.
create unique index if not exists avatars_trait_key_live_idx
  on public.avatars (trait_key) where status not in ('failed', 'rejected');
create index if not exists avatars_user_idx on public.avatars (user_id, created_at desc);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_fk') then
    alter table public.profiles add constraint profiles_avatar_fk
      foreign key (avatar_id) references public.avatars(id) on delete set null;
  end if;
end $$;

-- ---------- 7. Play: attempts and answers ------------------------------
create table if not exists public.daily_challenges (
  id               uuid primary key default gen_random_uuid(),
  challenge_date   date not null unique,      -- Europe/London calendar date
  quiz_id          uuid not null references public.quizzes(id) on delete restrict,
  quiz_version_id  uuid references public.quiz_versions(id) on delete restrict,  -- frozen when it goes live
  status           text not null default 'scheduled' check (status in ('scheduled', 'live', 'done')),
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

create table if not exists public.attempts (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles(id) on delete cascade,
  quiz_id              uuid not null references public.quizzes(id) on delete cascade,
  quiz_version_id      uuid not null references public.quiz_versions(id) on delete restrict,
  mode                 text not null check (mode in ('practice', 'ranked', 'daily', 'challenge')),
  daily_challenge_id   uuid references public.daily_challenges(id) on delete set null,
  friend_challenge_id  uuid,
  question_order       uuid[] not null,
  current_index        smallint not null default 0,   -- 0-based index of the next question to answer
  current_sent_at      timestamptz,                   -- when the current question was shown; null between questions
  correct_count        smallint not null default 0,
  answered_count       smallint not null default 0,
  answer_time_ms       int not null default 0,        -- server-measured thinking time only
  status               text not null default 'in_progress'
                         check (status in ('in_progress', 'finished', 'abandoned')),
  started_at           timestamptz not null default timezone('utc', now()),
  finished_at          timestamptz
);

create index if not exists attempts_user_idx on public.attempts (user_id, started_at desc);
create index if not exists attempts_quiz_idx on public.attempts (quiz_id, status);
-- One daily attempt per player per day.
create unique index if not exists attempts_one_daily_idx
  on public.attempts (user_id, daily_challenge_id) where mode = 'daily';

create table if not exists public.attempt_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.attempts(id) on delete cascade,
  question_id      uuid not null,
  position         smallint not null,
  chosen_option_id uuid,
  chosen_value     numeric,
  is_correct       boolean not null,
  timed_out        boolean not null default false,
  sent_at          timestamptz not null,
  answered_at      timestamptz not null default timezone('utc', now()),
  time_ms          int not null,
  unique (attempt_id, position)
);

create table if not exists public.friend_challenges (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^[A-HJ-NP-Za-km-z2-9]{8}$'),
  quiz_id             uuid not null references public.quizzes(id) on delete cascade,
  quiz_version_id     uuid not null references public.quiz_versions(id) on delete restrict,
  creator_id          uuid not null references public.profiles(id) on delete cascade,
  creator_attempt_id  uuid not null references public.attempts(id) on delete cascade,
  expires_at          timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at          timestamptz not null default timezone('utc', now())
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'attempts_friend_challenge_fk') then
    alter table public.attempts add constraint attempts_friend_challenge_fk
      foreign key (friend_challenge_id) references public.friend_challenges(id) on delete set null;
  end if;
end $$;

create table if not exists public.leaderboard_entries (
  id             uuid primary key default gen_random_uuid(),
  board          text not null check (board in ('all_time', 'weekly', 'daily')),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  period_start   date not null default '1970-01-01',  -- all_time uses the sentinel date
  user_id        uuid not null references public.profiles(id) on delete cascade,
  attempt_id     uuid not null references public.attempts(id) on delete cascade,
  correct_count  smallint not null,
  total          smallint not null,
  answer_time_ms int not null,
  achieved_at    timestamptz not null default timezone('utc', now()),
  is_hidden      boolean not null default false,       -- moderation
  unique (board, quiz_id, period_start, user_id)
);

create index if not exists leaderboard_rank_idx
  on public.leaderboard_entries (board, quiz_id, period_start, correct_count desc, answer_time_ms asc, achieved_at asc);

-- ---------- 8. Children: parental confirmation ------------------------
-- Under-13s play as guests (no email). To save progress, a PARENT signs in with
-- the parent's own email (Supabase magic link verifies it). The guest account is
-- upgraded in place; this row records the parent's email and their confirmation.
create table if not exists public.parental_consents (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null unique references public.profiles(id) on delete cascade,
  parent_email  text not null,
  status        text not null default 'pending' check (status in ('pending', 'confirmed', 'revoked')),
  requested_at  timestamptz not null default timezone('utc', now()),
  confirmed_at  timestamptz
);

-- ---------- 9. AI question drafts --------------------------------------
create table if not exists public.ai_question_drafts (
  id            uuid primary key default gen_random_uuid(),
  topic         text not null,
  category_id   uuid references public.categories(id) on delete set null,
  difficulty    text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  age_min       smallint,
  age_max       smallint,
  count         smallint not null default 10 check (count between 1 and 30),
  model         text,
  status        text not null default 'queued'
                  check (status in ('queued', 'running', 'ready', 'failed', 'imported')),
  result        jsonb,                        -- raw drafted questions (each with a source_url)
  error         text,
  requested_by  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now())
);

-- ---------- 10. Site rebuild queue (prerendered SEO pages) ------------
create table if not exists public.rebuild_requests (
  id            bigint generated always as identity primary key,
  reason        text not null,
  requested_at  timestamptz not null default timezone('utc', now()),
  sent_at       timestamptz
);

-- ---------- 11. Audit log ---------------------------------------------
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  action      text not null,                 -- INSERT / UPDATE / DELETE / custom
  table_name  text not null,
  row_id      text,
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ---------- 12. updated_at triggers -----------------------------------
do $$
declare t text;
begin
  foreach t in array array['categories', 'questions', 'quizzes', 'avatars', 'daily_challenges', 'ai_question_drafts']
  loop
    execute format('drop trigger if exists %1$s_set_updated_at on public.%1$s', t);
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------- 13. Audit trigger on content and roles --------------------
create or replace function public.write_audit_log()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', null),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['categories', 'questions', 'question_options', 'quizzes', 'quiz_questions',
                           'daily_challenges', 'site_config', 'blocked_words']
  loop
    execute format('drop trigger if exists %1$s_audit on public.%1$s', t);
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s
                    for each row execute function public.write_audit_log()', t);
  end loop;
end $$;

-- Role changes are always audited.
create or replace function public.audit_role_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_log (actor_id, action, table_name, row_id, old_data, new_data)
    values (auth.uid(), 'ROLE_CHANGE', 'profiles', new.id::text,
            jsonb_build_object('role', old.role), jsonb_build_object('role', new.role));
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_audit on public.profiles;
create trigger profiles_role_audit after update on public.profiles
  for each row execute function public.audit_role_change();

-- ---------- 14. Protect profile columns -------------------------------
-- Players may not change their own role, streaks or age band directly.
-- Those change only through the functions in 0003 (or by an admin).
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Trusted callers: SQL editor / service role (no JWT) and admins.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  -- Game functions set this flag for the duration of their own update.
  if coalesce(current_setting('dyk.trusted', true), '') = 'on' then
    return new;
  end if;
  new.role            := old.role;
  new.email           := old.email;
  new.age_band        := old.age_band;
  new.nickname        := old.nickname;
  new.avatar_id       := old.avatar_id;
  new.streak_current  := old.streak_current;
  new.streak_best     := old.streak_best;
  new.last_daily_date := old.last_daily_date;
  return new;
end;
$$;

drop trigger if exists profiles_protect_columns on public.profiles;
create trigger profiles_protect_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------- 15. Sign-up provisioning (replaces 0001 version) ----------
-- Data minimisation for a children's service: we do NOT copy the Google
-- full name or photo into the profile. Guests start as role 'guest'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, case when coalesce(new.is_anonymous, false) then 'guest' else 'player' end)
  on conflict (id) do nothing;

  insert into public.app_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- A guest who links Google / email becomes a player, keeping all history.
create or replace function public.handle_user_upgraded()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(old.is_anonymous, false) and not coalesce(new.is_anonymous, false) then
    perform set_config('dyk.trusted', 'on', true);
    update public.profiles
       set role = case when role = 'guest' then 'player' else role end,
           email = new.email
     where id = new.id;
    -- A child's guest account upgraded with a parent's email: record a pending consent.
    insert into public.parental_consents (child_id, parent_email)
    select p.id, new.email from public.profiles p
     where p.id = new.id and p.age_band = 'under_13' and new.email is not null
    on conflict (child_id) do nothing;
  elsif new.email is distinct from old.email then
    perform set_config('dyk.trusted', 'on', true);
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.handle_user_upgraded();

-- ---------- 16. Row Level Security ------------------------------------
alter table public.site_config          enable row level security;
alter table public.blocked_words        enable row level security;
alter table public.categories           enable row level security;
alter table public.curriculum_tags      enable row level security;
alter table public.questions            enable row level security;
alter table public.question_options     enable row level security;
alter table public.quizzes              enable row level security;
alter table public.quiz_questions       enable row level security;
alter table public.quiz_versions        enable row level security;
alter table public.avatars              enable row level security;
alter table public.daily_challenges     enable row level security;
alter table public.attempts             enable row level security;
alter table public.attempt_answers      enable row level security;
alter table public.friend_challenges    enable row level security;
alter table public.leaderboard_entries  enable row level security;
alter table public.parental_consents    enable row level security;
alter table public.ai_question_drafts   enable row level security;
alter table public.rebuild_requests     enable row level security;
alter table public.audit_log            enable row level security;

-- profiles: staff can read all (moderation); everyone else keeps 0001's own-row policies.
drop policy if exists "profiles_select_staff" on public.profiles;
create policy "profiles_select_staff" on public.profiles for select using (public.is_staff());
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles for update
  using (public.is_admin()) with check (public.is_admin());

-- site_config, blocked_words, audit_log, rebuild_requests: admin only.
drop policy if exists "site_config_admin" on public.site_config;
create policy "site_config_admin" on public.site_config for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "blocked_words_staff" on public.blocked_words;
create policy "blocked_words_staff" on public.blocked_words for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "audit_log_admin_read" on public.audit_log;
create policy "audit_log_admin_read" on public.audit_log for select using (public.is_admin());
drop policy if exists "rebuild_requests_admin" on public.rebuild_requests;
create policy "rebuild_requests_admin" on public.rebuild_requests for select using (public.is_admin());

-- categories & curriculum tags: public read of active rows; staff write.
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories for select
  using (is_active or public.is_staff());
drop policy if exists "categories_staff_write" on public.categories;
create policy "categories_staff_write" on public.categories for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "curriculum_tags_public_read" on public.curriculum_tags;
create policy "curriculum_tags_public_read" on public.curriculum_tags for select using (true);
drop policy if exists "curriculum_tags_admin_write" on public.curriculum_tags;
create policy "curriculum_tags_admin_write" on public.curriculum_tags for all
  using (public.is_admin()) with check (public.is_admin());

-- questions, options, quiz_questions, versions, drafts: STAFF ONLY (they hold answers).
drop policy if exists "questions_staff" on public.questions;
create policy "questions_staff" on public.questions for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "question_options_staff" on public.question_options;
create policy "question_options_staff" on public.question_options for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "quiz_questions_staff" on public.quiz_questions;
create policy "quiz_questions_staff" on public.quiz_questions for all
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "quiz_versions_staff_read" on public.quiz_versions;
create policy "quiz_versions_staff_read" on public.quiz_versions for select using (public.is_staff());
drop policy if exists "ai_drafts_staff" on public.ai_question_drafts;
create policy "ai_drafts_staff" on public.ai_question_drafts for all
  using (public.is_staff()) with check (public.is_staff());

-- quizzes: anyone reads published (no answers here); staff manage.
-- Editors can edit; only admins can set status to scheduled/published (enforced in publish_quiz()).
drop policy if exists "quizzes_public_read" on public.quizzes;
create policy "quizzes_public_read" on public.quizzes for select
  using (status = 'published' or public.is_staff());
drop policy if exists "quizzes_staff_write" on public.quizzes;
create policy "quizzes_staff_write" on public.quizzes for all
  using (public.is_staff())
  with check (public.is_staff() and (status in ('draft', 'in_review', 'archived') or public.is_admin()));

-- daily challenges: public read of live/done; staff manage the calendar.
drop policy if exists "daily_public_read" on public.daily_challenges;
create policy "daily_public_read" on public.daily_challenges for select
  using (status in ('live', 'done') or public.is_staff());
drop policy if exists "daily_staff_write" on public.daily_challenges;
create policy "daily_staff_write" on public.daily_challenges for all
  using (public.is_staff()) with check (public.is_staff());

-- avatars: owner reads own; writes only via functions / service role.
drop policy if exists "avatars_select_own" on public.avatars;
create policy "avatars_select_own" on public.avatars for select
  using (auth.uid() = user_id or public.is_staff());
drop policy if exists "avatars_staff_update" on public.avatars;
create policy "avatars_staff_update" on public.avatars for update
  using (public.is_staff()) with check (public.is_staff());

-- attempts & answers: owner reads own; NO direct insert/update (game functions only).
drop policy if exists "attempts_select_own" on public.attempts;
create policy "attempts_select_own" on public.attempts for select
  using (auth.uid() = user_id or public.is_staff());
drop policy if exists "attempt_answers_select_own" on public.attempt_answers;
create policy "attempt_answers_select_own" on public.attempt_answers for select
  using (exists (select 1 from public.attempts a
                 where a.id = attempt_id and (a.user_id = auth.uid() or public.is_staff())));

-- friend challenges: creator reads own; others resolve a code via get_friend_challenge().
drop policy if exists "friend_challenges_select_own" on public.friend_challenges;
create policy "friend_challenges_select_own" on public.friend_challenges for select
  using (auth.uid() = creator_id or public.is_staff());

-- leaderboard entries: own rows + staff (public boards come from get_leaderboard()).
drop policy if exists "leaderboard_select_own" on public.leaderboard_entries;
create policy "leaderboard_select_own" on public.leaderboard_entries for select
  using (auth.uid() = user_id or public.is_staff());
drop policy if exists "leaderboard_staff_moderate" on public.leaderboard_entries;
create policy "leaderboard_staff_moderate" on public.leaderboard_entries for update
  using (public.is_staff()) with check (public.is_staff());

-- parental consents: the child sees their own status; admins see all. Parent email never public.
drop policy if exists "consents_select_own" on public.parental_consents;
create policy "consents_select_own" on public.parental_consents for select
  using (auth.uid() = child_id or public.is_admin());
