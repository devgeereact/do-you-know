-- =====================================================================
-- 0007_avatar_needs_age_band.sql — Do You Know: no avatar before an age band.
--
-- request_avatar() only blocked the adult look when age_band = 'under_13', so a
-- child who had not chosen an age band yet could pick the adult look (and facial
-- hair). It now refuses with 'age_band_required' until the band is set. Body is
-- otherwise identical to 0003; grants are kept by CREATE OR REPLACE.
-- =====================================================================

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
  -- Without an age band we cannot tell a child from an adult, so ask first.
  if band is null then raise exception 'age_band_required'; end if;

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
