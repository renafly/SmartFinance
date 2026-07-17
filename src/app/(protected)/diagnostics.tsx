import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Redirect } from "expo-router";

import { Card, Page, Section } from "@/components/migrated-page";
import { isSystemAdminEmail } from "@/constants/admin-access";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";
import { notificationsService } from "@/features/notifications/services/notifications.service";
import { registerWebPushDevice } from "@/features/notifications/web-push";
import { useWhatsNew } from "@/features/releases";
import { supabase } from "@/shared/lib/supabase/client";
import { useTheme } from "@/theme/ThemeProvider";
import { radius } from "@/theme/radius";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";

type DiagnosticStatus = "ready" | "warning" | "error" | "checking";

type DiagnosticItem = {
  key: string;
  label: string;
  description: string;
  value?: string;
  status: DiagnosticStatus;
};

const STORAGE_BUCKET = "attachments";
const INVITE_FUNCTION = "send-household-invitation";
const DIAGNOSTICS_NOTIFICATION_CHANNEL = "default";

function maskSecret(value: string | undefined, configuredLabel: string) {
  if (!value) return "";
  if (value.length <= 10) return configuredLabel;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function DiagnosticsScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const { isLoading, profile, session } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const releaseState = useWhatsNew();
  const canViewDiagnostics = isSystemAdminEmail(
    profile?.email,
    session?.user.email,
  );
  const [storageStatus, setStorageStatus] = useState<DiagnosticItem | null>(
    null,
  );
  const [functionStatus, setFunctionStatus] = useState<DiagnosticItem | null>(
    null,
  );
  const [notificationStatus, setNotificationStatus] =
    useState<DiagnosticItem | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isTriggeringNotification, setIsTriggeringNotification] =
    useState(false);

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const inviteWebUrl = process.env.EXPO_PUBLIC_INVITE_WEB_URL;
  const currentOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "";

  const staticItems = useMemo<DiagnosticItem[]>(
    () => [
      {
        key: "supabaseUrl",
        label: t("diagnostics.supabaseUrl"),
        description: t("diagnostics.supabaseUrlDescription"),
        value: supabaseUrl,
        status: supabaseUrl ? "ready" : "error",
      },
      {
        key: "supabaseKey",
        label: t("diagnostics.supabaseKey"),
        description: t("diagnostics.supabaseKeyDescription"),
        value: maskSecret(supabaseKey, t("diagnostics.configured")),
        status: supabaseKey ? "ready" : "error",
      },
      {
        key: "inviteWebUrl",
        label: t("diagnostics.inviteWebUrl"),
        description: t("diagnostics.inviteWebUrlDescription"),
        value: inviteWebUrl || currentOrigin || t("diagnostics.notAvailable"),
        status: inviteWebUrl || currentOrigin ? "ready" : "warning",
      },
      {
        key: "oauthOrigin",
        label: t("diagnostics.oauthOrigin"),
        description: t("diagnostics.oauthOriginDescription"),
        value: currentOrigin || t("diagnostics.nativeRuntime"),
        status:
          Platform.OS === "web"
            ? currentOrigin
              ? "ready"
              : "warning"
            : "ready",
      },
    ],
    [currentOrigin, inviteWebUrl, supabaseKey, supabaseUrl, t],
  );

  const liveItems = [
    storageStatus ?? {
      key: "storage",
      label: t("diagnostics.storageBucket"),
      description: t("diagnostics.storageBucketDescription", {
        bucket: STORAGE_BUCKET,
      }),
      status: "warning" as const,
      value: t("diagnostics.notChecked"),
    },
    functionStatus ?? {
      key: "inviteFunction",
      label: t("diagnostics.inviteFunction"),
      description: t("diagnostics.inviteFunctionDescription", {
        functionName: INVITE_FUNCTION,
      }),
      status: "warning" as const,
      value: t("diagnostics.notChecked"),
    },
  ];

  const releaseItems: DiagnosticItem[] = [
    {
      key: "releaseVersion",
      label: "App version",
      description: `SemVer from the ${releaseState.metadata.source} application manifest.`,
      value: releaseState.metadata.version,
      status: releaseState.metadata.version === "0.0.0" ? "error" : "ready",
    },
    {
      key: "releaseBuild",
      label: "Build",
      description: "Native build number with app-config fallback on web.",
      value: releaseState.metadata.build,
      status: releaseState.metadata.build === "unknown" ? "warning" : "ready",
    },
    {
      key: "releaseChannel",
      label: "Release channel",
      description: "Catalog channel used to select compatible release notes.",
      value: releaseState.metadata.channel,
      status: "ready",
    },
    {
      key: "releaseCommit",
      label: "Commit",
      description:
        "Source revision injected into the public Expo release metadata.",
      value: releaseState.metadata.commit,
      status: releaseState.metadata.commit === "unknown" ? "warning" : "ready",
    },
    {
      key: "releaseCatalog",
      label: "Release catalog",
      description:
        "Published releases available for skipped-version What's New summaries.",
      value: releaseState.isPending
        ? "Loading published releases..."
        : releaseState.error
          ? releaseState.error instanceof Error
            ? releaseState.error.message
            : "The release catalog could not be loaded."
          : `${releaseState.data?.length ?? 0} published release(s); ${releaseState.whatsNew?.releases.length ?? 0} unseen. Last seen: ${releaseState.lastSeenVersion ?? "none"}.`,
      status: releaseState.isPending
        ? "checking"
        : releaseState.error
          ? "error"
          : "ready",
    },
  ];

  if (isLoading) return null;
  if (!canViewDiagnostics) return <Redirect href="/(protected)" />;

  async function runLiveChecks() {
    setIsChecking(true);
    setStorageStatus({
      key: "storage",
      label: t("diagnostics.storageBucket"),
      description: t("diagnostics.storageBucketDescription", {
        bucket: STORAGE_BUCKET,
      }),
      status: "checking",
      value: t("diagnostics.checking"),
    });
    setFunctionStatus({
      key: "inviteFunction",
      label: t("diagnostics.inviteFunction"),
      description: t("diagnostics.inviteFunctionDescription", {
        functionName: INVITE_FUNCTION,
      }),
      status: "checking",
      value: t("diagnostics.checking"),
    });

    const [{ error: storageError }, functionResult] = await Promise.all([
      supabase.storage.from(STORAGE_BUCKET).list("", { limit: 1 }),
      checkInviteFunction(supabaseUrl),
    ]);

    setStorageStatus({
      key: "storage",
      label: t("diagnostics.storageBucket"),
      description: t("diagnostics.storageBucketDescription", {
        bucket: STORAGE_BUCKET,
      }),
      status: storageError ? "error" : "ready",
      value: storageError?.message ?? t("diagnostics.reachable"),
    });
    setFunctionStatus(functionResult);
    setIsChecking(false);
  }

  async function checkInviteFunction(url?: string): Promise<DiagnosticItem> {
    const base = url?.replace(/\/$/, "");
    const defaultItem = {
      key: "inviteFunction",
      label: t("diagnostics.inviteFunction"),
      description: t("diagnostics.inviteFunctionDescription", {
        functionName: INVITE_FUNCTION,
      }),
    };

    if (!base) {
      return {
        ...defaultItem,
        status: "error",
        value: t("diagnostics.missingSupabaseUrl"),
      };
    }

    try {
      const response = await fetch(`${base}/functions/v1/${INVITE_FUNCTION}`, {
        method: "OPTIONS",
      });

      return {
        ...defaultItem,
        status: response.ok ? "ready" : "warning",
        value: response.ok
          ? t("diagnostics.reachable")
          : t("diagnostics.httpStatus", { status: response.status }),
      };
    } catch (error) {
      return {
        ...defaultItem,
        status: "error",
        value:
          error instanceof Error
            ? error.message
            : t("diagnostics.unknownError"),
      };
    }
  }

  async function triggerNotificationTest() {
    setIsTriggeringNotification(true);
    const defaultItem = {
      key: "notificationTest",
      label: t("diagnostics.notificationTest"),
      description: t("diagnostics.notificationTestDescription"),
    };
    const recipientId = profile?.id ?? session?.user.id;

    async function createMenuNotification(title: string, body: string) {
      if (!recipientId) throw new Error("A signed-in recipient is required.");

      const notificationId = await notificationsService.createTestNotification({
        recipientId,
        title,
        body,
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({
        queryKey: ["notifications", recipientId],
      });
      await notificationsService.waitForPushDispatch(notificationId);
    }

    try {
      if (Platform.OS === "web") {
        if (typeof window === "undefined" || !("Notification" in window)) {
          setNotificationStatus({
            ...defaultItem,
            status: "error",
            value: t("diagnostics.notificationBrowserUnsupported"),
          });
          return;
        }

        if (!window.isSecureContext) {
          setNotificationStatus({
            ...defaultItem,
            status: "warning",
            value: t("diagnostics.notificationSecureContextRequired"),
          });
          return;
        }

        const permission =
          Notification.permission === "granted"
            ? Notification.permission
            : await Notification.requestPermission();

        if (permission !== "granted") {
          setNotificationStatus({
            ...defaultItem,
            status: "error",
            value: t("diagnostics.notificationPermissionDenied"),
          });
          return;
        }

        if (!recipientId) {
          setNotificationStatus({
            ...defaultItem,
            status: "error",
            value: t("diagnostics.unknownError"),
          });
          return;
        }

        const registration = await registerWebPushDevice(recipientId, true);
        if (registration !== "registered") {
          throw new Error(`Web Push registration failed: ${registration}.`);
        }

        await createMenuNotification(
          t("diagnostics.notificationTestMessageTitle"),
          t("diagnostics.notificationTestMessageBody"),
        );

        setNotificationStatus({
          ...defaultItem,
          status: "ready",
          value: t("diagnostics.notificationTestSent"),
        });
        show(t("diagnostics.notificationTestSent"));
        return;
      }

      const Notifications = await import("expo-notifications");

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
          DIAGNOSTICS_NOTIFICATION_CHANNEL,
          {
            name: t("diagnostics.notificationTestChannel"),
            importance: Notifications.AndroidImportance.HIGH,
            sound: "default",
          },
        );
      }

      const existingPermission = await Notifications.getPermissionsAsync();
      const permission =
        existingPermission.status === "granted"
          ? existingPermission
          : await Notifications.requestPermissionsAsync();

      if (permission.status !== "granted") {
        setNotificationStatus({
          ...defaultItem,
          status: "error",
          value: t("diagnostics.notificationPermissionDenied"),
        });
        return;
      }

      if (!recipientId || !Device.isDevice) {
        throw new Error(
          "Remote push notifications require a signed-in physical device.",
        );
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) throw new Error("The EAS project ID is not configured.");
      const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
        .data;
      await notificationsService.registerPushDevice(
        recipientId,
        token,
        Platform.OS as "android" | "ios",
      );

      const title = t("diagnostics.notificationTestMessageTitle");
      const body = t("diagnostics.notificationTestMessageBody");

      await createMenuNotification(title, body);

      setNotificationStatus({
        ...defaultItem,
        status: "ready",
        value: t("diagnostics.notificationTestSent"),
      });
      show(t("diagnostics.notificationTestSent"));
    } catch (error) {
      setNotificationStatus({
        ...defaultItem,
        status: "error",
        value:
          error instanceof Error
            ? error.message
            : t("diagnostics.unknownError"),
      });
    } finally {
      setIsTriggeringNotification(false);
    }
  }

  return (
    <Page title={t("diagnostics.title")} subtitle={t("diagnostics.subtitle")}>
      <Card>
        <Section
          title="Release identity"
          subtitle="Runtime metadata and the published release catalog used by What's New."
        >
          <View style={styles.grid}>
            {releaseItems.map((item) => (
              <DiagnosticRow key={item.key} item={item} />
            ))}
          </View>
        </Section>
      </Card>

      {releaseState.whatsNew ? (
        <Card>
          <Section
            title="What's new"
            subtitle={`Changes since ${releaseState.whatsNew.fromVersion ?? "your last visit"}.`}
          >
            <View style={styles.whatsNewList}>
              {releaseState.whatsNew.releases.map((release) => (
                <View key={release.id} style={[styles.whatsNewRelease, { borderColor: colors.border }]}>
                  <Text style={[styles.whatsNewTitle, { color: colors.text }]}>
                    {release.version} · {release.title}
                  </Text>
                  {release.highlights.map((highlight) => (
                    <Text key={highlight} style={[styles.whatsNewHighlight, { color: colors.textSecondary }]}>• {highlight}</Text>
                  ))}
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => releaseState.markCurrentVersionSeen()}
              style={({ pressed }) => [styles.checkButton, { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && styles.pressed]}
            >
              <Text style={[styles.checkButtonText, { color: colors.primaryForeground }]}>Mark as seen</Text>
            </Pressable>
          </Section>
        </Card>
      ) : null}

      <Card>
        <Section
          title={t("diagnostics.configurationTitle")}
          subtitle={t("diagnostics.configurationSubtitle")}
        >
          <View style={styles.grid}>
            {[...staticItems, ...liveItems].map((item) => (
              <DiagnosticRow key={item.key} item={item} />
            ))}
          </View>
          <Pressable
            onPress={() => void runLiveChecks()}
            disabled={isChecking}
            style={({ pressed }) => [
              styles.checkButton,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                opacity: isChecking ? 0.6 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="pulse-outline"
              size={18}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.checkButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {isChecking
                ? t("diagnostics.checking")
                : t("diagnostics.runChecks")}
            </Text>
          </Pressable>
        </Section>
      </Card>

      <Card>
        <Section
          title={t("diagnostics.notificationTest")}
          subtitle={t("diagnostics.notificationTestDescription")}
        >
          <View style={styles.grid}>
            <DiagnosticRow
              item={
                notificationStatus ?? {
                  key: "notificationTest",
                  label: t("diagnostics.notificationTest"),
                  description: t("diagnostics.notificationTestDescription"),
                  status: "warning",
                  value: t("diagnostics.notChecked"),
                }
              }
            />
          </View>
          <Pressable
            onPress={() => void triggerNotificationTest()}
            disabled={isTriggeringNotification}
            style={({ pressed }) => [
              styles.checkButton,
              {
                backgroundColor: colors.primary,
                borderColor: colors.primary,
                opacity: isTriggeringNotification ? 0.6 : 1,
              },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.primaryForeground}
            />
            <Text
              style={[
                styles.checkButtonText,
                { color: colors.primaryForeground },
              ]}
            >
              {isTriggeringNotification
                ? t("diagnostics.triggeringNotification")
                : t("diagnostics.triggerNotification")}
            </Text>
          </Pressable>
        </Section>
      </Card>
    </Page>
  );
}

function DiagnosticRow({ item }: { item: DiagnosticItem }) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const statusColors: Record<DiagnosticStatus, string> = {
    ready: colors.success,
    warning: colors.warning,
    error: colors.destructive,
    checking: colors.primary,
  };

  return (
    <View
      style={[
        styles.row,
        { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
      ]}
    >
      <View style={styles.rowHeader}>
        <View
          style={[styles.dot, { backgroundColor: statusColors[item.status] }]}
        />
        <Text style={[styles.rowTitle, { color: colors.text }]}>
          {item.label}
        </Text>
        <Text style={[styles.status, { color: statusColors[item.status] }]}>
          {t(`diagnostics.status.${item.status}`)}
        </Text>
      </View>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
      {item.value ? (
        <Text style={[styles.value, { color: colors.text }]}>{item.value}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing(3),
  },
  row: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing(3),
    gap: spacing(2),
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  dot: {
    width: spacing(2),
    height: spacing(2),
    borderRadius: radius.full,
  },
  rowTitle: {
    flex: 1,
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.bold,
  },
  status: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
    textTransform: "uppercase",
  },
  description: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  value: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
  },
  checkButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  checkButtonText: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  whatsNewList: {
    gap: spacing(3),
  },
  whatsNewRelease: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing(3),
    gap: spacing(1),
  },
  whatsNewTitle: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.bold as any,
  },
  whatsNewHighlight: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  pressed: {
    opacity: 0.85,
  },
});
