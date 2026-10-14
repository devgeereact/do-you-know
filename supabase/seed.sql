-- Original development fixtures, never launch content. Loaded only by the local
-- CLI (config.toml), never use db push --include-seed against a hosted project.
-- Facts checked against NASA's Solar System Facts on 14 October 2026.
begin;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data)
values ('10000000-0000-4000-8000-000000000001', 'local-fixture@example.invalid', false, '{}')
on conflict (id) do nothing;
update public.profiles set role = 'admin'
where id = '10000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

insert into public.categories (id, slug, name, description, icon, scene)
values ('20000000-0000-4000-8000-000000000001', 'space', 'Space explorers',
        'A small adventure around our solar system.', '🚀', 'space')
on conflict (id) do nothing;

insert into public.questions (id, category_id, type, prompt, explanation, source_url, review_by, status)
values
('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'choice',
 'Which planet is nearest to the Sun?', 'Mercury is first in the order of planets from the Sun.',
 'https://science.nasa.gov/solar-system/solar-system-facts/', '2027-04-14', 'approved'),
('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'boolean',
 'True or false: the Sun is a star.', 'The Sun is the star at the centre of our solar system.',
 'https://science.nasa.gov/solar-system/solar-system-facts/', '2027-04-14', 'approved')
on conflict (id) do nothing;

insert into public.questions (id, category_id, type, prompt, explanation, source_url, review_by, status,
 slider_min, slider_max, slider_step, slider_unit, correct_value, accept_min, accept_max)
values ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'slider',
 'How many planets are in our solar system?', 'There are eight planets. Pluto is classed as a dwarf planet.',
 'https://science.nasa.gov/solar-system/solar-system-facts/', '2027-04-14', 'approved',
 1, 12, 1, 'planets', 8, 8, 8)
on conflict (id) do nothing;

insert into public.question_options (id, question_id, label, is_correct, sort_order)
values
('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'Mercury', true, 0),
('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'Earth', false, 1),
('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Mars', false, 2),
('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'True', true, 0),
('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'False', false, 1)
on conflict (id) do nothing;

insert into public.quizzes (id, slug, title, intro, category_id, question_count, difficulty, age_min, curriculum_tags)
values ('50000000-0000-4000-8000-000000000001', 'solar-system-starter', 'Solar system starter',
 'Take a short trip through our solar system. Try three questions, then learn something new from each explanation. This is a development quiz for testing the app.',
 '20000000-0000-4000-8000-000000000001', 3, 'easy', 6, array['uk-ks2'])
on conflict (id) do nothing;

insert into public.quiz_questions (quiz_id, question_id, position)
select '50000000-0000-4000-8000-000000000001', id, row_number() over (order by id)
from public.questions where id in
('30000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003')
on conflict (quiz_id, question_id) do nothing;

select public.publish_quiz('50000000-0000-4000-8000-000000000001')
where not exists (select 1 from public.quizzes where id = '50000000-0000-4000-8000-000000000001' and status = 'published');
commit;
