import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNotifications, useMarkNotificationRead } from "@/features/notifications/hooks";
import { notificationsService } from "@/features/notifications/services/notifications.service";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export function NotificationCenter() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const unread = (notifications.data ?? []).filter((item) => !item.read_at).length;

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={[styles.trigger, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name="notifications-outline" size={18} color={colors.text} />
        <Text style={[styles.triggerLabel, { color: colors.text }]}>{t("notifications.title")}</Text>
        {unread ? <View style={[styles.count, { backgroundColor: colors.primary }]}><Text style={[styles.countText, { color: colors.primaryForeground }]}>{unread}</Text></View> : null}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>{t("notifications.title")}</Text>
            <ScrollView contentContainerStyle={styles.list}>
              {(notifications.data ?? []).map((item) => (
                <View key={item.id} style={[styles.item, { borderColor: colors.border, backgroundColor: item.read_at ? colors.surface : colors.surfaceMuted }]}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                    <Pressable
                      onPress={() => void notificationsService.softDelete(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }))}
                      hitSlop={8}
                      style={[styles.iconButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      accessibilityRole="button"
                      accessibilityLabel={t("notifications.softDelete")}
                    >
                      <Text style={[styles.softDeleteText, { color: colors.textSecondary }]}>{t("notifications.softDeleteShort")}</Text>
                    </Pressable>
                  </View>
                  <Text style={[styles.itemBody, { color: colors.textSecondary }]}>{item.body}</Text>
                  {!item.read_at ? (
                    <Text style={[styles.pendingLabel, { color: colors.primary }]}>
                      {t("notifications.pendingApproval")}
                    </Text>
                  ) : null}
                  {!item.read_at ? (
                    <Pressable
                      onPress={() => void markRead.mutateAsync(item.id)}
                      style={[styles.approve, { borderColor: colors.primary }]}
                    >
                      <Text style={{ color: colors.primary, fontWeight: typography.fontWeight.bold as any }}>
                        {t("approve")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!notifications.isLoading && !(notifications.data ?? []).length ? <Text style={{ color: colors.textSecondary }}>{t("notifications.empty")}</Text> : null}
            </ScrollView>
            <Pressable onPress={() => setOpen(false)} style={[styles.close, { borderColor: colors.border }]}><Text style={{ color: colors.text }}>{t("close")}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles: any = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: spacing(2), borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing(3), paddingVertical: spacing(2.5) },
  triggerLabel: { fontSize: typography.fontSize[14], fontWeight: typography.fontWeight.semibold as any },
  count: { minWidth: spacing(5), alignItems: "center", borderRadius: radius.full, paddingHorizontal: spacing(1) },
  countText: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.extraBold as any },
  backdrop: { flex: 1, justifyContent: "center", padding: spacing(4) },
  card: { alignSelf: "center", width: "100%", maxWidth: spacing(120), maxHeight: "80%", gap: spacing(3), padding: spacing(4), borderWidth: 1, borderRadius: radius.xl },
  title: { fontSize: typography.fontSize[20], fontWeight: typography.fontWeight.extraBold as any },
  list: { gap: spacing(2) },
  item: { gap: spacing(1), borderWidth: 1, borderRadius: radius.lg, padding: spacing(3) },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing(2) },
  itemTitle: { flex: 1, fontWeight: typography.fontWeight.bold as any },
  itemBody: { fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] },
  pendingLabel: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.semibold as any, textTransform: "uppercase", letterSpacing: 0.4 },
  iconButton: { minWidth: spacing(8), alignItems: "center", justifyContent: "center", borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing(2), paddingVertical: spacing(0.75) },
  softDeleteText: { fontSize: typography.fontSize[12], fontWeight: typography.fontWeight.bold as any },
  approve: { alignSelf: "flex-start", marginTop: spacing(1), borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.5) },
  close: { alignSelf: "flex-end", borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
});
