-- ============================================================
-- Atomic, retry-safe confirmation of a replenishment run
-- ============================================================
-- Modeled directly on confirm_monthly_budget_run
-- (20260803073904_confirm_monthly_budget_run_atomically.sql): locks the
-- parent run row, is a no-op on a retry after a successful commit, rejects
-- a preview that doesn't match what's being confirmed, recovers from a
-- partially-completed previous attempt by deleting-then-reinserting any
-- rows already tagged with this run's id, and relies on Postgres functions
-- being transactional by default so any exception anywhere in the loop
-- rolls back every insert already made in this call.

create or replace function public.confirm_replenishment_run(
    p_run_id uuid,
    p_transfers jsonb,
    p_preview jsonb
)
returns public.replenishment_runs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_run public.replenishment_runs%rowtype;
    v_transfer jsonb;
    v_transfer_group_id uuid;
    v_source_account_id uuid;
    v_destination_account_id uuid;
    v_category_id uuid;
    v_category_type public.category_type;
    v_amount numeric;
    v_title text;
    v_notes text;
    v_covered_total numeric;
    v_conflicting_transaction_id uuid;
begin
    select *
      into v_run
      from public.replenishment_runs
     where id = p_run_id
     for update;

    if not found then
        raise exception 'Replenishment run not found';
    end if;

    if not public.is_household_member(v_run.household_id, auth.uid()) then
        raise exception 'Not authorized to confirm this replenishment';
    end if;

    -- A retry after a successful commit is a no-op. The row lock also
    -- prevents two concurrent confirmations from generating duplicate
    -- transfers.
    if v_run.status = 'confirmed' then
        return v_run;
    end if;

    if v_run.status <> 'draft' then
        raise exception 'Only draft replenishment runs can be confirmed';
    end if;

    if p_transfers is null or jsonb_typeof(p_transfers) <> 'array' then
        raise exception 'Replenishment transfers must be a JSON array';
    end if;
    if jsonb_array_length(p_transfers) = 0 then
        raise exception 'Replenishment must include at least one transfer';
    end if;
    if p_preview is null or jsonb_typeof(p_preview) <> 'object' then
        raise exception 'Replenishment preview must be a JSON object';
    end if;
    -- Reject a stale/tampered preview -- what the user saw must be exactly
    -- what gets confirmed.
    if coalesce(p_preview -> 'transfers', '[]'::jsonb) <> p_transfers then
        raise exception 'Replenishment transfers do not match the saved preview';
    end if;

    if not exists (
        select 1 from public.replenishment_run_transactions where run_id = v_run.id
    ) then
        raise exception 'Replenishment run has no covered transactions';
    end if;

    -- The covered transactions' snapshotted total must still match the
    -- run's declared total -- refuses to confirm against a preview that has
    -- gone stale relative to what was actually selected.
    select coalesce(sum(amount), 0)
      into v_covered_total
      from public.replenishment_run_transactions
     where run_id = v_run.id;

    if v_covered_total <> v_run.total_amount then
        raise exception 'Replenishment total no longer matches the selected transactions';
    end if;

    -- Double-repayment guard: none of this run's covered transactions may
    -- also be covered by a different, already-confirmed run. Only checked
    -- against confirmed runs -- two abandoned drafts touching the same
    -- transaction is allowed, since only one of them can ever successfully
    -- confirm.
    select rrt.transaction_id
      into v_conflicting_transaction_id
      from public.replenishment_run_transactions rrt
      join public.replenishment_runs other on other.id = rrt.run_id
     where rrt.transaction_id in (
             select transaction_id
               from public.replenishment_run_transactions
              where run_id = v_run.id
           )
       and other.id <> v_run.id
       and other.status = 'confirmed'
     limit 1;

    if v_conflicting_transaction_id is not null then
        raise exception using
            errcode = '23505',
            message = 'One or more selected transactions have already been replenished by another confirmed run.',
            detail = format('Transaction %s is already covered.', v_conflicting_transaction_id);
    end if;

    -- Recover safely from a previous confirmation attempt that inserted
    -- transfers but failed before flipping status (network drop, etc.)
    -- while the run remained draft.
    delete from public.transactions where replenishment_run_id = v_run.id;

    for v_transfer in select value from jsonb_array_elements(p_transfers)
    loop
        v_source_account_id := nullif(v_transfer ->> 'sourceAccountId', '')::uuid;
        v_destination_account_id := nullif(v_transfer ->> 'destinationAccountId', '')::uuid;
        v_category_id := nullif(v_transfer ->> 'categoryId', '')::uuid;
        v_amount := (v_transfer ->> 'amount')::numeric;
        v_title := coalesce(nullif(btrim(v_transfer ->> 'title'), ''), 'Reposição');
        v_notes := nullif(btrim(coalesce(v_transfer ->> 'notes', '')), '');

        if v_amount is null or v_amount <= 0 then
            raise exception 'Replenishment transfer amount must be greater than zero';
        end if;
        if v_source_account_id is null or v_destination_account_id is null
           or v_source_account_id = v_destination_account_id then
            raise exception 'Replenishment transfer must use two different accounts';
        end if;
        if not exists (
            select 1 from public.accounts
             where id = v_source_account_id and household_id = v_run.household_id
        ) or not exists (
            select 1 from public.accounts
             where id = v_destination_account_id and household_id = v_run.household_id
        ) then
            raise exception 'Replenishment transfer account does not belong to this household';
        end if;

        if v_category_id is not null then
            select c.type
              into v_category_type
              from public.categories c
             where c.id = v_category_id
               and c.household_id = v_run.household_id;

            if v_category_type is null then
                raise exception 'Replenishment transfer category is invalid for this household';
            end if;
            if v_category_type <> 'account' then
                raise exception 'Replenishment transfer category must be of type account';
            end if;
        end if;

        v_transfer_group_id := gen_random_uuid();

        -- Expense leg (money leaving the source account/pot).
        insert into public.transactions (
            household_id, account_id, category_id, transfer_group_id,
            replenishment_run_id, title, notes, amount, type,
            transaction_date, created_by
        ) values (
            v_run.household_id, v_source_account_id, v_category_id, v_transfer_group_id,
            v_run.id, v_title, v_notes, v_amount, 'expense',
            now(), auth.uid()
        );

        -- Income leg (money arriving in the account being replenished).
        insert into public.transactions (
            household_id, account_id, category_id, transfer_group_id,
            replenishment_run_id, title, notes, amount, type,
            transaction_date, created_by
        ) values (
            v_run.household_id, v_destination_account_id, v_category_id, v_transfer_group_id,
            v_run.id, v_title, v_notes, v_amount, 'income',
            now(), auth.uid()
        );
    end loop;

    update public.replenishment_runs
       set status = 'confirmed',
           preview_snapshot = p_preview,
           confirmed_at = now()
     where id = v_run.id
     returning * into v_run;

    return v_run;
end;
$$;

comment on function public.confirm_replenishment_run(uuid, jsonb, jsonb) is
'Atomically confirms a draft replenishment run: validates the submitted transfer list against the stored preview, guards against double-replenishing a transaction already covered by another confirmed run, creates the paired transfer transactions tagged with replenishment_run_id, and flips the run to confirmed. Idempotent -- retrying after a successful commit returns the already-confirmed run unchanged. Recovers from a partially-completed previous attempt by clearing any rows already tagged with this run before regenerating them.';

revoke all on function public.confirm_replenishment_run(uuid, jsonb, jsonb) from public;
grant execute on function public.confirm_replenishment_run(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
