import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  Button,
  Card,
  Field,
  Page,
  Pill,
  Section,
} from "@/components/migrated-page";
import {
  useAddFeedbackReply,
  useCreateFeedback,
  useMyFeedback,
  useWithdrawFeedback,
} from "@/features/feedback";
import { useToast } from "@/providers/ToastProvider";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

type FeedbackKind = "suggestion" | "bug";
type FeedbackFrequency = "once" | "sometimes" | "often" | "always";
type FeedbackStatus =
  | "new"
  | "triaged"
  | "planned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "withdrawn"
  | "duplicate";

type FeedbackReply = {
  id: string;
  body: string;
  created_at: string;
  author_name?: string | null;
  is_internal?: boolean;
};

type FeedbackItem = {
  id: string;
  kind: FeedbackKind;
  title: string;
  description: string;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  reproduction_steps?: string | null;
  frequency?: FeedbackFrequency | null;
  status: FeedbackStatus;
  priority?: "low" | "medium" | "high" | "urgent" | null;
  created_at: string;
  updated_at?: string | null;
  resolved_in_release?: string | null;
  duplicate_of_id?: string | null;
  replies?: FeedbackReply[];
  attachments?: {
    id?: string;
    name?: string | null;
    url?: string | null;
  }[];
};

const frequencies: FeedbackFrequency[] = [
  "once",
  "sometimes",
  "often",
  "always",
];
const terminalStatuses: FeedbackStatus[] = ["closed", "withdrawn", "duplicate"];

export default function FeedbackScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { show } = useToast();
  const feedbackQuery = useMyFeedback();
  const createFeedback = useCreateFeedback();
  const withdrawFeedback = useWithdrawFeedback();
  const addReply = useAddFeedbackReply();
  const [kind, setKind] = useState<FeedbackKind>("suggestion");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expectedBehavior, setExpectedBehavior] = useState("");
  const [actualBehavior, setActualBehavior] = useState("");
  const [reproductionSteps, setReproductionSteps] = useState("");
  const [frequency, setFrequency] = useState<FeedbackFrequency>("sometimes");
  const [screenshots, setScreenshots] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const items = (feedbackQuery.data ?? []) as FeedbackItem[];
  const canSubmit =
    title.trim().length >= 4 &&
    description.trim().length >= 10 &&
    (kind === "suggestion" ||
      (actualBehavior.trim().length > 0 &&
        reproductionSteps.trim().length > 0));

  async function pickScreenshots() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "image/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setScreenshots((current) => {
        const known = new Set(
          current.map((asset) => `${asset.uri}:${asset.name}`),
        );
        const additions = result.assets.filter(
          (asset) => !known.has(`${asset.uri}:${asset.name}`),
        );
        return [...current, ...additions].slice(0, 5);
      });
    } catch (error) {
      Alert.alert(
        t("feedback.screenshotErrorTitle"),
        error instanceof Error
          ? error.message
          : t("feedback.screenshotErrorMessage"),
      );
    }
  }

  async function submitFeedback() {
    if (!canSubmit) return;

    try {
      await createFeedback.mutateAsync({
        kind,
        title: title.trim(),
        description: description.trim(),
        expectedBehavior: expectedBehavior.trim() || null,
        actualBehavior: actualBehavior.trim() || null,
        reproductionSteps: reproductionSteps.trim() || null,
        frequency: kind === "bug" ? frequency : null,
        screenshots,
      });
      setTitle("");
      setDescription("");
      setExpectedBehavior("");
      setActualBehavior("");
      setReproductionSteps("");
      setFrequency("sometimes");
      setScreenshots([]);
      show(t("feedback.submitted"));
    } catch (error) {
      Alert.alert(
        t("feedback.submitErrorTitle"),
        error instanceof Error
          ? error.message
          : t("feedback.submitErrorMessage"),
      );
    }
  }

  async function sendReply(feedbackId: string) {
    const body = replyDrafts[feedbackId]?.trim();
    if (!body) return;

    try {
      await addReply.mutateAsync({ feedbackId, body, isInternal: false });
      setReplyDrafts((current) => ({ ...current, [feedbackId]: "" }));
      show(t("feedback.replySent"));
    } catch (error) {
      Alert.alert(
        t("feedback.replyErrorTitle"),
        error instanceof Error
          ? error.message
          : t("feedback.replyErrorMessage"),
      );
    }
  }

  function confirmWithdraw(item: FeedbackItem) {
    const run = async () => {
      try {
        await withdrawFeedback.mutateAsync(item.id);
        show(t("feedback.withdrawn"));
      } catch (error) {
        Alert.alert(
          t("feedback.withdrawErrorTitle"),
          error instanceof Error
            ? error.message
            : t("feedback.withdrawErrorMessage"),
        );
      }
    };

    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined"
          ? window.confirm(t("feedback.withdrawMessage", { title: item.title }))
          : false;
      if (confirmed) void run();
      return;
    }

    Alert.alert(
      t("feedback.withdrawTitle"),
      t("feedback.withdrawMessage", { title: item.title }),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("feedback.withdraw"),
          style: "destructive",
          onPress: () => void run(),
        },
      ],
    );
  }

  return (
    <Page title={t("feedback.title")} subtitle={t("feedback.subtitle")}>
      <View
        style={[styles.workspace, !responsive.isPhone && styles.workspaceWide]}
      >
        <View
          style={[
            styles.composerColumn,
            !responsive.isPhone && styles.composerColumnWide,
          ]}
        >
          <Card>
            <Section
              title={t("feedback.newTitle")}
              subtitle={t("feedback.newSubtitle")}
            >
              <View style={styles.form}>
                <View style={styles.kindRow}>
                  <TypeCard
                    icon="bulb-outline"
                    title={t("feedback.kind.suggestion")}
                    description={t("feedback.kind.suggestionDescription")}
                    active={kind === "suggestion"}
                    onPress={() => setKind("suggestion")}
                  />
                  <TypeCard
                    icon="bug-outline"
                    title={t("feedback.kind.bug")}
                    description={t("feedback.kind.bugDescription")}
                    active={kind === "bug"}
                    onPress={() => setKind("bug")}
                  />
                </View>

                <Field
                  label={t("feedback.fields.title")}
                  value={title}
                  onChangeText={setTitle}
                  placeholder={t("feedback.fields.titlePlaceholder")}
                  maxLength={120}
                />
                <Field
                  label={t("feedback.fields.description")}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={
                    kind === "bug"
                      ? t("feedback.fields.bugDescriptionPlaceholder")
                      : t("feedback.fields.suggestionDescriptionPlaceholder")
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={styles.multiline}
                />

                {kind === "bug" ? (
                  <View style={styles.bugFields}>
                    <View
                      style={[
                        styles.twoColumn,
                        responsive.isPhone && styles.oneColumn,
                      ]}
                    >
                      <Field
                        label={t("feedback.fields.expected")}
                        value={expectedBehavior}
                        onChangeText={setExpectedBehavior}
                        placeholder={t("feedback.fields.expectedPlaceholder")}
                        multiline
                        textAlignVertical="top"
                        style={styles.multilineSmall}
                      />
                      <Field
                        label={t("feedback.fields.actual")}
                        value={actualBehavior}
                        onChangeText={setActualBehavior}
                        placeholder={t("feedback.fields.actualPlaceholder")}
                        multiline
                        textAlignVertical="top"
                        style={styles.multilineSmall}
                      />
                    </View>
                    <Field
                      label={t("feedback.fields.reproduction")}
                      value={reproductionSteps}
                      onChangeText={setReproductionSteps}
                      placeholder={t("feedback.fields.reproductionPlaceholder")}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={styles.multiline}
                    />
                    <View style={styles.fieldGroup}>
                      <Text
                        style={[
                          styles.fieldLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {t("feedback.fields.frequency")}
                      </Text>
                      <View style={styles.pillRow}>
                        {frequencies.map((value) => (
                          <Pill
                            key={value}
                            label={t(`feedback.frequency.${value}`)}
                            active={frequency === value}
                            onPress={() => setFrequency(value)}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.uploadZone,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="images-outline"
                    size={24}
                    color={colors.primary}
                  />
                  <View style={styles.uploadCopy}>
                    <Text style={[styles.uploadTitle, { color: colors.text }]}>
                      {t("feedback.screenshotsTitle")}
                    </Text>
                    <Text
                      style={[styles.helpText, { color: colors.textSecondary }]}
                    >
                      {t("feedback.screenshotsHelp")}
                    </Text>
                  </View>
                  <Button
                    label={t("feedback.addScreenshots")}
                    variant="secondary"
                    onPress={() => void pickScreenshots()}
                  />
                </View>

                {screenshots.length > 0 ? (
                  <View style={styles.attachmentList}>
                    {screenshots.map((asset) => (
                      <View
                        key={`${asset.uri}:${asset.name}`}
                        style={[
                          styles.attachment,
                          { borderColor: colors.border },
                        ]}
                      >
                        <Ionicons
                          name="image-outline"
                          size={16}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.attachmentName,
                            { color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {asset.name}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("feedback.removeScreenshot", {
                            name: asset.name,
                          })}
                          onPress={() =>
                            setScreenshots((current) =>
                              current.filter((item) => item.uri !== asset.uri),
                            )
                          }
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                <View style={styles.submitRow}>
                  <Text
                    style={[styles.helpText, { color: colors.textSecondary }]}
                  >
                    {t("feedback.privacyNote")}
                  </Text>
                  <Button
                    label={
                      createFeedback.isPending
                        ? t("feedback.submitting")
                        : t("feedback.submit")
                    }
                    onPress={() => void submitFeedback()}
                    disabled={!canSubmit || createFeedback.isPending}
                  />
                </View>
              </View>
            </Section>
          </Card>
        </View>

        <View style={styles.timelineColumn}>
          <Section
            title={t("feedback.timelineTitle")}
            subtitle={t("feedback.timelineSubtitle")}
          >
            <View style={styles.timeline}>
              {feedbackQuery.isLoading ? (
                <EmptyState
                  icon="hourglass-outline"
                  title={t("feedback.loading")}
                />
              ) : feedbackQuery.isError ? (
                <EmptyState
                  icon="cloud-offline-outline"
                  title={t("feedback.loadError")}
                />
              ) : items.length === 0 ? (
                <EmptyState
                  icon="chatbubbles-outline"
                  title={t("feedback.emptyTitle")}
                  body={t("feedback.emptyBody")}
                />
              ) : (
                items.map((item) => (
                  <FeedbackTimelineCard
                    key={item.id}
                    item={item}
                    reply={replyDrafts[item.id] ?? ""}
                    onReplyChange={(value) =>
                      setReplyDrafts((current) => ({
                        ...current,
                        [item.id]: value,
                      }))
                    }
                    onSendReply={() => void sendReply(item.id)}
                    onWithdraw={() => confirmWithdraw(item)}
                    replyPending={addReply.isPending}
                  />
                ))
              )}
            </View>
          </Section>
        </View>
      </View>
    </Page>
  );
}

function TypeCard({
  icon,
  title,
  description,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.typeCard,
        {
          backgroundColor: active ? colors.primarySoft : colors.surfaceMuted,
          borderColor: active ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.typeIcon,
          { backgroundColor: active ? colors.primary : colors.surface },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={active ? colors.primaryForeground : colors.primary}
        />
      </View>
      <View style={styles.typeCopy}>
        <Text style={[styles.typeTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.helpText, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <Ionicons
        name={active ? "checkmark-circle" : "ellipse-outline"}
        size={20}
        color={active ? colors.primary : colors.textSecondary}
      />
    </Pressable>
  );
}

function FeedbackTimelineCard({
  item,
  reply,
  onReplyChange,
  onSendReply,
  onWithdraw,
  replyPending,
}: {
  item: FeedbackItem;
  reply: string;
  onReplyChange: (value: string) => void;
  onSendReply: () => void;
  onWithdraw: () => void;
  replyPending: boolean;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const replies = (item.replies ?? []).filter((entry) => !entry.is_internal);
  const canInteract = !terminalStatuses.includes(item.status);
  const statusColor = getStatusColor(item.status, colors);

  return (
    <Card>
      <View style={styles.timelineCard}>
        <View style={styles.timelineHeader}>
          <View
            style={[
              styles.timelineIcon,
              {
                backgroundColor:
                  item.kind === "bug"
                    ? colors.destructiveSoft
                    : colors.primarySoft,
              },
            ]}
          >
            <Ionicons
              name={item.kind === "bug" ? "bug-outline" : "bulb-outline"}
              size={18}
              color={item.kind === "bug" ? colors.destructive : colors.primary}
            />
          </View>
          <View style={styles.timelineHeading}>
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
              {t(`feedback.kind.${item.kind}`)} ·{" "}
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}18`, borderColor: statusColor },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`feedback.status.${item.status}`)}
            </Text>
          </View>
        </View>

        <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>

        {item.resolved_in_release ? (
          <View
            style={[
              styles.releaseCallout,
              {
                backgroundColor: colors.financialPositiveSoft,
                borderColor: colors.financialPositive,
              },
            ]}
          >
            <Ionicons
              name="rocket-outline"
              size={17}
              color={colors.financialPositive}
            />
            <Text
              style={[styles.releaseText, { color: colors.financialPositive }]}
            >
              {t("feedback.resolvedInRelease", {
                release: item.resolved_in_release,
              })}
            </Text>
          </View>
        ) : null}

        {replies.length > 0 ? (
          <View style={styles.replyTimeline}>
            {replies.map((entry) => (
              <View
                key={entry.id}
                style={[styles.reply, { borderColor: colors.border }]}
              >
                <View style={styles.replyHeader}>
                  <Text style={[styles.replyAuthor, { color: colors.text }]}>
                    {entry.author_name || t("feedback.supportTeam")}
                  </Text>
                  <Text
                    style={[styles.replyDate, { color: colors.textSecondary }]}
                  >
                    {new Date(entry.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[styles.replyBody, { color: colors.textSecondary }]}
                >
                  {entry.body}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {canInteract ? (
          <View style={styles.replyComposer}>
            <Field
              label={t("feedback.replyLabel")}
              value={reply}
              onChangeText={onReplyChange}
              placeholder={t("feedback.replyPlaceholder")}
              multiline
              textAlignVertical="top"
              style={styles.replyInput}
            />
            <View style={styles.cardActions}>
              <Button
                label={t("feedback.withdraw")}
                variant="danger"
                onPress={onWithdraw}
              />
              <Button
                label={
                  replyPending
                    ? t("feedback.sendingReply")
                    : t("feedback.sendReply")
                }
                onPress={onSendReply}
                disabled={!reply.trim() || replyPending}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.emptyState,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {body ? (
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

function getStatusColor(
  status: FeedbackStatus,
  colors: ReturnType<typeof useTheme>["colors"],
) {
  if (status === "resolved") return colors.success;
  if (status === "closed" || status === "withdrawn")
    return colors.textSecondary;
  if (status === "duplicate") return colors.warning;
  if (status === "in_progress") return colors.info;
  if (status === "planned") return colors.financialGoal;
  return colors.primary;
}

const styles = StyleSheet.create({
  workspace: { gap: spacing(5) },
  workspaceWide: { flexDirection: "row", alignItems: "flex-start" },
  composerColumn: { width: "100%" },
  composerColumnWide: { flex: 1.1, minWidth: 0 },
  timelineColumn: { flex: 0.9, minWidth: 0, gap: spacing(3) },
  form: { gap: spacing(4) },
  kindRow: { gap: spacing(2.5) },
  typeCard: {
    minHeight: 78,
    padding: spacing(3),
    borderWidth: 1,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(3),
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  typeCopy: { flex: 1, gap: spacing(1) },
  typeTitle: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.bold,
  },
  helpText: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  multiline: { minHeight: 104 },
  multilineSmall: { minHeight: 86 },
  bugFields: { gap: spacing(4) },
  twoColumn: { flexDirection: "row", gap: spacing(3) },
  oneColumn: { flexDirection: "column" },
  fieldGroup: { gap: spacing(2) },
  fieldLabel: {
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  uploadZone: {
    padding: spacing(3.5),
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing(3),
  },
  uploadCopy: { flex: 1, minWidth: 180, gap: spacing(1) },
  uploadTitle: {
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  attachmentList: { gap: spacing(2) },
  attachment: {
    minHeight: 42,
    paddingHorizontal: spacing(3),
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  attachmentName: {
    flex: 1,
    fontSize: typography.fontSize[13],
    fontWeight: typography.fontWeight.semibold,
  },
  submitRow: { gap: spacing(3), alignItems: "flex-start" },
  timeline: { gap: spacing(3) },
  timelineCard: { gap: spacing(3) },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2.5),
  },
  timelineIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineHeading: { flex: 1, minWidth: 0, gap: spacing(0.75) },
  itemTitle: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold,
  },
  itemMeta: { fontSize: typography.fontSize[12] },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  statusText: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
    textTransform: "uppercase",
  },
  itemDescription: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  releaseCallout: {
    padding: spacing(2.5),
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  releaseText: {
    flex: 1,
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
  },
  replyTimeline: { gap: spacing(2) },
  reply: { borderLeftWidth: 2, paddingLeft: spacing(3), gap: spacing(1.5) },
  replyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  replyAuthor: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
  },
  replyDate: { fontSize: typography.fontSize[12] },
  replyBody: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  replyComposer: { gap: spacing(2.5) },
  replyInput: { minHeight: 72 },
  cardActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: spacing(2),
  },
  emptyState: {
    padding: spacing(6),
    borderWidth: 1,
    borderRadius: radius.xl,
    alignItems: "center",
    gap: spacing(2),
    textAlign: "center",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold,
    textAlign: "center",
  },
  emptyBody: {
    maxWidth: 420,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
    textAlign: "center",
  },
  pressed: { opacity: 0.84 },
});
