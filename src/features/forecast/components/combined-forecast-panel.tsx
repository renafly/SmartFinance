import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectionTrigger, MultiSelectShell } from '@/components/selection-shell';
import { Pill } from '@/components/migrated-page';
import { useTheme } from '@/theme/ThemeProvider';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/radius';
import { spacing } from '@/theme/spacing';

import { combineBalanceForecasts, type BalanceForecast } from '../services/balance-forecast.service';
import {
  DEFAULT_FORECAST_PERIOD_MONTHS,
  POT_BREAKDOWN_TYPE_KEY,
  SHARED_BREAKDOWN_OWNER_KEY,
  buildForecastNormalizedData,
  type ForecastPeriodMonths,
} from '../ui-utils';
import { ForecastBreakdownPreview } from './forecast-breakdown-preview';
import { ForecastGraphView } from './forecast-graph-view';

type CombinedForecastViewMode = 'list' | 'graph';

export type CombinedForecastEntity = {
  id: string;
  kind: 'account' | 'pot';
  name: string;
  /** Account type (bank/cash/savings/credit_card/investment/ppr), or null for pots. */
  type: string | null;
  /** Owner profile id, or null for a shared account / a pot (pots have no single owner). */
  ownerProfileId: string | null;
  forecast: BalanceForecast;
};

type EntityGroup = { key: string; title: string; entities: CombinedForecastEntity[] };

type CombinedForecastPanelProps = {
  entities: CombinedForecastEntity[];
  members: { id: string; label: string }[];
  getAccountTypeLabel: (type: string) => string;
  sharedLabel: string;
};

export function CombinedForecastPanel({ entities, members, getAccountTypeLabel, sharedLabel }: CombinedForecastPanelProps) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Nothing selected by default — the user picks in.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<Set<string>>(new Set());
  // Shared by both presentations below — switching List/Graph never resets
  // the selected accounts or the chosen forecast period.
  const [periodMonths, setPeriodMonths] = useState<ForecastPeriodMonths>(DEFAULT_FORECAST_PERIOD_MONTHS);
  const [viewMode, setViewMode] = useState<CombinedForecastViewMode>('list');

  const groups = useMemo<EntityGroup[]>(() => {
    const ownerGroups = new Map<string, EntityGroup>();
    const potGroup: EntityGroup = { key: POT_BREAKDOWN_TYPE_KEY, title: t('forecast.filterPots'), entities: [] };

    for (const entity of entities) {
      if (entity.kind === 'pot') {
        potGroup.entities.push(entity);
        continue;
      }

      const key = entity.ownerProfileId ?? SHARED_BREAKDOWN_OWNER_KEY;
      const existing = ownerGroups.get(key);
      if (existing) {
        existing.entities.push(entity);
      } else {
        const title = entity.ownerProfileId ? (members.find((member) => member.id === entity.ownerProfileId)?.label ?? entity.ownerProfileId) : sharedLabel;
        ownerGroups.set(key, { key, title, entities: [entity] });
      }
    }

    const ownerOrder = [...members.map((member) => member.id), SHARED_BREAKDOWN_OWNER_KEY];
    const orderedOwnerGroups = ownerOrder.flatMap((key) => {
      const group = ownerGroups.get(key);
      return group ? [group] : [];
    });
    const unorderedOwnerGroups = [...ownerGroups.values()].filter((group) => !ownerOrder.includes(group.key));

    // Pots have no owner, so they get their own section below every
    // member's — same placement as the shared-accounts section.
    return [...orderedOwnerGroups, ...unorderedOwnerGroups, ...(potGroup.entities.length > 0 ? [potGroup] : [])];
  }, [entities, members, sharedLabel, t]);

  const selectedEntities = entities.filter((entity) => selectedIds.has(entity.id));
  const combined = useMemo(() => combineBalanceForecasts(selectedEntities.map((entity) => entity.forecast)), [selectedEntities]);

  const ownerKeyOf = (entity: CombinedForecastEntity) =>
    entity.kind === 'pot' ? SHARED_BREAKDOWN_OWNER_KEY : (entity.ownerProfileId ?? SHARED_BREAKDOWN_OWNER_KEY);
  const ownerLabelOf = (entity: CombinedForecastEntity) =>
    entity.kind === 'pot'
      ? sharedLabel
      : entity.ownerProfileId
        ? (members.find((member) => member.id === entity.ownerProfileId)?.label ?? entity.ownerProfileId)
        : sharedLabel;

  const ownerOrder = useMemo(() => [...members.map((member) => member.id), SHARED_BREAKDOWN_OWNER_KEY], [members]);

  // The single normalized computation both presentations below read from —
  // List/Table renders its Month → Type → Account breakdown from `types`,
  // the Graph view picks whichever of accounts/types/owners/combined
  // matches its current aggregation level. Neither view recomputes
  // balances or movements itself, so the two can never disagree.
  const normalized = useMemo(
    () =>
      buildForecastNormalizedData(
        selectedEntities.map((entity) => ({
          id: entity.id,
          name: entity.name,
          ownerKey: ownerKeyOf(entity),
          ownerLabel: ownerLabelOf(entity),
          typeKey: entity.kind === 'pot' ? POT_BREAKDOWN_TYPE_KEY : (entity.type ?? 'other'),
          typeLabel: entity.kind === 'pot' ? t('forecast.filterPots') : getAccountTypeLabel(entity.type ?? 'other'),
          currentBalance: entity.forecast.currentBalance,
          timeline: entity.forecast.timeline,
        })),
        combined,
        ownerOrder,
      ),
    [selectedEntities, combined, ownerOrder, getAccountTypeLabel, t],
  );

  function openPicker() {
    setDraftIds(new Set(selectedIds));
    setPickerOpen(true);
  }

  function toggleDraft(id: string) {
    setDraftIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleBulk(ids: string[]) {
    setDraftIds((current) => {
      const allSelected = ids.every((id) => current.has(id));
      const next = new Set(current);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function confirmPicker() {
    setSelectedIds(new Set(draftIds));
    setPickerOpen(false);
  }

  function selectAllGlobally() {
    setDraftIds(new Set(entities.map((entity) => entity.id)));
  }

  function clearSelectionGlobally() {
    setDraftIds(new Set());
  }

  // One tap from the collapsed row for the two most common actions — no
  // need to open the picker modal just to select or clear everything.
  function selectAllDirect() {
    setSelectedIds(new Set(entities.map((entity) => entity.id)));
  }

  function clearSelectionDirect() {
    setSelectedIds(new Set());
  }

  return (
    <View style={{ gap: spacing(3) }}>
      <SelectionTrigger
        label={t('forecast.selectAccountsPots')}
        valueLabel={t('forecast.includedCount', { count: selectedIds.size, total: entities.length })}
        hint={t('forecast.selectAccountsPotsHint')}
        placeholder={t('forecast.selectAccountsPots')}
        iconName="wallet-outline"
        onPress={openPicker}
      />

      {entities.length > 0 ? (
        <View style={styles.quickActionsRow}>
          {selectedIds.size < entities.length ? <Pill label={t('forecast.selectAll')} onPress={selectAllDirect} /> : null}
          {selectedIds.size > 0 ? <Pill label={t('forecast.clearSelection')} onPress={clearSelectionDirect} /> : null}
        </View>
      ) : null}

      {selectedEntities.length > 0 ? (
        <>
          <View style={styles.viewToggleRow}>
            <Pill label={t('forecast.viewList')} active={viewMode === 'list'} onPress={() => setViewMode('list')} />
            <Pill label={t('forecast.viewGraph')} active={viewMode === 'graph'} onPress={() => setViewMode('graph')} />
          </View>
          {/* Both presentations stay mounted at all times and are only
              shown/hidden via style — switching back to List and returning
              to Graph must not reset the Graph's own aggregation level,
              hidden/highlighted series, or selected month. */}
          <View style={viewMode !== 'list' ? styles.hidden : undefined}>
            <ForecastBreakdownPreview
              combined={normalized.combined}
              typeGroups={normalized.types}
              hasMultipleOwners={normalized.hasMultipleOwners}
              periodMonths={periodMonths}
              onChangePeriod={setPeriodMonths}
            />
          </View>
          <View style={viewMode !== 'graph' ? styles.hidden : undefined}>
            <ForecastGraphView normalized={normalized} periodMonths={periodMonths} onChangePeriod={setPeriodMonths} />
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>{t('forecast.emptySelection')}</Text>
      )}

      <MultiSelectShell
        visible={pickerOpen}
        title={t('forecast.selectAccountsPots')}
        subtitle={t('forecast.selectAccountsPotsHint')}
        closeLabel={t('close')}
        confirmLabel={t('done')}
        onClose={() => setPickerOpen(false)}
        onConfirm={confirmPicker}
      >
        <View style={styles.pickerHeaderRow}>
          <Text style={styles.selectedCountText}>{t('forecast.selectedCount', { count: draftIds.size })}</Text>
          <View style={styles.pickerHeaderActions}>
            <Pill label={t('forecast.selectAll')} onPress={selectAllGlobally} />
            <Pill label={t('forecast.clearSelection')} onPress={clearSelectionGlobally} />
          </View>
        </View>

        {groups.length === 0 ? (
          <Text style={styles.emptyText}>{t('forecast.emptySelection')}</Text>
        ) : (
          // No fixed-height scroll region here — the modal shell itself
          // already scrolls and sizes up to ~90% of the screen, so letting
          // this list flow inside that (instead of a second, artificially
          // capped inner scroll area) gives the picker its full available
          // height instead of always truncating to a small fixed box.
          <View style={{ gap: spacing(3.5) }}>
            {groups.map((group) => {
              const groupIds = group.entities.map((entity) => entity.id);
              const groupSelectedCount = groupIds.filter((id) => draftIds.has(id)).length;
              const typesInGroup = [...new Set(group.entities.map((entity) => entity.type ?? POT_BREAKDOWN_TYPE_KEY))];
              const bulkOptions = [
                { key: '__all__', label: t('forecast.bulkAll'), ids: groupIds },
                ...(group.key === POT_BREAKDOWN_TYPE_KEY
                  ? []
                  : typesInGroup.map((type) => ({
                      key: type,
                      label: getAccountTypeLabel(type),
                      ids: group.entities.filter((entity) => entity.type === type).map((entity) => entity.id),
                    }))),
              ];

              return (
                <View key={group.key} style={styles.group}>
                  <View style={styles.groupHeaderRow}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupCount}>{t('forecast.selectedCount', { count: groupSelectedCount })}</Text>
                  </View>
                  <View style={styles.bulkRow}>
                    {bulkOptions.map((option) => (
                      <Pill
                        key={option.key}
                        label={option.label}
                        active={option.ids.length > 0 && option.ids.every((id) => draftIds.has(id))}
                        onPress={() => toggleBulk(option.ids)}
                      />
                    ))}
                  </View>
                  <View>
                    {group.entities.map((entity) => {
                      const selected = draftIds.has(entity.id);
                      return (
                        <Pressable
                          key={entity.id}
                          onPress={() => toggleDraft(entity.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: selected }}
                          style={({ pressed }) => [styles.entityRow, pressed && styles.pressed]}
                        >
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.entityName, selected && { color: colors.primary }]} numberOfLines={1}>
                              {entity.name}
                            </Text>
                            {entity.type ? <Text style={styles.entityMeta}>{getAccountTypeLabel(entity.type)}</Text> : null}
                          </View>
                          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                            {selected ? <Text style={styles.checkboxLabel}>✓</Text> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </MultiSelectShell>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    emptyText: { color: colors.textSecondary, fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] },
    quickActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) },
    viewToggleRow: { flexDirection: 'row', gap: spacing(1.5) },
    hidden: { display: 'none' },
    pickerHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: spacing(2),
    },
    selectedCountText: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.extraBold },
    pickerHeaderActions: { flexDirection: 'row', gap: spacing(1.5) },
    group: { gap: spacing(2) },
    groupHeaderRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    groupTitle: {
      color: colors.primary,
      fontSize: typography.fontSize[12],
      fontWeight: typography.fontWeight.extraBold,
      textTransform: 'uppercase',
      letterSpacing: typography.letterSpacing[10],
    },
    groupCount: { color: colors.textSecondary, fontSize: typography.fontSize[11], fontWeight: typography.fontWeight.semibold },
    bulkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1.5) },
    entityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(3),
      paddingVertical: spacing(1.75),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    entityName: { color: colors.text, fontSize: typography.fontSize[13], fontWeight: typography.fontWeight.bold },
    entityMeta: { color: colors.textSecondary, fontSize: typography.fontSize[11] },
    checkbox: {
      width: spacing(5.5),
      height: spacing(5.5),
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
    },
    checkboxSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkboxLabel: { color: colors.primaryForeground, fontSize: typography.fontSize[12], fontWeight: '900' },
    pressed: { opacity: 0.85 },
  });
}
