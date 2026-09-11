import { Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";

/**
 * Small always-on-top shortcut into the existing bug-report flow
 * (src/app/(protected)/feedback.tsx), mounted once in ProtectedDrawerLayout
 * so it shows on every authenticated screen. See
 * docs/recurring-end-conditions-reimbursements-bug-fab-plan.md §3.
 *
 * Deliberately reuses the existing feedback system end to end -- this adds
 * only a faster entry point (one tap, `kind=bug` preselected), not a
 * second bug-report mechanism.
 *
 * Positioning is route-aware because this app already has two screens with
 * their own fixed bottom overlay (found by grepping for `overlay=`, the
 * prop `Page` uses for a per-screen bottom-right FAB or full-width bottom
 * bar -- see the comment on `PrivacyToggle` in migrated-page.tsx, which
 * hit this same conflict and solved it by moving to top-right instead):
 *  - /transactions renders its own bottom-*right* "Add transaction" pill
 *    at the same corner/offset this FAB would otherwise use, so this FAB
 *    moves to bottom-*left* there instead -- transactions.tsx's overlay is
 *    right-anchored, not full-width, so the left corner is genuinely free.
 *  - /budget and /replenishments each render a *full-width* bottom action
 *    bar (1-3 buttons that can wrap to multiple rows, plus an optional
 *    two-line hint on /budget), whose height isn't knowable from source
 *    alone -- there's no safe fixed offset that's guaranteed to clear it,
 *    so this FAB simply doesn't render on either. The drawer menu still
 *    reaches Feedback from every screen, budget and replenishments
 *    included.
 * If a future screen adds its own `overlay`, add it to BOTTOM_BAR_ROUTES
 * or LEFT_ALIGNED_ROUTES below rather than guessing a taller offset.
 *
 * Also re-mounted inside every screen-level `Modal` (create/edit forms,
 * and SelectionShell's pickers) so it stays reachable while one is open --
 * RN's `Modal` always presents in its own native layer above the whole JS
 * view tree, so the single ProtectedDrawerLayout mount is invisible behind
 * any open Modal (see the zIndex/elevation comment on `styles.fab` below).
 * This mirrors `PrivacyToggle`'s exact pattern (see its doc comment in
 * migrated-page.tsx) -- see accounts.tsx, savings.tsx, transactions.tsx,
 * transfers.tsx, and selection-shell.tsx for the other mount points. Each
 * mount still resolves its own position from the current route, so it
 * naturally keeps whatever placement (or hidden state) the base screen
 * already uses.
 */
const HIDDEN_ROUTES = ["/feedback"];
const FULL_WIDTH_BOTTOM_BAR_ROUTES = ["/budget", "/replenishments"];
const BOTTOM_RIGHT_FAB_ROUTES = ["/transactions"];

export function BugReportFab() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  if (HIDDEN_ROUTES.some((route) => pathname?.endsWith(route))) return null;
  if (FULL_WIDTH_BOTTOM_BAR_ROUTES.some((route) => pathname?.endsWith(route))) return null;

  const alignLeft = BOTTOM_RIGHT_FAB_ROUTES.some((route) => pathname?.endsWith(route));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("feedback.reportBugButton")}
      onPress={() => router.push("/(protected)/feedback?kind=bug" as any)}
      hitSlop={8}
      style={({ pressed }) => [
        styles.fab,
        {
          bottom: insets.bottom + spacing(2.5),
          ...(alignLeft ? { left: spacing(2.5) } : { right: spacing(2.5) }),
          backgroundColor: colors.destructive,
          borderColor: colors.background,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="bug-outline" size={22} color={colors.destructiveForeground} />
    </Pressable>
  );
}

const FAB_SIZE = 52;

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    // Sits above normal screen content within its own mount. RN's `Modal`
    // always renders in its own native layer above the whole JS view tree
    // regardless of zIndex, so this zIndex only orders this FAB against
    // other non-Modal content in the same screen -- staying visible while
    // a Modal is open relies on the separate `<BugReportFab />` mounted
    // inside that Modal (see the doc comment above), not on this value.
    zIndex: 40,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  pressed: {
    opacity: 0.85,
  },
});
