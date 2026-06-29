alter table public.profiles enable row level security;

create policy "Profiles can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Profiles can update their own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Profiles can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);


alter table public.households enable row level security;

create policy "Members can view household"
on public.households
for select
using (
    public.is_household_member(id, auth.uid())
);

create policy "Owners can update household"
on public.households
for update
using (
    public.is_household_owner(id, auth.uid())
);

alter table public.household_members enable row level security;

create policy "Members can view household members"
on public.household_members
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage household members"
on public.household_members
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

alter table public.household_invitations enable row level security;

create policy "Members can view invitations"
on public.household_invitations
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Admins can manage invitations"
on public.household_invitations
for all
using (
    public.is_household_admin(household_id, auth.uid())
)
with check (
    public.is_household_admin(household_id, auth.uid())
);

alter table public.accounts enable row level security;

create policy "Members can view accounts"
on public.accounts
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage accounts"
on public.accounts
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

alter table public.categories enable row level security;

create policy "Members can view categories"
on public.categories
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage categories"
on public.categories
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

alter table public.transactions enable row level security;

create policy "Members can view transactions"
on public.transactions
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage transactions"
on public.transactions
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

alter table public.budgets enable row level security;

create policy "Members can view budgets"
on public.budgets
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage budgets"
on public.budgets
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);


alter table public.recurring_transactions enable row level security;

create policy "Members can view recurring transactions"
on public.recurring_transactions
for select
using (
    public.is_household_member(household_id, auth.uid())
);

create policy "Members can manage recurring transactions"
on public.recurring_transactions
for all
using (
    public.is_household_member(household_id, auth.uid())
)
with check (
    public.is_household_member(household_id, auth.uid())
);

alter table public.attachments enable row level security;

create policy "Members can view attachments"
on public.attachments
for select
using (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
);

create policy "Members can manage attachments"
on public.attachments
for all
using (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.transactions t
        where t.id = transaction_id
        and public.is_household_member(t.household_id, auth.uid())
    )
);