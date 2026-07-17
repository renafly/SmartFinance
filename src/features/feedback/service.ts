import * as Crypto from "expo-crypto";
import type { DocumentPickerAsset } from "expo-document-picker";
import { supabase } from "@/shared/lib/supabase/client";

export type FeedbackUiItem = {
  id: string;
  kind: "suggestion" | "bug";
  title: string;
  description: string;
  status: string;
  priority: string;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  reproduction_steps?: string | null;
  frequency?: string | null;
  assignee_id?: string | null;
  duplicate_of_id?: string | null;
  created_at: string;
  updated_at: string;
  resolved_in_release?: string | null;
  replies: Array<{ id: string; body: string; created_at: string; author_name?: string | null; is_internal?: boolean }>;
};

type FeedbackInput = {
  kind: "suggestion" | "bug";
  title: string;
  description: string;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  reproductionSteps?: string | null;
  frequency?: string | null;
  screenshots?: DocumentPickerAsset[];
};

const id = () => Crypto.randomUUID();
const categoryFor = (kind: FeedbackInput["kind"]) => kind === "bug" ? "bug" : "feature";
const uiStatus = (status: string) => status === "submitted" ? "new" : status;

function mapFeedback(row: any, messages: any[] = []): FeedbackUiItem {
  const context = row.app_context && typeof row.app_context === "object" ? row.app_context : {};
  return {
    id: row.id,
    kind: row.category === "bug" ? "bug" : "suggestion",
    title: row.title,
    description: row.description,
    status: uiStatus(row.status),
    priority: row.priority === "normal" ? "medium" : row.priority,
    expected_behavior: context.expectedBehavior ?? null,
    actual_behavior: context.actualBehavior ?? null,
    reproduction_steps: context.reproductionSteps ?? null,
    frequency: context.frequency ?? null,
    assignee_id: row.assigned_to ?? null,
    duplicate_of_id: context.duplicateOfId ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_in_release: row.resolved_in_release_id ?? null,
    replies: messages
      .filter((message) => message.message_type === "reply")
      .map((message) => ({ id: message.id, body: message.body, created_at: message.created_at, is_internal: false })),
  };
}

export async function listMyFeedback(): Promise<FeedbackUiItem[]> {
  const { data, error } = await (supabase as any).from("app_feedback").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const ids = rows.map((row: any) => row.id);
  const { data: messages, error: messageError } = await (supabase as any)
    .from("feedback_messages").select("*").in("feedback_id", ids).order("created_at", { ascending: true });
  if (messageError) throw messageError;
  return rows.map((row: any) => mapFeedback(row, (messages ?? []).filter((m: any) => m.feedback_id === row.id)));
}

export async function listAdminFeedback(): Promise<FeedbackUiItem[]> {
  const { data, error } = await (supabase as any).from("app_feedback").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapFeedback(row));
}

export async function createFeedback(input: FeedbackInput) {
  const submissionKey = id();
  const context = {
    expectedBehavior: input.expectedBehavior?.trim() || undefined,
    actualBehavior: input.actualBehavior?.trim() || undefined,
    reproductionSteps: input.reproductionSteps?.trim() || undefined,
    frequency: input.frequency || undefined,
  };
  const { data, error } = await (supabase as any).rpc("submit_app_feedback", {
    p_idempotency_key: submissionKey,
    p_category: categoryFor(input.kind),
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_app_version: null,
    p_platform: null,
    p_context: context,
  });
  if (error) throw error;
  const feedback = data;
  for (const asset of input.screenshots ?? []) {
    if (asset.size && asset.size > 10 * 1024 * 1024) throw new Error("Screenshot exceeds the 10 MB limit.");
    const bytes = asset.file ? asset.file : await (await fetch(asset.uri)).arrayBuffer();
    const fileName = asset.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "screenshot";
    const path = `${feedback.user_id}/${feedback.id}/${id()}-${fileName}`;
    const upload = await supabase.storage.from("feedback-screenshots").upload(path, bytes, { contentType: asset.mimeType ?? "image/png", upsert: false });
    if (upload.error) throw upload.error;
    const registered = await (supabase as any).rpc("register_feedback_attachment", {
      p_feedback_id: feedback.id,
      p_idempotency_key: id(),
      p_storage_path: path,
      p_original_filename: fileName,
      p_mime_type: asset.mimeType ?? "image/png",
      p_size_bytes: asset.size ?? (bytes instanceof ArrayBuffer ? bytes.byteLength : bytes.size),
      p_width: null,
      p_height: null,
    });
    if (registered.error) throw registered.error;
  }
  return feedback;
}

export async function withdrawFeedback(feedbackId: string) {
  const { data, error } = await (supabase as any).rpc("withdraw_app_feedback", { p_feedback_id: feedbackId, p_idempotency_key: id(), p_reason: null });
  if (error) throw error;
  return data;
}

export async function addFeedbackReply(feedbackId: string, body: string, isInternal = false) {
  const { data, error } = await (supabase as any).rpc("add_feedback_reply", { p_feedback_id: feedbackId, p_idempotency_key: id(), p_body: body.trim(), p_internal: isInternal });
  if (error) throw error;
  return data;
}

export async function updateAdminFeedback(feedbackId: string, input: { status?: string; priority?: string; assignedAdminId?: string | null; assigneeId?: string | null; resolvedReleaseId?: string | null; resolvedInRelease?: string | null; duplicateOfId?: string | null }) {
  const status = input.status === "new" ? "submitted" : input.status === "planned" ? "triaged" : input.status === "closed" || input.status === "duplicate" ? "rejected" : input.status;
  const priority = input.priority === "medium" ? "normal" : input.priority;
  const { data, error } = await (supabase as any).rpc("admin_update_app_feedback", {
    p_feedback_id: feedbackId,
    p_idempotency_key: id(),
    p_status: status ?? null,
    p_priority: priority ?? null,
    p_assigned_admin_id: input.assignedAdminId ?? input.assigneeId ?? null,
    p_clear_assignment: (input.assignedAdminId ?? input.assigneeId) === null,
    p_resolved_in_release_id: input.resolvedReleaseId ?? null,
    p_clear_release: (input.resolvedReleaseId ?? input.resolvedInRelease) === null,
  });
  if (error) throw error;
  return data;
}
