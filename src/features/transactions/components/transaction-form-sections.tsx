import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { spacing } from "@/theme/spacing";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";

/**
 * Layout shared by the create form and the edit modal, so both show the
 * same fields in the same order:
 *   Essentials -> Payment (PaymentBreakdownSection) -> More details.
 * These components only arrange the slots they get; each screen keeps its
 * own state and fields.
 */
export function EssentialsSection({
  typeSelector,
  amount,
  title,
  category,
  date,
  children,
}: {
  typeSelector?: ReactNode;
  /** Shown large, right under the type: it's what the user checks first. */
  amount?: ReactNode;
  title?: ReactNode;
  /** Next to the date, right under the title it is suggested from. */
  category?: ReactNode;
  date?: ReactNode;
  /** Anything that belongs right after the essentials (warnings, notices). */
  children?: ReactNode;
}) {
  const responsive = useResponsiveMetrics();
  return (
    <View style={styles.section}>
      {typeSelector}
      {amount}
      {title}
      {category || date ? (
        <View style={[styles.row, responsive.isPhone && styles.rowStacked]}>
          {category ? <View style={styles.rowItem}>{category}</View> : null}
          {date ? <View style={styles.rowItem}>{date}</View> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** The optional fields (person, tags, notes, attachments), collapsed by
 * default behind a one-line summary of what they hold. */
export function MoreDetailsSection({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: string[];
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        hitSlop={8}
        style={styles.header}
      >
        <View style={{ flex: 1, gap: spacing(0.5) }}>
          <Text style={[styles.title, { color: colors.text }]}>{t("transactions.moreDetails.title")}</Text>
          {!open && summary.length > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{summary.join(" · ")}</Text>
          ) : null}
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
      </Pressable>
      {open ? <View style={styles.section}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing(3) },
  row: { flexDirection: "row", gap: spacing(3), alignItems: "flex-start" },
  rowStacked: { flexDirection: "column", alignItems: "stretch" },
  rowItem: { flex: 1, minWidth: 0 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing(2),
    gap: spacing(2),
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing(1) },
  title: { fontSize: 15, fontWeight: "700" },
});
