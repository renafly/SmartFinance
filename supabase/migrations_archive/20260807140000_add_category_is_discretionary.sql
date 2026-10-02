-- Lets a category be flagged as "discretionary" (non-essential) spending.
-- Used by the Insights screen's Wage Flow chart to split ordinary expense
-- spending into "Expenses" vs. "Discretionary Spending" without inventing
-- a keyword/name-matching heuristic -- the household decides per category.
alter table public.categories
  add column if not exists is_discretionary boolean not null default false;

comment on column public.categories.is_discretionary is
  'Household-set flag marking this category as discretionary/non-essential spending (used by spending breakdowns like the Wage Flow chart). Meaningful for expense-type categories; ignored for income/account categories.';
