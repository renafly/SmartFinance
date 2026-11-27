-- ============================================================
-- Notes (Notes screen): a personal notepad inside Kintally.
-- ============================================================
-- Ownership model: a note is PRIVATE to the member who wrote it. It is
-- also scoped to the household it was written in (household_id), the same
-- way every other row in this schema is, so:
--   * other members of the same household never see it -- membership alone
--     grants nothing here (unlike transactions/tags/budgets, which any
--     member can read and manage);
--   * the author only sees it while they are an accepted member of that
--     household (is_household_member), so leaving or being removed from a
--     household also removes access to the notes written there, and
--     deleting the household deletes them (on delete cascade);
--   * deleting the author's profile deletes their notes.
-- Sharing notes with the household is deliberately out of scope; it can be
-- added later with an explicit visibility column and its own policy.
--
-- Concurrency: `version` starts at 1 and is bumped by the update trigger on
-- every write. The app saves with `... where id = :id and version = :seen`,
-- so a save based on a stale copy (e.g. the same note edited on another
-- device) updates nothing instead of silently overwriting newer text, and
-- the app can ask the user what to keep. Clients cannot set `version`,
-- `created_at` or `updated_at` themselves; the triggers own them.

create table public.notes (
    id uuid primary key default gen_random_uuid(),
    household_id uuid not null references public.households(id) on delete cascade,
    owner_profile_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
    title text not null default '',
    content text not null default '',
    version integer not null default 1,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint notes_title_length check (char_length(title) <= 200),
    constraint notes_content_length check (char_length(content) <= 100000)
);

comment on table public.notes is
  'Personal notes (Notes screen). Private to owner_profile_id within household_id -- other household members cannot read or change them (see the RLS policies). version is bumped on every update for optimistic concurrency: the app updates with "where version = <seen>" so a stale save never overwrites newer text.';
comment on column public.notes.version is
  'Starts at 1, incremented by notes_before_write on every update. Used as the optimistic-concurrency token for autosave.';

-- The Notes list: one author's notes in one household, most recently
-- updated first.
create index idx_notes_owner_household_updated
  on public.notes (owner_profile_id, household_id, updated_at desc);
-- FK lookup for the household delete cascade.
create index idx_notes_household on public.notes (household_id);

create or replace function public.notes_before_write()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
    if tg_op = 'INSERT' then
        new.version := 1;
        new.created_at := now();
        new.updated_at := now();
        return new;
    end if;

    if new.household_id is distinct from old.household_id
       or new.owner_profile_id is distinct from old.owner_profile_id then
        raise exception 'A note cannot be moved to another household or owner.'
            using errcode = '42501';
    end if;

    new.id := old.id;
    new.created_at := old.created_at;
    new.version := old.version + 1;
    new.updated_at := now();
    return new;
end;
$$;

create trigger notes_before_write
before insert or update on public.notes
for each row execute function public.notes_before_write();

-- ------------------------------------------------------------
-- RLS -- author only, and only while still a member of the household.
-- ------------------------------------------------------------
alter table public.notes enable row level security;

create policy "Authors can view their own notes"
on public.notes
for select
to authenticated
using (
    owner_profile_id = (select auth.uid())
    and public.is_household_member(household_id, (select auth.uid()))
);

create policy "Authors can create their own notes"
on public.notes
for insert
to authenticated
with check (
    owner_profile_id = (select auth.uid())
    and public.is_household_member(household_id, (select auth.uid()))
);

create policy "Authors can update their own notes"
on public.notes
for update
to authenticated
using (
    owner_profile_id = (select auth.uid())
    and public.is_household_member(household_id, (select auth.uid()))
)
with check (
    owner_profile_id = (select auth.uid())
    and public.is_household_member(household_id, (select auth.uid()))
);

create policy "Authors can delete their own notes"
on public.notes
for delete
to authenticated
using (
    owner_profile_id = (select auth.uid())
    and public.is_household_member(household_id, (select auth.uid()))
);

revoke all on table public.notes from anon;
grant select, insert, update, delete on table public.notes to authenticated;
