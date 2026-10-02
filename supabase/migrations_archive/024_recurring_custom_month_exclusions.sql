alter type recurring_frequency add value if not exists 'custom';

alter table recurring_transactions
add column if not exists excluded_months smallint[] not null default '{}';
