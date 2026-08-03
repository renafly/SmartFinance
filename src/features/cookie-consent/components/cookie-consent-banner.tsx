import { Link, type Href } from "expo-router";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

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
  const { width } = useWindowDimensions();
  const compact = width < 680;
  const [preferences, setPreferences] = useState(
    consent?.preferences ?? false,
  );
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const manageButtonRef = useRef<View & { focus?: () => void }>(null);

  const close = () => {
    closePreferences();
    requestAnimationFrame(() => manageButtonRef.current?.focus?.());
  };

  return (
    <>
      {status === "undecided" ? (
        <View
          accessibilityLiveRegion="polite"
          role="region"
          aria-label={t("cookieConsent.bannerLabel")}
          style={[
            styles.banner,
            compact && styles.bannerCompact,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.copy}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t("cookieConsent.title")}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {t("cookieConsent.description")}{" "}
              <Link
                href={"/cookie-policy" as Href}
                style={{ color: colors.link }}
              >
                {t("cookieConsent.policyLink")}
              </Link>
            </Text>
          </View>
          <View style={[styles.actions, compact && styles.actionsCompact]}>
            <ActionButton
              label={t("cookieConsent.rejectOptional")}
              onPress={() => {
                setPreferences(false);
                setAnalytics(false);
                rejectOptional();
              }}
              variant="secondary"
            />
            <ActionButton
              label={t("cookieConsent.manage")}
              onPress={openPreferences}
              variant="secondary"
              buttonRef={manageButtonRef}
            />
            <ActionButton
              label={t("cookieConsent.acceptAll")}
              onPress={() => {
                setPreferences(true);
                setAnalytics(true);
                acceptAll();
              }}
              variant="primary"
            />
          </View>
        </View>
      ) : null}

      <Modal
        animationType="fade"
        transparent
        visible={isPreferencesOpen}
        onRequestClose={close}
      >
        <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
          <View
            accessibilityViewIsModal
            role="dialog"
            aria-modal
            aria-labelledby="cookie-preferences-title"
            style={[
              styles.dialog,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              nativeID="cookie-preferences-title"
              accessibilityRole="header"
              aria-level={2}
              style={[styles.dialogTitle, { color: colors.text }]}
            >
              {t("cookieConsent.preferencesTitle")}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {t("cookieConsent.preferencesDescription")}
            </Text>
            <PreferenceRow
              title={t("cookieConsent.necessaryTitle")}
              description={t("cookieConsent.necessaryDescription")}
              value
              disabled
              onValueChange={() => undefined}
            />
            <PreferenceRow
              title={t("cookieConsent.preferenceTitle")}
              description={t("cookieConsent.preferenceDescription")}
              value={preferences}
              onValueChange={setPreferences}
            />
            <PreferenceRow
              title={t("cookieConsent.analyticsTitle")}
              description={t("cookieConsent.analyticsDescription")}
              value={analytics}
              onValueChange={setAnalytics}
            />
            <Link
              href={"/cookie-policy" as Href}
              style={{ color: colors.link }}
            >
              {t("cookieConsent.readPolicy")}
            </Link>
            <View style={[styles.actions, styles.dialogActions]}>
              <ActionButton
                label={t("cookieConsent.cancel")}
                onPress={close}
                variant="secondary"
              />
              <ActionButton
                label={t("cookieConsent.save")}
                onPress={() => {
                  savePreferences({ preferences, analytics });
                  closePreferences();
                }}
                variant="primary"
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function PreferenceRow({
  title,
  description,
  value,
  disabled = false,
  onValueChange,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.preferenceRow, { borderColor: colors.border }]}>
      <View style={styles.preferenceCopy}>
        <Text style={[styles.preferenceTitle, { color: colors.text }]}>
          {title}
        </Text>
        <Text
          style={[
            styles.preferenceDescription,
            { color: colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityState={{ checked: value, disabled }}
        disabled={disabled}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  variant,
  buttonRef,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
  buttonRef?: React.Ref<View>;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      ref={buttonRef}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor:
            variant === "primary" ? colors.primary : colors.surface,
          borderColor:
            variant === "primary" ? colors.primary : colors.borderStrong,
        },
      ]}
    >
      <Text
        style={{
          color: variant === "primary" ? colors.primaryForeground : colors.text,
          fontWeight: "700",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    zIndex: 10000,
    elevation: 24,
    left: 20,
    right: 20,
    bottom: 20,
    maxWidth: 1120,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  bannerCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    left: 12,
    right: 12,
    bottom: 12,
  },
  copy: { flex: 1 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: "800", marginBottom: 5 },
  body: { fontSize: 14, lineHeight: 21 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 9,
  },
  actionsCompact: { alignItems: "stretch" },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  dialog: {
    width: "100%",
    maxWidth: 580,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 24,
    lineHeight: 31,
    fontWeight: "800",
    marginBottom: 8,
  },
  preferenceRow: {
    flexDirection: "row",
    gap: 18,
    alignItems: "center",
    borderBottomWidth: 1,
    paddingVertical: 17,
  },
  preferenceCopy: { flex: 1 },
  preferenceTitle: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
  preferenceDescription: { fontSize: 13, lineHeight: 19 },
  dialogActions: { justifyContent: "flex-end", marginTop: 22 },
});
