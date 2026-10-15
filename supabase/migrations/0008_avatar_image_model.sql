-- Change only the image model, preserving the configured safety/text model.
update public.site_config
set value = jsonb_set(value, '{image}', '"google/gemini-3.1-flash-image"'::jsonb),
    updated_at = timezone('utc', now())
where key = 'ai_models';
