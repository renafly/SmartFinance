import { PlannedItemsSection, type PlannedItemsSectionProps } from '@/features/planned-items/components/planned-items-section';

/**
 * Thin wrapper around the unified PlannedItemsSection (Phase 5+7 cutover
 * -- see budget.tsx's own doc comment on the rebuild). Income sources now
 * live in `planned_items` with direction = 'inflow' exactly like every
 * other planned item; this file exists only so the Income Sources card on
 * the Monthly Budget screen keeps its own distinct section/heading per the
 * approved design decision (merge on the backend, keep a separate UI
 * section), and so nothing else importing `IncomeSourcesSection` by name
 * has to change. There is deliberately only one card implementation
 * (`planned-item-card.tsx`) behind both this and the outflow "Planned
 * expenses" section -- `income-source-card.tsx` and the old
 * `useIncomeSources`/`useCreateIncomeSource`/etc. hooks are no longer
 * imported anywhere on this path (kept on disk for a later cleanup phase,
 * per the rebuild brief).
 */
export type IncomeSourcesSectionProps = Omit<PlannedItemsSectionProps, 'direction'>;

export function IncomeSourcesSection(props: IncomeSourcesSectionProps) {
  return <PlannedItemsSection direction="inflow" {...props} />;
}
