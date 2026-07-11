import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNotifications, useMarkNotificationRead } from "@/features/notifications/hooks";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

export function NotificationCenter() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
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
                <Pressable key={item.id} onPress={() => { if (!item.read_at) void markRead.mutateAsync(item.id); }} style={[styles.item, { borderColor: colors.border, backgroundColor: item.read_at ? colors.surface : colors.surfaceMuted }]}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.itemBody, { color: colors.textSecondary }]}>{item.body}</Text>
                </Pressable>
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
  itemTitle: { fontWeight: typography.fontWeight.bold as any },
  itemBody: { fontSize: typography.fontSize[13], lineHeight: typography.lineHeight[18] },
  close: { alignSelf: "flex-end", borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing(3), paddingVertical: spacing(2) },
});
