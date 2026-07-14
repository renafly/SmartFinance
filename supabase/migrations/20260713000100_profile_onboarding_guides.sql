-- ============================================================
-- Versioned per-profile onboarding guide completion
-- ============================================================

alter table public.profiles
add column if not exists onboarding_guides jsonb not null default '{}'::jsonb;

alter table public.profiles
drop constraint if exists profiles_onboarding_guides_is_object;

alter table public.profiles
add constraint profiles_onboarding_guides_is_object
check (jsonb_typeof(onboarding_guides) = 'object');

comment on column public.profiles.onboarding_guides is
  'Map of onboarding guide keys to the latest completed guide version for the profile.';

-- Merge one guide completion at a time on the database so simultaneous clients
-- cannot overwrite completions for unrelated guides.
create or replace function public.complete_onboarding_guide(
  p_guide_key text,
  p_version integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_onboarding_guides jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to complete an onboarding guide.';
  end if;

  if p_guide_key !~ '^[a-z0-9][a-z0-9_-]{0,63}$' then
    raise exception 'Guide key must contain lowercase letters, numbers, hyphens, or underscores.';
  end if;

  if p_version < 1 then
    raise exception 'Guide version must be a positive integer.';
  end if;

  update public.profiles
  set onboarding_guides = jsonb_set(
    onboarding_guides,
    array[p_guide_key],
    to_jsonb(
      greatest(
        case
          when jsonb_typeof(onboarding_guides -> p_guide_key) = 'number'
            and onboarding_guides ->> p_guide_key ~ '^[0-9]+$'
            then (onboarding_guides ->> p_guide_key)::integer
          else 0
        end,
        p_version
      )
    ),
    true
  )
  where id = auth.uid()
  returning onboarding_guides into v_onboarding_guides;

  if not found then
    raise exception 'Profile not found for the authenticated user.';
  end if;

  return v_onboarding_guides;
end;
$$;

revoke all on function public.complete_onboarding_guide(text, integer) from public;
grant execute on function public.complete_onboarding_guide(text, integer) to authenticated;
