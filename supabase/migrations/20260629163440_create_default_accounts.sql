-- ============================================================
-- Create Default Accounts Function
-- ============================================================

create or replace function public.create_default_accounts(
    p_household_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.accounts (
        household_id,
        name,
        type,
        currency,
        initial_balance,
        icon,
        color
    )
    values
        (
            p_household_id,
            'Cash',
            'cash',
            'EUR',
            0,
            'wallet',
            '#4CAF50'
        ),
        (
            p_household_id,
            'Bank Account',
            'bank',
            'EUR',
            0,
            'landmark',
            '#2196F3'
        );

end;
$$;