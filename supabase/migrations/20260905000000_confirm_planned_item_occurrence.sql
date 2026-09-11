-- ============================================================
-- confirm_planned_item_occurrence: pay ONE recurring/planned expense now
-- ============================================================
-- User request: "for each recurring expense, mark it as paid, optionally
-- with a different actual amount, without waiting for (or requiring) the
-- whole month's Run Monthly Budget, and without changing the recurring
-- definition or any future month."
--
-- Before this, an outflow occurrence had exactly two ways to end up with
-- a real transaction: (1) confirm_planned_item_month -- posts EVERY
-- 'planned', non-estimate occurrence for the whole household month in
-- one admin-gated call, always at each occurrence's own expected_amount,
-- or (2) match_planned_item_occurrence -- links an estimate occurrence to
-- a transaction that must already exist (created separately, e.g. via
-- the normal Add Transaction flow or a bank import). Neither lets someone
-- pay ONE item right now with a possibly-different actual amount.
--
-- Scope, deliberately narrow ("keep it simple"): only single-leg, plain
-- expense occurrences -- source_account_id set (outflow) and zero
-- planned_item_occurrence_destinations rows, i.e. exactly the
-- Rent/Electricity/Internet/Insurance shape buildFreshLegs
-- (planned-items-resolver.ts) already generates for an item with no
-- destination accounts. A multi-destination outflow item (a split
-- transfer/allocation across several accounts) is NOT handled here --
-- proportionally rescaling several legs from one "actual amount" is a
-- different, more involved feature; those still go through Run Monthly
-- Budget (at their planned split) or manual per-leg transactions. The
-- TS layer only offers this action's UI when the occurrence qualifies.
--
-- Reuses, rather than reinvents: same transaction shape
-- confirm_planned_item_month's plain_expense branch inserts (same
-- column list, same clock_timestamp() stamping, same notes/title
-- convention, same idempotency index --
-- idx_transactions_one_plain_expense_per_occurrence, already relied on
-- there). Sets occurrence status to 'confirmed' (not 'matched' -- this
-- creates the transaction directly, it doesn't link an existing one),
-- the exact status confirm_planned_item_month itself sets, so
-- everything already reading that status (category-budget-view-model.ts's
-- "still unpaid" vs "paid" split, revert_planned_item_occurrence's
-- delete-the-generated-transaction-and-reopen flow) keeps working
-- unchanged -- revert_planned_item_occurrence already deletes by
-- `planned_item_occurrence_id` with no role/source filter, so it reverts
-- an occurrence paid this way exactly like one paid via the month-wide
-- confirm, no changes needed there.
--
-- p_actual_amount is nullable: omitting it (or passing the same value)
-- marks the occurrence paid at its already-expected amount -- "just mark
-- it paid", no amount change. planned_items.amount (the recurring
-- definition's own default) and every other month's occurrence are
-- untouched either way, per planned_item_occurrences' existing
-- per-month-row design (this only ever writes to the ONE occurrence row
-- + a new transaction row).

create or replace function public.confirm_planned_item_occurrence(
    p_occurrence_id uuid,
    p_confirmed_by uuid,
    p_actual_amount numeric default null
)
returns public.planned_item_occurrences
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_occurrence public.planned_item_occurrences%rowtype;
    v_item_name text;
    v_title text;
    v_notes text;
    v_amount numeric;
    v_destination_count integer;
begin
    select * into v_occurrence
      from public.planned_item_occurrences
     where id = p_occurrence_id
     for update;

    if not found then
        raise exception 'Planned item occurrence % not found', p_occurrence_id;
    end if;

    if not public.is_household_admin(v_occurrence.household_id, auth.uid()) then
        raise exception 'Only household admins can mark a planned item occurrence as paid';
    end if;

    if v_occurrence.status <> 'planned' then
        raise exception 'Occurrence % is already %, not planned', p_occurrence_id, v_occurrence.status;
    end if;

    if v_occurrence.source_account_id is null then
        raise exception 'Occurrence % is an income item -- use confirm_planned_item_month or match_planned_item_occurrence instead', p_occurrence_id;
    end if;

    select count(*) into v_destination_count
      from public.planned_item_occurrence_destinations
     where occurrence_id = p_occurrence_id;

    if v_destination_count > 0 then
        raise exception 'Occurrence % has % destination account(s) -- pay a split/transfer item via Run Monthly Budget instead', p_occurrence_id, v_destination_count;
    end if;

    v_amount := coalesce(p_actual_amount, v_occurrence.expected_amount);
    if v_amount <= 0 then
        raise exception 'Actual amount must be greater than zero';
    end if;

    -- Same idempotency guard confirm_planned_item_month uses for its own
    -- plain_expense branch (also enforced by
    -- idx_transactions_one_plain_expense_per_occurrence as a backstop).
    if exists (
        select 1 from public.transactions
         where planned_item_occurrence_id = p_occurrence_id
           and planned_item_occurrence_destination_id is null
           and planned_item_transaction_role = 'plain_expense'
    ) then
        raise exception 'Occurrence % already has a transaction', p_occurrence_id;
    end if;

    select pi.name into v_item_name
      from public.planned_items pi
     where pi.id = v_occurrence.planned_item_id;

    v_title := coalesce(v_item_name, 'Planned item');
    v_notes := 'Monthly budget ' || to_char(v_occurrence.month, 'YYYY-MM') || ' · ' || v_title;

    insert into public.transactions (
        household_id, account_id, category_id, transfer_group_id,
        title, notes, amount, type, transaction_date, created_by, created_at,
        planned_item_occurrence_id, planned_item_occurrence_destination_id,
        planned_item_transaction_role
    ) values (
        v_occurrence.household_id, v_occurrence.source_account_id, v_occurrence.category_id, null,
        v_title, v_notes, v_amount, 'expense', v_occurrence.month::timestamptz, p_confirmed_by, clock_timestamp(),
        p_occurrence_id, null, 'plain_expense'
    );

    update public.planned_item_occurrences
       set status = 'confirmed',
           confirmed_at = now(),
           confirmed_by = p_confirmed_by
     where id = p_occurrence_id
     returning * into v_occurrence;

    return v_occurrence;
end;
$$;

revoke all on function public.confirm_planned_item_occurrence(uuid, uuid, numeric) from public;
grant execute on function public.confirm_planned_item_occurrence(uuid, uuid, numeric) to authenticated;
