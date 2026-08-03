import { useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useCookieConsent } from "@/features/cookie-consent/core";
import { useTheme } from "@/theme/ThemeProvider";

export function CookieConsentBanner() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const {
    status,
    consent,
    acceptAll,
    rejectOptional,
    savePreferences,
    openPreferences,
    closePreferences,
    isPreferencesOpen,
  } = useCookieConsent();
  const [preferences, setPreferences] = useState(consent?.preferences ?? false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);

  return (
    <>
      {status === "undecided" ? (
        <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{t("cookieConsent.title")}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{t("cookieConsent.description")}</Text>
          <View style={styles.actions}>
            <ConsentButton label={t("cookieConsent.rejectOptional")} onPress={rejectOptional} secondary />
            <ConsentButton label={t("cookieConsent.manage")} onPress={openPreferences} secondary />
            <ConsentButton label={t("cookieConsent.acceptAll")} onPress={acceptAll} />
          </View>
        </View>
      ) : null}

      <Modal visible={isPreferencesOpen} transparent animationType="fade" onRequestClose={closePreferences}>
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View style={[styles.dialog, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>{t("cookieConsent.preferencesTitle")}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{t("cookieConsent.preferencesDescription")}</Text>
            <PreferenceRow title={t("cookieConsent.necessaryTitle")} value disabled onChange={() => undefined} />
            <PreferenceRow title={t("cookieConsent.preferenceTitle")} value={preferences} onChange={setPreferences} />
            <PreferenceRow title={t("cookieConsent.analyticsTitle")} value={analytics} onChange={setAnalytics} />
            <View style={styles.actions}>
              <ConsentButton label={t("cookieConsent.cancel")} onPress={closePreferences} secondary />
              <ConsentButton
                label={t("cookieConsent.save")}
                onPress={() => {
                  savePreferences({ preferences, analytics });
                  closePreferences();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PreferenceRow({ title, value, disabled, onChange }: { title: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.preferenceRow, { borderColor: colors.border }]}>
      <Text style={[styles.preferenceTitle, { color: colors.text }]}>{title}</Text>
      <Switch value={value} disabled={disabled} onValueChange={onChange} accessibilityLabel={title} />
    </View>
  );
}

function ConsentButton({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { backgroundColor: secondary ? colors.surface : colors.primary, borderColor: secondary ? colors.borderStrong : colors.primary }]}
    >
      <Text style={{ color: secondary ? colors.text : colors.primaryForeground, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    zIndex: 10000,
    elevation: 24,
    left: 12,
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 9, marginTop: 6 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", padding: 18 },
  dialog: { width: "100%", maxWidth: 580, borderWidth: 1, borderRadius: 20, padding: 22, gap: 8 },
  dialogTitle: { fontSize: 23, lineHeight: 30, fontWeight: "800" },
  preferenceRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottomWidth: 1 },
  preferenceTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
});
