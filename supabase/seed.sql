-- =====================================================================
-- seed.sql — LOCAL DEVELOPMENT ONLY (`supabase start` / `supabase db reset`).
-- Never run against the real project. Creates a dev admin and two small,
-- original sample quizzes that cover every question type and a timer.
-- =====================================================================
do $$
declare
  admin_id uuid := '00000000-0000-4000-8000-0000000000ad';
  cat_animals uuid;
  cat_maths uuid;
  qz uuid;
  q uuid;
begin
  -- Dev admin (no password; only used to call publish_quiz below).
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at, is_anonymous)
  values (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'dev-admin@example.test', '{}', '{}', now(), now(), false)
  on conflict (id) do nothing;
  perform set_config('dyk.trusted', 'on', true);
  update public.profiles set role = 'admin' where id = admin_id;

  insert into public.categories (slug, name, description, kind, sort_order)
  values ('animals', 'Animals', 'Creatures great and small, from octopuses to koalas.', 'general', 10)
  returning id into cat_animals;
  insert into public.categories (slug, name, description, kind, sort_order)
  values ('maths', 'Maths', 'Quick-fire number practice for school.', 'school', 20)
  returning id into cat_maths;

  -- ---------- Quiz 1: Amazing Animals (untimed, ranked) ----------------
  insert into public.quizzes (slug, title, intro, category_id, difficulty, question_count, is_ranked)
  values ('amazing-animals', 'Amazing Animals',
          'Five quick questions about some of the strangest animals on Earth. ' ||
          'After each answer you will see a short explanation, so you learn something either way.',
          cat_animals, 'easy', 5, true)
  returning id into qz;

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_animals, 'choice', 'How many hearts does an octopus have?',
          'Three. Two pump blood through the gills and the third pumps it around the rest of the body.',
          'https://en.wikipedia.org/wiki/Octopus', '2027-10-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, 'One', false, 1), (q, 'Two', false, 2), (q, 'Three', true, 3), (q, 'Eight', false, 4);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 1);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_animals, 'boolean', 'A group of flamingos can be called a flamboyance.',
          'True. "Flamboyance" is a well-known name for a flock of flamingos.',
          'https://en.wikipedia.org/wiki/Flamingo', '2027-10-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, 'True', true, 1), (q, 'False', false, 2);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 2);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by,
                                slider_min, slider_max, slider_step, slider_unit,
                                correct_value, accept_min, accept_max)
  values (cat_animals, 'slider', 'About how many hours a day does a koala sleep?',
          'Around 20 hours. Eucalyptus leaves give very little energy, so koalas rest most of the day.',
          'https://en.wikipedia.org/wiki/Koala', '2027-10-01',
          0, 24, 1, 'hours', 20, 18, 22)
  returning id into q;
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 3);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_animals, 'choice', 'Which is the biggest animal that has ever lived?',
          'The blue whale. It is heavier than any dinosaur we know about.',
          'https://en.wikipedia.org/wiki/Blue_whale', '2027-10-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, 'African elephant', false, 1), (q, 'Blue whale', true, 2),
    (q, 'Megalodon', false, 3), (q, 'Tyrannosaurus rex', false, 4);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 4);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_animals, 'boolean', 'Spiders are a kind of insect.',
          'False. Spiders have eight legs and belong to the arachnids. Insects have six legs.',
          'https://en.wikipedia.org/wiki/Spider', '2027-10-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, 'True', false, 1), (q, 'False', true, 2);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 5);

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  perform public.publish_quiz(qz);

  -- ---------- Quiz 2: Times Tables Sprint (15 s timer, KS2) ------------
  insert into public.quizzes (slug, title, intro, category_id, difficulty, age_min, age_max,
                              curriculum_tags, question_count, time_limit_seconds, is_ranked)
  values ('times-tables-sprint', 'Times Tables Sprint',
          'Three times-table questions against the clock. You get 15 seconds for each one.',
          cat_maths, 'medium', 7, 11, '{uk-ks2}', 3, 15, true)
  returning id into qz;

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_maths, 'choice', 'What is 7 × 8?',
          '7 × 8 = 56. A handy trick: 5, 6, 7, 8 → 56 = 7 × 8.',
          'https://en.wikipedia.org/wiki/Multiplication_table', '2030-01-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, '54', false, 1), (q, '56', true, 2), (q, '58', false, 3), (q, '64', false, 4);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 1);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by,
                                slider_min, slider_max, slider_step, correct_value, accept_min, accept_max)
  values (cat_maths, 'slider', 'Slide to the answer: what is 9 × 6?',
          '9 × 6 = 54. Nine times anything: the digits of the answer add up to 9 (5 + 4).',
          'https://en.wikipedia.org/wiki/Multiplication_table', '2030-01-01',
          0, 100, 1, 54, 54, 54)
  returning id into q;
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 2);

  insert into public.questions (category_id, type, prompt, explanation, source_url, review_by)
  values (cat_maths, 'boolean', '12 × 12 = 144',
          'True. 12 × 12 = 144, which is also called a gross.',
          'https://en.wikipedia.org/wiki/Multiplication_table', '2030-01-01')
  returning id into q;
  insert into public.question_options (question_id, label, is_correct, sort_order) values
    (q, 'True', true, 1), (q, 'False', false, 2);
  insert into public.quiz_questions (quiz_id, question_id, position) values (qz, q, 3);

  perform public.publish_quiz(qz);
  perform set_config('request.jwt.claim.sub', '', true);

  -- ---------- Daily challenges: the next 14 London days, alternating ----
  insert into public.daily_challenges (challenge_date, quiz_id, created_by)
  select public._london_today() + d,
         (select id from public.quizzes
           where slug = case when d % 2 = 0 then 'amazing-animals' else 'times-tables-sprint' end),
         admin_id
    from generate_series(0, 13) d;
  perform public.activate_daily_challenge();
end;
$$;
