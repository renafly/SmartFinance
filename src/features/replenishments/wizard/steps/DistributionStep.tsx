import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";

import { Card, Field, Section, formatCurrency } from "@/components/migrated-page";
import { displayCurrency } from "@/shared/lib/mask-currency";
import { usePrivacyStore } from "@/stores/privacyStore";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";
import { fromCents, toCents } from "../../algorithm/money";
import type { ReplenishmentSourceDraft } from "../../types";

/** Splits `totalCents` proportionally to each source's available balance
 * (falls back to an even split when nobody has a positive balance), always
 * summing back to exactly `totalCents` -- the last source absorbs whatever
 * cent the proportional rounding would otherwise drop or add, matching the
 * integer-cents remainder handling already used elsewhere in this codebase
 * (see budget_rule_allocations' equal-split remainder distribution). */
function suggestSplit(
  sources: ReplenishmentSourceDraft[],
  totalCents: number,
): number[] {
  if (sources.length === 0) return [];
  const weights = sources.map((source) => Math.max(0, toCents(source.availableAmount)));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  const shares =
    totalWeight > 0
      ? weights.map((weight) => Math.floor((weight / totalWeight) * totalCents))
      : sources.map(() => Math.floor(totalCents / sources.length));

  const distributed = shares.reduce((sum, share) => sum + share, 0);
  const remainder = totalCents - distributed;
  if (shares.length > 0) shares[shares.length - 1] += remainder;
  return shares;
}

export function DistributionStep({
  totalAmount,
  sources,
  onChangeSources,
}: {
  totalAmount: number;
  sources: ReplenishmentSourceDraft[];
  onChangeSources: (updater: (current: ReplenishmentSourceDraft[]) => ReplenishmentSourceDraft[]) => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const hideValues = usePrivacyStore((state) => state.hideValues);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const totalCents = toCents(totalAmount);
  const currentTotalCents = sources.reduce((sum, source) => sum + toCents(source.amount), 0);

  // Auto-fill a suggested split whenever the *set* of chosen sources changes
  // (added, removed, or one swapped for another) or the total to replenish
  // changes -- keyed off a sorted-id signature rather than the `sources`
  // array reference itself, since that reference also changes on every
  // keystroke in the amount fields below (updateAmount clones the array),
  // which would otherwise stomp on whatever the user just typed. This is
  // only ever a starting point: editing an amount doesn't touch the
  // signature, so it never gets silently overwritten by a fresh suggestion.
  const sourceSignature = [...sources.map((source) => source.resolvedAccountId)].sort().join("|");
  useEffect(() => {
    if (sources.length === 0) return;
    const shares = suggestSplit(sources, totalCents);
    onChangeSources((current) =>
      current.map((source, index) => ({
        ...source,
        suggestedAmount: fromCents(shares[index] ?? 0),
        amount: fromCents(shares[index] ?? 0),
      })),
    );
    setDrafts({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceSignature, totalCents]);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      for (const source of sources) {
        if (next[source.resolvedAccountId] === undefined) {
          next[source.resolvedAccountId] = source.amount ? String(source.amount) : "";
        }
      }
      return next;
    });
  }, [sources]);

  function updateAmount(resolvedAccountId: string, rawValue: string) {
    setDrafts((current) => ({ ...current, [resolvedAccountId]: rawValue }));
    const parsed = Number(rawValue.replace(",", "."));
    onChangeSources((current) =>
      current.map((source) =>
        source.resolvedAccountId === resolvedAccountId
          ? { ...source, amount: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 }
          : source,
      ),
    );
  }

  const remainingCents = totalCents - currentTotalCents;
  const remaining = fromCents(remainingCents);
  const bannerTone =
    remainingCents === 0 ? "valid" : remainingCents > 0 ? "under" : "over";

  const overBalanceWarnings = useMemo(
    () => sources.filter((source) => source.amount > source.availableAmount),
    [sources],
  );

  return (
    <>
      <Card>
        <View
          style={[
            styles.banner,
            {
              backgroundColor:
                bannerTone === "valid"
                  ? colors.financialPositiveSoft
                  : bannerTone === "over"
                    ? colors.destructiveSoft
                    : colors.financialAttentionSoft,
              borderColor:
                bannerTone === "valid"
                  ? colors.financialPositive
                  : bannerTone === "over"
                    ? colors.destructive
                    : colors.financialAttention,
            },
          ]}
        >
          <Text
            style={[
              styles.bannerText,
              {
                color:
                  bannerTone === "valid"
                    ? colors.financialPositive
                    : bannerTone === "over"
                      ? colors.destructive
                      : colors.financialAttention,
              },
            ]}
          >
            {bannerTone === "valid"
              ? t("replenishments.distributionValid")
              : bannerTone === "over"
                ? t("replenishments.overAllocatedBy", {
                    amount: displayCurrency(formatCurrency(Math.abs(remaining)), hideValues),
                  })
                : t("replenishments.remainingToAllocateAmount", {
                    amount: displayCurrency(formatCurrency(remaining), hideValues),
                  })}
          </Text>
        </View>
      </Card>

      <Card>
        <Section title={t("replenishments.distributionTitle")} subtitle={t("replenishments.distributionSubtitle")}>
          <View style={{ gap: spacing(3) }}>
            {sources.map((source) => (
              <View key={source.resolvedAccountId} style={styles.sourceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sourceLabel, { color: colors.text }]}>{source.label}</Text>
                  <Text style={[styles.sourceHint, { color: colors.textSecondary }]}>
                    {t("replenishments.suggested")}: {displayCurrency(formatCurrency(source.suggestedAmount), hideValues)}
                    {" · "}
                    {t("replenishments.available")}: {displayCurrency(formatCurrency(source.availableAmount), hideValues)}
                  </Text>
                  {source.amount > source.availableAmount ? (
                    <Text style={[styles.sourceWarning, { color: colors.financialAttention }]}>
                      {t("replenishments.overBalanceWarning")}
                    </Text>
                  ) : null}
                </View>
                <Field
                  label={t("replenishments.amount")}
                  value={drafts[source.resolvedAccountId] ?? ""}
                  onChangeText={(value) => updateAmount(source.resolvedAccountId, value)}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        </Section>
      </Card>

      {overBalanceWarnings.length > 0 ? (
        <Card>
          <Text style={{ color: colors.financialAttention }}>
            {t("replenishments.overBalanceSummary", { count: overBalanceWarnings.length })}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderWidth: 1,
    borderRadius: spacing(2.5),
    padding: spacing(3),
  },
  bannerText: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
  },
  sourceLabel: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  sourceHint: {
    fontSize: typography.fontSize[12],
    marginTop: spacing(0.5),
  },
  sourceWarning: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing(0.5),
  },
});
