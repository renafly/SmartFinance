-- ============================================================
-- Create Transfer Function
-- ============================================================

create or replace function public.create_transfer(

    p_household_id uuid,

    p_from_account_id uuid,

    p_to_account_id uuid,

    p_amount numeric,

    p_title text,

    p_notes text,

    p_transaction_date timestamptz,

    p_created_by uuid

)
returns uuid

language plpgsql

security definer

set search_path = public

as $$

declare

    v_transfer_group_id uuid := gen_random_uuid();

begin

    if p_amount <= 0 then
        raise exception 'Transfer amount must be greater than zero';
    end if;

    if p_from_account_id = p_to_account_id then
        raise exception 'Source and destination accounts must be different';
    end if;

    -- Expense

    insert into public.transactions (

        household_id,

        account_id,

        category_id,

        transfer_group_id,

        title,

        notes,

        amount,

        type,

        transaction_date,

        created_by

    )

    values (

        p_household_id,

        p_from_account_id,

        null,

        v_transfer_group_id,

        p_title,

        p_notes,

        p_amount,

        'expense',

        p_transaction_date,

        p_created_by

    );

    -- Income

    insert into public.transactions (

        household_id,

        account_id,

        category_id,

        transfer_group_id,

        title,

        notes,

        amount,

        type,

        transaction_date,

        created_by

    )

    values (

        p_household_id,

        p_to_account_id,

        null,

        v_transfer_group_id,

        p_title,

        p_notes,

        p_amount,

        'income',

        p_transaction_date,

        p_created_by

    );

    return v_transfer_group_id;

end;

$$;