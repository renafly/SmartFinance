import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { Button, Card, Page, formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { useHouseholdMemberDetails } from "@/features/households/hooks";

import { computeMinimalTransfers, SettlementError } from "../algorithm/settlement";
import { fromCents, toCents } from "../algorithm/money";
import { useSaveReplenishmentDraft } from "../hooks/useReplenishmentDraft";
import { useConfirmReplenishment } from "../hooks/useConfirmReplenishment";
import { buildMemberLabelMap } from "../member-grouping";
import type {
  ReplenishableTransaction,
  ReplenishmentDestination,
  ReplenishmentSourceDraft,
  ReplenishmentTransferPreview,
} from "../types";

import { SelectAccountsToReplenishStep } from "./steps/SelectAccountsToReplenishStep";
import { SelectTransactionsStep } from "./steps/SelectTransactionsStep";
import { SelectSourcesStep } from "./steps/SelectSourcesStep";
import { DistributionStep } from "./steps/DistributionStep";
import { TransferPreviewStep } from "./steps/TransferPreviewStep";

const STEP_KEYS = ["accounts", "transactions", "sources", "distribution", "preview"] as const;
type StepKey = (typeof STEP_KEYS)[number];

// Used only for the interactive step track's accessibility labels (see
// `goToStep` below) -- each points at a title key that already exists for
// that step's own screen, rather than inventing a second, possibly
// inconsistent, short name per step.
const STEP_TITLE_KEYS: Record<StepKey, string> = {
  accounts: "replenishments.selectAccountsTitle",
  transactions: "replenishments.transactionsTitle",
  sources: "replenishments.selectSourcesTitle",
  distribution: "replenishments.distributionTitle",
  preview: "replenishments.previewStepTitle",
};

export function ReplenishmentWizard({
  onDone,
  onViewHistory,
}: {
  onDone?: () => void;
  onViewHistory?: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { householdId, profile } = useAuth();
  const { show } = useToast();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  // Page's own bottom safe-area handling only covers its plain ScrollView --
  // the fixed bottom action bar below renders through Page's `overlay` prop
  // (a sibling of that ScrollView, see migrated-page.tsx), which nothing
  // else pads for automatically. Same pattern already used by budget.tsx's
  // fixed bottom action bar.
  const insets = useSafeAreaInsets();

  const [stepIndex, setStepIndex] = useState(0);
  // The furthest step this run has ever validly reached -- every path that
  // advances the wizard goes through `goTo`, which keeps this in sync (see
  // below). Drives the interactive step track: any step at or behind this
  // index was already reachable through normal "Next" validation, so
  // jumping straight back to it is always safe; anything past it has never
  // been reached and stays locked rather than skipping the checks that
  // guard each step's "Next" button.
  const [maxStepIndexReached, setMaxStepIndexReached] = useState(0);
  const [replenishAccountIds, setReplenishAccountIds] = useState<Set<string>>(new Set());
  const [selectedTransactions, setSelectedTransactions] = useState<
    Map<string, ReplenishableTransaction>
  >(new Map());
  const [sources, setSources] = useState<ReplenishmentSourceDraft[]>([]);
  const [runId, setRunId] = useState<string | null>(null);

  const saveDraft = useSaveReplenishmentDraft();
  const confirmReplenishment = useConfirmReplenishment();
  const membersQuery = useHouseholdMemberDetails();

  const currentStep = STEP_KEYS[stepIndex] as StepKey;

  // Resolved once and threaded through every step so the accounts/pots/
  // transactions grouping (see member-grouping.ts) shows the exact same
  // member name for the exact same person at every stage of the wizard.
  const memberLabelMap = useMemo(
    () => buildMemberLabelMap(membersQuery.data ?? [], t("settings.unnamedUser")),
    [membersQuery.data, t],
  );

  const destinations = useMemo<ReplenishmentDestination[]>(() => {
    const byAccount = new Map<string, ReplenishmentDestination>();
    for (const transaction of selectedTransactions.values()) {
      const existing = byAccount.get(transaction.accountId);
      if (existing) {
        existing.amount += transaction.amount;
      } else {
        byAccount.set(transaction.accountId, {
          accountId: transaction.accountId,
          accountName: transaction.accountName,
          amount: transaction.amount,
        });
      }
    }
    return [...byAccount.values()];
  }, [selectedTransactions]);

  const totalAmount = useMemo(
    () => destinations.reduce((sum, destination) => sum + destination.amount, 0),
    [destinations],
  );
  const sourcesTotal = useMemo(
    () => sources.reduce((sum, source) => sum + source.amount, 0),
    [sources],
  );
  // Positive: still needs allocating. Negative: over-allocated. Rounded to
  // cents before comparing so floating-point noise from repeated additions
  // never blocks an otherwise-exact distribution.
  const remainingAmount = useMemo(
    () => fromCents(toCents(totalAmount) - toCents(sourcesTotal)),
    [totalAmount, sourcesTotal],
  );
  const isDistributionValid = destinations.length > 0 && sources.length > 0 && remainingAmount === 0;

  const transferPreview = useMemo<ReplenishmentTransferPreview[] | null>(() => {
    if (!isDistributionValid) return null;
    try {
      const settlementSources = sources
        .filter((source) => source.amount > 0)
        .map((source) => ({ accountId: source.resolvedAccountId, amountCents: toCents(source.amount) }));
      const settlementDestinations = destinations.map((destination) => ({
        accountId: destination.accountId,
        amountCents: toCents(destination.amount),
      }));
      const transfers = computeMinimalTransfers(settlementSources, settlementDestinations);

      const sourceLabelByAccount = new Map(sources.map((source) => [source.resolvedAccountId, source.label]));
      const destinationLabelByAccount = new Map(
        destinations.map((destination) => [destination.accountId, destination.accountName]),
      );

      return transfers.map((transfer) => ({
        sourceAccountId: transfer.sourceAccountId,
        sourceLabel: sourceLabelByAccount.get(transfer.sourceAccountId) ?? transfer.sourceAccountId,
        destinationAccountId: transfer.destinationAccountId,
        destinationLabel:
          destinationLabelByAccount.get(transfer.destinationAccountId) ?? transfer.destinationAccountId,
        amount: fromCents(transfer.amountCents),
      }));
    } catch (error) {
      if (error instanceof SettlementError) return null;
      throw error;
    }
  }, [destinations, isDistributionValid, sources]);

  function goTo(nextIndex: number) {
    const clamped = Math.max(0, Math.min(nextIndex, STEP_KEYS.length - 1));
    setStepIndex(clamped);
    setMaxStepIndexReached((current) => Math.max(current, clamped));
  }

  // Entry point for the interactive step track: only ever moves to a step
  // already reached through normal validated progress, so it can never be
  // used to skip ahead past a step whose "Next" gate hasn't been cleared.
  function goToStep(index: number) {
    if (index > maxStepIndexReached) return;
    goTo(index);
  }

  // Takes an array so a single call can toggle either one account (a plain
  // account row) or every account backing a saving pot at once (a pot row)
  // -- a pot has no balance of its own to replenish, only its backing
  // accounts do, so "select this pot to replenish" really means "select
  // all of its accounts". Semantics: if every id in the list is already
  // selected, deselect them all; otherwise select them all. This also
  // means a pot whose accounts are only partially selected (e.g. one was
  // toggled individually) reads as "not fully selected" and a press
  // selects the rest, rather than round-tripping through a separate
  // pot-level selection flag that could drift from the account set.
  function toggleReplenishAccountIds(accountIds: string[]) {
    if (accountIds.length === 0) return;
    setReplenishAccountIds((current) => {
      const next = new Set(current);
      const allSelected = accountIds.every((id) => next.has(id));
      for (const id of accountIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  // Keeps step 2's selection and step 3's sources consistent whenever step
  // 1's "accounts to replenish" set changes: a transaction whose account is
  // no longer being replenished has nothing to select it for anymore, and a
  // source resolving to an account that just became a replenish target
  // would be a circular/invalid move (the same constraint the source picker
  // enforces going forward, applied retroactively to state from before the
  // account was added).
  useEffect(() => {
    setSelectedTransactions((current) => {
      let changed = false;
      const next = new Map(current);
      for (const [id, transaction] of current) {
        if (!replenishAccountIds.has(transaction.accountId)) {
          next.delete(id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setSources((current) => {
      const next = current.filter((source) => !replenishAccountIds.has(source.resolvedAccountId));
      return next.length === current.length ? current : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replenishAccountIds]);

  async function persistDraft() {
    if (!householdId || !profile?.id) return null;
    const run = await saveDraft.mutateAsync({
      input: {
        householdId,
        createdBy: profile.id,
        totalAmount,
        transactions: [...selectedTransactions.values()].map((transaction) => ({
          transactionId: transaction.id,
          accountId: transaction.accountId,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          transactionDate: transaction.transactionDate,
        })),
        sources: sources.map((source, index) => ({
          kind: source.kind,
          potId: source.potId,
          resolvedAccountId: source.resolvedAccountId,
          amount: source.amount,
          suggestedAmount: source.suggestedAmount,
          sortOrder: index,
        })),
      },
      existingRunId: runId,
    });
    setRunId(run.id);
    return run;
  }

  async function handleConfirm() {
    if (!transferPreview || transferPreview.length === 0) return;
    try {
      const run = await persistDraft();
      if (!run) return;

      // confirm_replenishment_run rejects the confirmation unless
      // `p_preview->'transfers'` is JSONB-equal to `p_transfers` (it's the
      // guard against confirming a stale/tampered payload) -- so the exact
      // same array, in the exact same shape the RPC receives, must also be
      // what gets embedded in the stored preview. transferPreview itself
      // carries display-only fields (sourceLabel/destinationLabel) that
      // never reach the RPC, so it can't be reused directly here.
      const rpcTransfers = transferPreview.map((transfer) => ({
        sourceAccountId: transfer.sourceAccountId,
        destinationAccountId: transfer.destinationAccountId,
        amount: transfer.amount,
        title: null as string | null,
        notes: null as string | null,
        categoryId: null as string | null,
      }));

      const preview = {
        transactionIds: [...selectedTransactions.keys()],
        destinations,
        sources: sources.map((source) => ({
          resolvedAccountId: source.resolvedAccountId,
          amount: source.amount,
          suggestedAmount: source.suggestedAmount,
        })),
        transfers: rpcTransfers,
        totalAmount,
      };

      await confirmReplenishment.mutateAsync({
        runId: run.id,
        transfers: rpcTransfers,
        preview,
      });

      show(t("replenishments.confirmSuccess", { count: transferPreview.length }));
      onDone?.();
    } catch (error) {
      show(
        t("replenishments.confirmError", {
          detail: error instanceof Error ? error.message : t("unknownError"),
        }),
      );
    }
  }

  const canProceed =
    currentStep === "accounts"
      ? replenishAccountIds.size > 0
      : currentStep === "transactions"
        ? selectedTransactions.size > 0
        : currentStep === "sources"
          ? sources.length > 0
          : currentStep === "distribution"
            ? isDistributionValid
            : true;

  return (
    <Page
      title={t("replenishments.title")}
      subtitle={t("replenishments.subtitle")}
      actions={
        onViewHistory ? (
          <Button label={t("replenishments.viewHistory")} variant="secondary" onPress={onViewHistory} />
        ) : undefined
      }
      // Fixed bottom action bar, same "overlay" pattern already used by
      // budget.tsx's persistent save/confirm bar: Page renders this as a
      // sibling of its own ScrollView, absolutely positioned to the bottom
      // of the screen, so Back/Next (or Confirm, on the last step) stay
      // reachable on every step -- including the long Filters/Transactions
      // and Distribution/Preview steps -- without scrolling. Works
      // identically on mobile and web since it's plain RN View/Pressable
      // positioning, no platform branching needed.
      overlay={
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: spacing(3) + insets.bottom,
            },
          ]}
        >
          <View style={styles.navRow}>
            <Button
              label={t("back")}
              variant="secondary"
              onPress={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0}
            />
            {currentStep !== "preview" ? (
              <Button label={t("next")} onPress={() => goTo(stepIndex + 1)} disabled={!canProceed} />
            ) : (
              <Button
                label={
                  saveDraft.isPending || confirmReplenishment.isPending
                    ? t("replenishments.confirming")
                    : t("replenishments.confirmButton")
                }
                onPress={() => void handleConfirm()}
                disabled={
                  !transferPreview ||
                  transferPreview.length === 0 ||
                  saveDraft.isPending ||
                  confirmReplenishment.isPending
                }
              />
            )}
          </View>
        </View>
      }
    >
      <Card>
        <View style={{ gap: spacing(3) }}>
          <View style={styles.stepperRow}>
            {STEP_KEYS.map((step, index) => {
              const reachable = index <= maxStepIndexReached;
              const isCurrent = index === stepIndex;
              return (
                <Pressable
                  key={step}
                  onPress={() => goToStep(index)}
                  disabled={!reachable}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent, disabled: !reachable }}
                  accessibilityLabel={
                    isCurrent
                      ? t("replenishments.stepIndicatorCurrent")
                      : reachable
                        ? t("replenishments.stepIndicatorGoTo", {
                            current: index + 1,
                            step: t(STEP_TITLE_KEYS[step]),
                          })
                        : t("replenishments.stepIndicatorLocked")
                  }
                  style={({ pressed }) => [
                    styles.stepSegmentTouchable,
                    pressed && reachable ? { opacity: 0.7 } : null,
                  ]}
                >
                  <View
                    style={[
                      styles.stepSegment,
                      {
                        backgroundColor: index <= stepIndex ? colors.primary : colors.border,
                        opacity: reachable ? 1 : 0.4,
                      },
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.summaryRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                {t("replenishments.totalToReplenish")}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {displayCurrency(formatCurrency(totalAmount), hideValues)}
              </Text>
            </View>
            {stepIndex >= 2 ? (
              <View>
                <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                  {remainingAmount > 0
                    ? t("replenishments.remainingToAllocate")
                    : remainingAmount < 0
                      ? t("replenishments.overAllocated")
                      : t("replenishments.distributionValid")}
                </Text>
                <Text
                  style={[
                    styles.summaryValue,
                    { color: remainingAmount === 0 ? colors.financialPositive : colors.destructive },
                  ]}
                >
                  {displayCurrency(formatCurrency(Math.abs(remainingAmount)), hideValues)}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.stepIndicator, { color: colors.textSecondary }]}>
              {t("replenishments.stepIndicator", { current: stepIndex + 1, total: STEP_KEYS.length })}
            </Text>
          </View>
        </View>
      </Card>

      {currentStep === "accounts" ? (
        <SelectAccountsToReplenishStep
          selected={replenishAccountIds}
          onToggleAccountIds={toggleReplenishAccountIds}
          memberLabelMap={memberLabelMap}
        />
      ) : null}

      {currentStep === "transactions" ? (
        <SelectTransactionsStep
          replenishAccountIds={[...replenishAccountIds]}
          selected={selectedTransactions}
          onChangeSelected={setSelectedTransactions}
          memberLabelMap={memberLabelMap}
        />
      ) : null}

      {currentStep === "sources" ? (
        <SelectSourcesStep
          excludedAccountIds={[...replenishAccountIds]}
          sources={sources}
          onChangeSources={setSources}
          memberLabelMap={memberLabelMap}
        />
      ) : null}

      {currentStep === "distribution" ? (
        <DistributionStep totalAmount={totalAmount} sources={sources} onChangeSources={setSources} />
      ) : null}

      {currentStep === "preview" ? (
        <TransferPreviewStep
          destinations={destinations}
          sources={sources}
          transactionCount={selectedTransactions.size}
          totalAmount={totalAmount}
          transfers={transferPreview}
        />
      ) : null}

      {/* Keeps the last card clear of the fixed bottom action bar rendered
          through Page's `overlay` above. Grows with the bottom safe-area
          inset since the bar's own padding (and therefore its rendered
          height) grows with it too -- same spacer used at the bottom of
          budget.tsx for its own fixed action bar. */}
      <View style={{ height: spacing(22) + insets.bottom }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  stepperRow: {
    flexDirection: "row",
    gap: spacing(1.5),
  },
  stepSegmentTouchable: {
    flex: 1,
    // Vertical padding grows the tap target beyond the thin visual bar
    // without changing how tall the bar itself looks.
    paddingVertical: spacing(1.5),
  },
  stepSegment: {
    height: spacing(1.5),
    borderRadius: radius.full,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing(3),
  },
  summaryLabel: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: typography.letterSpacing[10],
  },
  summaryValue: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.extraBold,
    fontVariant: ["tabular-nums"],
  },
  stepIndicator: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(3),
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(2.5),
    borderTopWidth: 1,
  },
});
