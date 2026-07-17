import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
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
  useAdminFeedback,
  usePlatformAdminAccess,
  useUpdateFeedback,
} from "@/features/feedback";
import { useToast } from "@/providers/ToastProvider";
import { radius } from "@/theme/radius";
import { useResponsiveMetrics } from "@/theme/responsive";
import { spacing } from "@/theme/spacing";
import { typography } from "@/theme/typography";
import { useTheme } from "@/theme/ThemeProvider";

type FeedbackKind = "suggestion" | "bug";
type FeedbackStatus =
  | "new"
  | "triaged"
  | "planned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "withdrawn"
  | "duplicate";
type FeedbackPriority = "low" | "medium" | "high" | "urgent";
type AssignmentFilter = "all" | "mine" | "unassigned";

type AdminFeedbackItem = {
  id: string;
  kind: FeedbackKind;
  title: string;
  description: string;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  reproduction_steps?: string | null;
  frequency?: string | null;
  status: FeedbackStatus;
  priority?: FeedbackPriority | null;
  created_at: string;
  updated_at?: string | null;
  submitter_name?: string | null;
  submitter_email?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
  duplicate_of_id?: string | null;
  resolved_in_release?: string | null;
  attachments?: {
    id?: string;
    name?: string | null;
    url?: string | null;
  }[];
  replies?: {
    id: string;
    body: string;
    created_at: string;
    author_name?: string | null;
    is_internal?: boolean;
  }[];
};

const statuses: FeedbackStatus[] = [
  "new",
  "triaged",
  "planned",
  "in_progress",
  "resolved",
  "closed",
  "duplicate",
];
const priorities: FeedbackPriority[] = ["low", "medium", "high", "urgent"];

export default function AdminFeedbackScreen() {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const responsive = useResponsiveMetrics();
  const { show } = useToast();
  const accessQuery = usePlatformAdminAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FeedbackStatus | "all">("all");
  const [priority, setPriority] = useState<FeedbackPriority | "all">("all");
  const [kind, setKind] = useState<FeedbackKind | "all">("all");
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [response, setResponse] = useState("");
  const [duplicateOfId, setDuplicateOfId] = useState("");
  const [release, setRelease] = useState("");

  const feedbackQuery = useAdminFeedback({
    search,
    status,
    priority,
    kind,
    assignment,
  });
  const updateFeedback = useUpdateFeedback();
  const addReply = useAddFeedbackReply();
  const items = (feedbackQuery.data ?? []) as AdminFeedbackItem[];
  const selected =
    items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  if (accessQuery.isLoading) return null;
  if (!accessQuery.data) return <Redirect href="/(protected)" />;

  async function updateItem(changes: Record<string, string | null>) {
    if (!selected) return;

    try {
      await updateFeedback.mutateAsync({ feedbackId: selected.id, ...changes });
      show(t("adminFeedback.updated"));
    } catch (error) {
      Alert.alert(
        t("adminFeedback.updateErrorTitle"),
        error instanceof Error
          ? error.message
          : t("adminFeedback.updateErrorMessage"),
      );
    }
  }

  async function submitReply(isInternal: boolean) {
    if (!selected) return;
    const body = (isInternal ? internalNote : response).trim();
    if (!body) return;

    try {
      await addReply.mutateAsync({ feedbackId: selected.id, body, isInternal });
      if (isInternal) setInternalNote("");
      else setResponse("");
      show(
        t(
          isInternal ? "adminFeedback.noteAdded" : "adminFeedback.responseSent",
        ),
      );
    } catch (error) {
      Alert.alert(
        t("adminFeedback.replyErrorTitle"),
        error instanceof Error
          ? error.message
          : t("adminFeedback.replyErrorMessage"),
      );
    }
  }

  return (
    <Page
      title={t("adminFeedback.title")}
      subtitle={t("adminFeedback.subtitle")}
    >
      <Card>
        <Section
          title={t("adminFeedback.filtersTitle")}
          subtitle={t("adminFeedback.filtersSubtitle")}
        >
          <View style={styles.filters}>
            <Field
              label={t("adminFeedback.searchLabel")}
              value={search}
              onChangeText={setSearch}
              placeholder={t("adminFeedback.searchPlaceholder")}
              autoCapitalize="none"
              returnKeyType="search"
            />
            <FilterRow label={t("adminFeedback.kindLabel")}>
              {(["all", "suggestion", "bug"] as const).map((value) => (
                <Pill
                  key={value}
                  label={t(
                    value === "all"
                      ? "adminFeedback.all"
                      : `feedback.kind.${value}`,
                  )}
                  active={kind === value}
                  onPress={() => setKind(value)}
                />
              ))}
            </FilterRow>
            <FilterRow label={t("adminFeedback.statusLabel")}>
              <Pill
                label={t("adminFeedback.all")}
                active={status === "all"}
                onPress={() => setStatus("all")}
              />
              {statuses.map((value) => (
                <Pill
                  key={value}
                  label={t(`feedback.status.${value}`)}
                  active={status === value}
                  onPress={() => setStatus(value)}
                />
              ))}
            </FilterRow>
            <FilterRow label={t("adminFeedback.priorityLabel")}>
              <Pill
                label={t("adminFeedback.all")}
                active={priority === "all"}
                onPress={() => setPriority("all")}
              />
              {priorities.map((value) => (
                <Pill
                  key={value}
                  label={t(`adminFeedback.priority.${value}`)}
                  active={priority === value}
                  onPress={() => setPriority(value)}
                />
              ))}
            </FilterRow>
            <FilterRow label={t("adminFeedback.assignmentLabel")}>
              {(["all", "mine", "unassigned"] as AssignmentFilter[]).map(
                (value) => (
                  <Pill
                    key={value}
                    label={t(`adminFeedback.assignment.${value}`)}
                    active={assignment === value}
                    onPress={() => setAssignment(value)}
                  />
                ),
              )}
            </FilterRow>
          </View>
        </Section>
      </Card>

      <View
        style={[
          styles.workspace,
          responsive.isDesktop && styles.workspaceDesktop,
        ]}
      >
        <View
          style={[styles.inbox, responsive.isDesktop && styles.inboxDesktop]}
        >
          <View style={styles.inboxHeading}>
            <Text style={[styles.inboxTitle, { color: colors.text }]}>
              {t("adminFeedback.inboxTitle")}
            </Text>
            <View
              style={[
                styles.countBadge,
                { backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={[styles.countText, { color: colors.primary }]}>
                {items.length}
              </Text>
            </View>
          </View>
          {feedbackQuery.isLoading ? (
            <AdminEmpty
              icon="hourglass-outline"
              title={t("adminFeedback.loading")}
            />
          ) : feedbackQuery.isError ? (
            <AdminEmpty
              icon="cloud-offline-outline"
              title={t("adminFeedback.loadError")}
            />
          ) : items.length === 0 ? (
            <AdminEmpty
              icon="checkmark-done-outline"
              title={t("adminFeedback.emptyTitle")}
              body={t("adminFeedback.emptyBody")}
            />
          ) : (
            <View style={styles.inboxList}>
              {items.map((item) => (
                <InboxRow
                  key={item.id}
                  item={item}
                  active={selected?.id === item.id}
                  onPress={() => setSelectedId(item.id)}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.detailPane}>
          {selected ? (
            <Card>
              <View style={styles.detail}>
                <View style={styles.detailHeader}>
                  <View
                    style={[
                      styles.detailIcon,
                      {
                        backgroundColor:
                          selected.kind === "bug"
                            ? colors.destructiveSoft
                            : colors.primarySoft,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        selected.kind === "bug" ? "bug-outline" : "bulb-outline"
                      }
                      size={22}
                      color={
                        selected.kind === "bug"
                          ? colors.destructive
                          : colors.primary
                      }
                    />
                  </View>
                  <View style={styles.detailHeading}>
                    <Text style={[styles.detailTitle, { color: colors.text }]}>
                      {selected.title}
                    </Text>
                    <Text
                      style={[styles.meta, { color: colors.textSecondary }]}
                    >
                      {selected.submitter_name ||
                        selected.submitter_email ||
                        t("adminFeedback.unknownSubmitter")}{" "}
                      · {new Date(selected.created_at).toLocaleString()}
                    </Text>
                  </View>
                </View>

                <DetailBlock
                  label={t("feedback.fields.description")}
                  value={selected.description}
                />
                {selected.kind === "bug" ? (
                  <View
                    style={[
                      styles.detailGrid,
                      responsive.isPhone && styles.detailGridCompact,
                    ]}
                  >
                    <DetailBlock
                      label={t("feedback.fields.expected")}
                      value={selected.expected_behavior}
                    />
                    <DetailBlock
                      label={t("feedback.fields.actual")}
                      value={selected.actual_behavior}
                    />
                    <DetailBlock
                      label={t("feedback.fields.reproduction")}
                      value={selected.reproduction_steps}
                    />
                    <DetailBlock
                      label={t("feedback.fields.frequency")}
                      value={
                        selected.frequency
                          ? t(`feedback.frequency.${selected.frequency}`)
                          : null
                      }
                    />
                  </View>
                ) : null}

                {(selected.attachments?.length ?? 0) > 0 ? (
                  <View style={styles.fieldGroup}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      {t("adminFeedback.attachments")}
                    </Text>
                    <View style={styles.attachmentList}>
                      {selected.attachments?.map((attachment, index) => (
                        <View
                          key={attachment.id ?? `${attachment.name}:${index}`}
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
                            {attachment.name ||
                              t("adminFeedback.screenshotNumber", {
                                number: index + 1,
                              })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.controlGrid,
                    responsive.isPhone && styles.controlGridCompact,
                  ]}
                >
                  <FilterRow label={t("adminFeedback.statusLabel")}>
                    {statuses.map((value) => (
                      <Pill
                        key={value}
                        label={t(`feedback.status.${value}`)}
                        active={selected.status === value}
                        onPress={() => void updateItem({ status: value })}
                      />
                    ))}
                  </FilterRow>
                  <FilterRow label={t("adminFeedback.priorityLabel")}>
                    {priorities.map((value) => (
                      <Pill
                        key={value}
                        label={t(`adminFeedback.priority.${value}`)}
                        active={selected.priority === value}
                        onPress={() => void updateItem({ priority: value })}
                      />
                    ))}
                  </FilterRow>
                </View>

                <View
                  style={[
                    styles.actionPanel,
                    {
                      backgroundColor: colors.surfaceMuted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.panelTitle, { color: colors.text }]}>
                    {t("adminFeedback.assignmentTitle")}
                  </Text>
                  <Text style={[styles.help, { color: colors.textSecondary }]}>
                    {t("adminFeedback.currentAssignee", {
                      name:
                        selected.assignee_name || t("adminFeedback.unassigned"),
                    })}
                  </Text>
                  <Field
                    label={t("adminFeedback.assigneeId")}
                    value={assigneeId}
                    onChangeText={setAssigneeId}
                    placeholder={t("adminFeedback.assigneePlaceholder")}
                    autoCapitalize="none"
                  />
                  <View style={styles.actions}>
                    <Button
                      label={t("adminFeedback.assign")}
                      onPress={() =>
                        void updateItem({ assigneeId: assigneeId.trim() })
                      }
                      disabled={!assigneeId.trim() || updateFeedback.isPending}
                    />
                    <Button
                      label={t("adminFeedback.unassign")}
                      variant="secondary"
                      onPress={() => void updateItem({ assigneeId: null })}
                      disabled={
                        !selected.assignee_id || updateFeedback.isPending
                      }
                    />
                  </View>
                </View>

                <View
                  style={[
                    styles.conversationGrid,
                    !responsive.isPhone && styles.panelGridWide,
                  ]}
                >
                  <View
                    style={[
                      styles.actionPanel,
                      {
                        backgroundColor: colors.warningSoft,
                        borderColor: colors.warning,
                      },
                    ]}
                  >
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                      {t("adminFeedback.internalNoteTitle")}
                    </Text>
                    <Text
                      style={[styles.help, { color: colors.textSecondary }]}
                    >
                      {t("adminFeedback.internalNoteHelp")}
                    </Text>
                    <Field
                      label={t("adminFeedback.internalNoteLabel")}
                      value={internalNote}
                      onChangeText={setInternalNote}
                      placeholder={t("adminFeedback.internalNotePlaceholder")}
                      multiline
                      textAlignVertical="top"
                      style={styles.textarea}
                    />
                    <Button
                      label={
                        addReply.isPending
                          ? t("adminFeedback.saving")
                          : t("adminFeedback.addNote")
                      }
                      onPress={() => void submitReply(true)}
                      disabled={!internalNote.trim() || addReply.isPending}
                    />
                  </View>
                  <View
                    style={[
                      styles.actionPanel,
                      {
                        backgroundColor: colors.primarySoft,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                      {t("adminFeedback.responseTitle")}
                    </Text>
                    <Text
                      style={[styles.help, { color: colors.textSecondary }]}
                    >
                      {t("adminFeedback.responseHelp")}
                    </Text>
                    <Field
                      label={t("adminFeedback.responseLabel")}
                      value={response}
                      onChangeText={setResponse}
                      placeholder={t("adminFeedback.responsePlaceholder")}
                      multiline
                      textAlignVertical="top"
                      style={styles.textarea}
                    />
                    <Button
                      label={
                        addReply.isPending
                          ? t("adminFeedback.sending")
                          : t("adminFeedback.sendResponse")
                      }
                      onPress={() => void submitReply(false)}
                      disabled={!response.trim() || addReply.isPending}
                    />
                  </View>
                </View>

                {(selected.replies?.length ?? 0) > 0 ? (
                  <View style={styles.fieldGroup}>
                    <Text
                      style={[styles.label, { color: colors.textSecondary }]}
                    >
                      {t("adminFeedback.activityTitle")}
                    </Text>
                    <View style={styles.activityList}>
                      {selected.replies?.map((entry) => (
                        <View
                          key={entry.id}
                          style={[
                            styles.activityRow,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name={
                              entry.is_internal
                                ? "lock-closed-outline"
                                : "chatbubble-outline"
                            }
                            size={16}
                            color={
                              entry.is_internal
                                ? colors.warning
                                : colors.primary
                            }
                          />
                          <View style={styles.activityBody}>
                            <Text
                              style={[
                                styles.activityMeta,
                                { color: colors.text },
                              ]}
                            >
                              {entry.author_name || t("feedback.supportTeam")} ·{" "}
                              {entry.is_internal
                                ? t("adminFeedback.internal")
                                : t("adminFeedback.public")}
                            </Text>
                            <Text
                              style={[
                                styles.help,
                                { color: colors.textSecondary },
                              ]}
                            >
                              {entry.body}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View
                  style={[
                    styles.finalControls,
                    !responsive.isPhone && styles.panelGridWide,
                  ]}
                >
                  <View
                    style={[
                      styles.actionPanel,
                      {
                        backgroundColor: colors.surfaceMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                      {t("adminFeedback.duplicateTitle")}
                    </Text>
                    <Field
                      label={t("adminFeedback.duplicateId")}
                      value={duplicateOfId}
                      onChangeText={setDuplicateOfId}
                      placeholder={t("adminFeedback.duplicatePlaceholder")}
                      autoCapitalize="none"
                    />
                    <Button
                      label={t("adminFeedback.markDuplicate")}
                      variant="secondary"
                      onPress={() =>
                        void updateItem({
                          status: "duplicate",
                          duplicateOfId: duplicateOfId.trim(),
                        })
                      }
                      disabled={
                        !duplicateOfId.trim() || updateFeedback.isPending
                      }
                    />
                  </View>
                  <View
                    style={[
                      styles.actionPanel,
                      {
                        backgroundColor: colors.financialPositiveSoft,
                        borderColor: colors.financialPositive,
                      },
                    ]}
                  >
                    <Text style={[styles.panelTitle, { color: colors.text }]}>
                      {t("adminFeedback.resolveTitle")}
                    </Text>
                    <Field
                      label={t("adminFeedback.releaseLabel")}
                      value={release}
                      onChangeText={setRelease}
                      placeholder={t("adminFeedback.releasePlaceholder")}
                      autoCapitalize="none"
                    />
                    <Button
                      label={t("adminFeedback.resolve")}
                      onPress={() =>
                        void updateItem({
                          status: "resolved",
                          resolvedInRelease: release.trim(),
                        })
                      }
                      disabled={!release.trim() || updateFeedback.isPending}
                    />
                  </View>
                </View>
              </View>
            </Card>
          ) : (
            <AdminEmpty
              icon="file-tray-outline"
              title={t("adminFeedback.selectTitle")}
              body={t("adminFeedback.selectBody")}
            />
          )}
        </View>
      </View>
    </Page>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.pills}>{children}</View>
    </View>
  );
}

function InboxRow({
  item,
  active,
  onPress,
}: {
  item: AdminFeedbackItem;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  const priorityColor =
    item.priority === "urgent"
      ? colors.destructive
      : item.priority === "high"
        ? colors.warning
        : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inboxRow,
        {
          backgroundColor: active ? colors.primarySoft : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.inboxRowTop}>
        <Ionicons
          name={item.kind === "bug" ? "bug-outline" : "bulb-outline"}
          size={17}
          color={item.kind === "bug" ? colors.destructive : colors.primary}
        />
        <Text
          style={[styles.rowTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <View
          style={[styles.priorityDot, { backgroundColor: priorityColor }]}
        />
      </View>
      <Text
        style={[styles.preview, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {item.description}
      </Text>
      <View style={styles.rowFooter}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {t(`feedback.status.${item.status}`)}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const { t } = useTranslation("common");
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.detailBlock,
        { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>
        {value || t("adminFeedback.notProvided")}
      </Text>
    </View>
  );
}

function AdminEmpty({
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
        styles.empty,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {body ? (
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          {body}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { gap: spacing(3.5) },
  fieldGroup: { gap: spacing(2) },
  label: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  workspace: { gap: spacing(4), alignItems: "flex-start" },
  workspaceDesktop: { flexDirection: "row" },
  inbox: { width: "100%", gap: spacing(3) },
  inboxDesktop: { width: 360, flexShrink: 0 },
  inboxHeading: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  inboxTitle: {
    fontSize: typography.fontSize[18],
    fontWeight: typography.fontWeight.extraBold,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: spacing(2),
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.extraBold,
  },
  inboxList: { gap: spacing(2) },
  inboxRow: {
    padding: spacing(3),
    borderWidth: 1,
    borderRadius: radius.lg,
    gap: spacing(2),
  },
  inboxRowTop: { flexDirection: "row", alignItems: "center", gap: spacing(2) },
  rowTitle: {
    flex: 1,
    fontSize: typography.fontSize[14],
    fontWeight: typography.fontWeight.bold,
  },
  priorityDot: { width: 8, height: 8, borderRadius: radius.full },
  preview: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  rowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing(2),
  },
  meta: { fontSize: typography.fontSize[12] },
  detailPane: { flex: 1, width: "100%", minWidth: 0 },
  detail: { gap: spacing(4) },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(3),
  },
  detailIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  detailHeading: { flex: 1, minWidth: 0, gap: spacing(1) },
  detailTitle: {
    fontSize: typography.fontSize[20],
    lineHeight: typography.lineHeight[28],
    fontWeight: typography.fontWeight.extraBold,
  },
  detailBlock: {
    flex: 1,
    minWidth: 0,
    padding: spacing(3),
    borderWidth: 1,
    borderRadius: radius.lg,
    gap: spacing(1.5),
  },
  detailValue: {
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing(3) },
  detailGridCompact: { flexDirection: "column" },
  attachmentList: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  attachment: {
    maxWidth: 260,
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing(2),
  },
  attachmentName: {
    flexShrink: 1,
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.semibold,
  },
  controlGrid: { gap: spacing(4) },
  controlGridCompact: { gap: spacing(3) },
  actionPanel: {
    flex: 1,
    minWidth: 0,
    padding: spacing(3),
    borderWidth: 1,
    borderRadius: radius.lg,
    gap: spacing(2.5),
    alignItems: "flex-start",
  },
  panelTitle: {
    fontSize: typography.fontSize[15],
    fontWeight: typography.fontWeight.extraBold,
  },
  help: {
    fontSize: typography.fontSize[12],
    lineHeight: typography.lineHeight[17],
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing(2) },
  conversationGrid: { gap: spacing(3) },
  panelGridWide: { flexDirection: "row", alignItems: "stretch" },
  textarea: { minHeight: 92, width: "100%" },
  activityList: { gap: spacing(2) },
  activityRow: {
    paddingBottom: spacing(2),
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing(2),
  },
  activityBody: { flex: 1, gap: spacing(1) },
  activityMeta: {
    fontSize: typography.fontSize[12],
    fontWeight: typography.fontWeight.bold,
  },
  finalControls: { gap: spacing(3) },
  empty: {
    width: "100%",
    minHeight: 180,
    padding: spacing(6),
    borderWidth: 1,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing(2),
  },
  emptyTitle: {
    fontSize: typography.fontSize[16],
    fontWeight: typography.fontWeight.extraBold,
    textAlign: "center",
  },
  emptyBody: {
    maxWidth: 380,
    fontSize: typography.fontSize[13],
    lineHeight: typography.lineHeight[18],
    textAlign: "center",
  },
  pressed: { opacity: 0.84 },
});
