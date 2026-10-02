import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button, Card, Field, Page, Pill } from '@/components/migrated-page';
import { EmptyState } from '@/components/data-surface';
import { MonthPickerField } from '@/components/date-picker-field';
import { DateFilterField } from '@/features/transactions/components/transaction-date-field';
import { getLocalCalendarDate } from '@/features/transactions/utils/transaction-create-form';
import { DeleteTagDialog } from '@/features/tags/components/delete-tag-dialog';
import { TagNameDialog } from '@/features/tags/components/tag-name-dialog';
import { TagSummaryCard } from '@/features/tags/components/tag-summary-card';
import {
  useCreateTag,
  useDeleteTag,
  useRenameTag,
  useTagSummaries,
  useTags,
} from '@/features/tags/hooks/useTags';
import { TagNameValidationError } from '@/features/tags/services/tags.service';
import {
  filterTags,
  resolveTagPeriodRange,
  sortTagSummaries,
} from '@/features/tags/services/tag-view-model';
import {
  TAG_PERIOD_MODES,
  TAG_SORT_KEYS,
  type TagPeriodMode,
  type TagSortKey,
  type TagSummary,
} from '@/features/tags/types';
import { useToast } from '@/providers/ToastProvider';
import { usePrivacyStore } from '@/stores/privacyStore';
import { useResponsiveMetrics } from '@/theme/responsive';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeProvider';

const ALL_TIME = { from: null, to: null } as const;

type NameDialogState = { mode: 'create' } | { mode: 'rename'; id: string; name: string } | null;

/**
 * Tags -- custom expense tags that group spending across categories and
 * accounts ("Travel to Bali", "House Renovations"). Totals come from
 * summarize_transaction_tags (net of reimbursements, same basis as the
 * Monthly Budget numbers) and respect the selected period, which uses the
 * app's existing period conventions: a month (MonthPickerField, as on
 * Category Budgets) or a from/to range (DateFilterField, as on the
 * Transactions filters). Tags are assigned from the expense create/edit
 * forms via TagPicker.
 */
export default function TagsScreen() {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { show: showToast } = useToast();
  const hideValues = usePrivacyStore((state) => state.hideValues);

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<TagSortKey>('spending');
  const [periodMode, setPeriodMode] = useState<TagPeriodMode>('all');
  const [month, setMonth] = useState(() => getLocalCalendarDate().slice(0, 7));
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [nameDialog, setNameDialog] = useState<NameDialogState>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<TagSummary | null>(null);

  const range = useMemo(
    () => resolveTagPeriodRange(periodMode, month, customFrom, customTo),
    [periodMode, month, customFrom, customTo],
  );

  const tagsQuery = useTags();
  const summariesQuery = useTagSummaries(range);
  // All-time counts for the delete confirmation (deduped with the list
  // query when the period is already "All time").
  const allTimeSummariesQuery = useTagSummaries(ALL_TIME);
  const createTag = useCreateTag();
  const renameTag = useRenameTag();
  const deleteTag = useDeleteTag();

  const summaries = useMemo(() => summariesQuery.data ?? [], [summariesQuery.data]);
  const visibleSummaries = useMemo(
    () => sortTagSummaries(filterTags(summaries, search), sortKey),
    [summaries, search, sortKey],
  );
  const hasAnyTags = summaries.length > 0;

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openCreate() {
    setNameError(null);
    setNameDialog({ mode: 'create' });
  }

  function closeNameDialog() {
    setNameDialog(null);
    setNameError(null);
  }

  async function handleSubmitName(name: string) {
    if (!nameDialog) return;
    const existing = tagsQuery.data ?? [];
    try {
      if (nameDialog.mode === 'create') {
        await createTag.mutateAsync({ name, existing });
        showToast(t('tags.createdToast'));
      } else {
        await renameTag.mutateAsync({ id: nameDialog.id, name, existing });
        showToast(t('tags.renamedToast'));
      }
      closeNameDialog();
    } catch (error) {
      setNameError(
        error instanceof TagNameValidationError ? t(`tags.errors.${error.code}`) : t('tags.saveError'),
      );
    }
  }

  async function handleConfirmDelete() {
    if (!tagToDelete) return;
    try {
      await deleteTag.mutateAsync(tagToDelete.id);
      setExpandedIds((current) => {
        const next = new Set(current);
        next.delete(tagToDelete.id);
        return next;
      });
      setTagToDelete(null);
      showToast(t('tags.deletedToast'));
    } catch {
      showToast(t('tags.deleteError'));
    }
  }

  const allTimeCountById = useMemo(
    () => new Map((allTimeSummariesQuery.data ?? []).map((tag) => [tag.id, tag.transactionCount])),
    [allTimeSummariesQuery.data],
  );

  const mutedText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  };
  const labelText = {
    color: colors.textSecondary,
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold as any,
  };

  return (
    <Page
      title={t('drawer.tags')}
      subtitle={t('tags.subtitle')}
      actions={<Button label={t('tags.createTag')} onPress={openCreate} />}
    >
      <Animated.View entering={FadeInDown.delay(0).duration(420)}>
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4) } as any}>
            <View style={{ flex: 1, minWidth: responsive.isPhone ? '100%' : 260 } as any}>
              <Field
                label={t('tags.searchLabel')}
                placeholder={t('tags.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            <View style={{ flex: 1, minWidth: responsive.isPhone ? '100%' : 260, gap: spacing(2) } as any}>
              <Text style={labelText}>{t('tags.period.label')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                {TAG_PERIOD_MODES.map((mode) => (
                  <Pill
                    key={mode}
                    label={t(`tags.period.${mode}`)}
                    active={periodMode === mode}
                    onPress={() => setPeriodMode(mode)}
                  />
                ))}
              </View>
            </View>
          </View>

          {periodMode === 'month' ? (
            <MonthPickerField
              label={t('tags.period.monthLabel')}
              value={month}
              onChange={setMonth}
              placeholder="MM-YYYY"
            />
          ) : null}
          {periodMode === 'custom' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) } as any}>
              <View style={{ flex: 1, minWidth: spacing(30) }}>
                <DateFilterField
                  label={t('transactions.dateFrom')}
                  value={customFrom}
                  onChange={setCustomFrom}
                  placeholder={t('transactions.dateFromPlaceholder')}
                />
              </View>
              <View style={{ flex: 1, minWidth: spacing(30) }}>
                <DateFilterField
                  label={t('transactions.dateTo')}
                  value={customTo}
                  onChange={setCustomTo}
                  placeholder={t('transactions.dateToPlaceholder')}
                />
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing(2) }}>
            <Text style={labelText}>{t('tags.sort.label')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
              {TAG_SORT_KEYS.map((key) => (
                <Pill
                  key={key}
                  label={t(`tags.sort.${key}`)}
                  active={sortKey === key}
                  onPress={() => setSortKey(key)}
                />
              ))}
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(420)} style={{ gap: spacing(3) }}>
        {summariesQuery.isLoading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingVertical: spacing(4) }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={mutedText}>{t('tags.loading')}</Text>
          </View>
        ) : summariesQuery.isError ? (
          <EmptyState
            icon="alert-circle-outline"
            title={t('tags.loadError')}
            actionLabel={t('tags.retry')}
            onAction={() => void summariesQuery.refetch()}
          />
        ) : !hasAnyTags ? (
          <EmptyState
            icon="pricetags-outline"
            title={t('tags.empty.title')}
            description={t('tags.empty.description')}
            actionLabel={t('tags.createTag')}
            onAction={openCreate}
          />
        ) : visibleSummaries.length === 0 ? (
          <Text style={mutedText}>{t('tags.noResults', { query: search.trim() })}</Text>
        ) : (
          visibleSummaries.map((tag) => (
            <TagSummaryCard
              key={tag.id}
              tag={tag}
              range={range}
              expanded={expandedIds.has(tag.id)}
              hideValues={hideValues}
              onToggle={() => toggleExpanded(tag.id)}
              onRename={() => {
                setNameError(null);
                setNameDialog({ mode: 'rename', id: tag.id, name: tag.name });
              }}
              onDelete={() => setTagToDelete(tag)}
            />
          ))
        )}
      </Animated.View>

      <TagNameDialog
        visible={!!nameDialog}
        title={nameDialog?.mode === 'rename' ? t('tags.renameTitle') : t('tags.createTitle')}
        initialName={nameDialog?.mode === 'rename' ? nameDialog.name : ''}
        submitting={createTag.isPending || renameTag.isPending}
        error={nameError}
        onChangeName={() => setNameError(null)}
        onSubmit={(name) => void handleSubmitName(name)}
        onClose={closeNameDialog}
      />
      <DeleteTagDialog
        tag={
          tagToDelete
            ? {
                ...tagToDelete,
                transactionCount: allTimeCountById.get(tagToDelete.id) ?? tagToDelete.transactionCount,
              }
            : null
        }
        deleting={deleteTag.isPending}
        onConfirm={() => void handleConfirmDelete()}
        onClose={() => setTagToDelete(null)}
      />
    </Page>
  );
}
