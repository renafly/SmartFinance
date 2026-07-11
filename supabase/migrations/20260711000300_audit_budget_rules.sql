do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'audit_budget_rules'
  ) then
    create trigger audit_budget_rules
    after insert or update or delete on public.budget_rules
    for each row execute function public.audit_trigger();
  end if;
end
$$;

