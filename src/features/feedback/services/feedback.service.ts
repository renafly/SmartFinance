import * as Crypto from "expo-crypto";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "@/shared/lib/supabase/client";
import type { Database } from "@/types/database.types";
import {
  FEEDBACK_ATTACHMENT_BUCKET,
  MAX_FEEDBACK_ATTACHMENT_BYTES,
  appContextToJson,
  sanitizeAttachmentFileName,
  validateFeedbackAttachment,
  validateFeedbackMessage,
  validateFeedbackSubmission,
  type AdminFeedbackFilters,
  type AdminFeedbackPage,
  type AppRelease,
  type AppReleasePlatform,
  type Feedback,
  type FeedbackAttachment,
  type FeedbackAttachmentInput,
  type FeedbackDetail,
  type FeedbackMessage,
  type FeedbackPriority,
  type FeedbackStatus,
  type FeedbackSubmission,
  type FeedbackSubmissionResult,
} from "../types";

type UploadBody = ArrayBuffer | File;

type FeedbackServiceDependencies = {
  createId: () => string;
  readAsset: (asset: FeedbackAttachmentInput) => Promise<UploadBody>;
};

export type UploadFeedbackAttachmentInput = {
  feedbackId: string;
  asset: FeedbackAttachmentInput;
  messageId?: string | null;
  storageKey?: string;
};

const defaultDependencies: FeedbackServiceDependencies = {
  createId: Crypto.randomUUID,
  async readAsset(asset) {
    if (asset.file) return asset.file;
    const response = await fetch(asset.uri);
    if (!response.ok) {
      throw new Error(`Unable to read feedback attachment (${response.status}).`);
    }
    return response.arrayBuffer();
  },
};

function throwIfError(error: Error | null) {
  if (error) throw error;
}

function stableStorageKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 100) || "upload";
}

function boundedPageSize(value = 50) {
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

export class FeedbackService {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly dependencies: FeedbackServiceDependencies = defaultDependencies,
  ) {}

  async listMine(): Promise<Feedback[]> {
    const { data, error } = await this.client
      .from("app_feedback")
      .select("*")
      .order("last_activity_at", { ascending: false });
    throwIfError(error);
    return data ?? [];
  }

  async getDetail(feedbackId: string): Promise<FeedbackDetail> {
    const [feedbackResult, attachmentsResult, messagesResult, eventsResult] =
      await Promise.all([
        this.client.from("app_feedback").select("*").eq("id", feedbackId).single(),
        this.client
          .from("feedback_attachments")
          .select("*")
          .eq("feedback_id", feedbackId)
          .order("created_at", { ascending: true }),
        this.client
          .from("feedback_messages")
          .select("*")
          .eq("feedback_id", feedbackId)
          .order("created_at", { ascending: true }),
        this.client
          .from("feedback_events")
          .select("*")
          .eq("feedback_id", feedbackId)
          .order("created_at", { ascending: true }),
      ]);

    throwIfError(feedbackResult.error);
    throwIfError(attachmentsResult.error);
    throwIfError(messagesResult.error);
    throwIfError(eventsResult.error);

    return {
      feedback: feedbackResult.data,
      attachments: attachmentsResult.data ?? [],
      messages: messagesResult.data ?? [],
      events: eventsResult.data ?? [],
    };
  }

  async listForAdmin(filters: AdminFeedbackFilters = {}): Promise<AdminFeedbackPage> {
    const limit = boundedPageSize(filters.limit);
    const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);
    let query = this.client
      .from("app_feedback")
      .select("*", { count: "exact" })
      .order("last_activity_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.priority) query = query.eq("priority", filters.priority);
    if (filters.assignedTo === null) query = query.is("assigned_to", null);
    if (typeof filters.assignedTo === "string") {
      query = query.eq("assigned_to", filters.assignedTo);
    }

    const { data, error, count } = await query;
    throwIfError(error);
    return { items: data ?? [], count: count ?? 0 };
  }

  async isPlatformAdmin() {
    const { data, error } = await this.client.rpc("is_platform_admin");
    throwIfError(error);
    return data;
  }

  async submit(input: FeedbackSubmission): Promise<FeedbackSubmissionResult> {
    const { title, description } = validateFeedbackSubmission(input);
    const { data, error } = await this.client.rpc("submit_app_feedback", {
      p_category: input.category,
      p_title: title,
      p_description: description,
      p_app_context: appContextToJson(input.appContext),
      p_idempotency_key: input.idempotencyKey,
    });
    throwIfError(error);

    const attachments = await Promise.all(
      (input.attachments ?? []).map((asset, index) =>
        this.uploadAttachment({
          feedbackId: data.id,
          asset,
          storageKey: `${input.idempotencyKey}-${index}`,
        }),
      ),
    );

    return { feedback: data, attachments };
  }

  async uploadAttachment(
    input: UploadFeedbackAttachmentInput,
  ): Promise<FeedbackAttachment> {
    validateFeedbackAttachment(input.asset);
    const { data: userData, error: userError } = await this.client.auth.getUser();
    throwIfError(userError);
    if (!userData.user) throw new Error("Authentication is required to upload feedback attachments.");

    const body = await this.dependencies.readAsset(input.asset);
    const fileSize = input.asset.size ?? body.byteLength ?? body.size;
    if (fileSize > MAX_FEEDBACK_ATTACHMENT_BYTES) {
      throw new Error("Feedback attachment exceeds the 15 MB size limit.");
    }

    const fileName = sanitizeAttachmentFileName(input.asset.name);
    const uploadKey = stableStorageKey(input.storageKey ?? this.dependencies.createId());
    const storagePath = `${userData.user.id}/${input.feedbackId}/${uploadKey}-${fileName}`;
    const mimeType = input.asset.mimeType || (body instanceof File ? body.type : "") || "application/octet-stream";
    const bucket = this.client.storage.from(FEEDBACK_ATTACHMENT_BUCKET);
    const { error: uploadError } = await bucket.upload(storagePath, body, {
      contentType: mimeType,
      upsert: Boolean(input.storageKey),
    });
    throwIfError(uploadError);

    const { data, error } = await this.client.rpc("register_feedback_attachment", {
      p_feedback_id: input.feedbackId,
      p_storage_path: storagePath,
      p_file_name: input.asset.name.slice(0, 255),
      p_mime_type: mimeType,
      p_file_size: fileSize,
      p_message_id: input.messageId ?? null,
    });

    if (error) {
      await bucket.remove([storagePath]);
      throw error;
    }
    return data;
  }

  async createAttachmentSignedUrl(attachmentId: string, expiresInSeconds = 300) {
    const { data: attachment, error: attachmentError } = await this.client
      .from("feedback_attachments")
      .select("storage_path")
      .eq("id", attachmentId)
      .single();
    throwIfError(attachmentError);

    const expiresIn = Math.min(Math.max(Math.trunc(expiresInSeconds), 60), 3_600);
    const { data, error } = await this.client.storage
      .from(FEEDBACK_ATTACHMENT_BUCKET)
      .createSignedUrl(attachment.storage_path, expiresIn);
    throwIfError(error);
    return data.signedUrl;
  }

  async deleteAttachment(attachmentId: string) {
    const { data: storagePath, error } = await this.client.rpc(
      "delete_feedback_attachment",
      { p_attachment_id: attachmentId },
    );
    throwIfError(error);

    const { error: storageError } = await this.client.storage
      .from(FEEDBACK_ATTACHMENT_BUCKET)
      .remove([storagePath]);
    throwIfError(storageError);
  }

  async addMessage(feedbackId: string, body: string): Promise<FeedbackMessage> {
    const { data, error } = await this.client.rpc("add_feedback_message", {
      p_feedback_id: feedbackId,
      p_body: validateFeedbackMessage(body),
    });
    throwIfError(error);
    return data;
  }

  async updateStatus(feedbackId: string, status: FeedbackStatus) {
    const { data, error } = await this.client.rpc("admin_update_feedback_status", {
      p_feedback_id: feedbackId,
      p_status: status,
    });
    throwIfError(error);
    return data;
  }

  async setPriority(feedbackId: string, priority: FeedbackPriority) {
    const { data, error } = await this.client.rpc("admin_set_feedback_priority", {
      p_feedback_id: feedbackId,
      p_priority: priority,
    });
    throwIfError(error);
    return data;
  }

  async assign(feedbackId: string, adminId: string | null) {
    const { data, error } = await this.client.rpc("admin_assign_feedback", {
      p_feedback_id: feedbackId,
      p_admin_id: adminId,
    });
    throwIfError(error);
    return data;
  }

  async listActiveReleases(platform?: AppReleasePlatform): Promise<AppRelease[]> {
    let query = this.client
      .from("app_releases")
      .select("*")
      .eq("is_active", true)
      .order("released_at", { ascending: false });
    if (platform && platform !== "all") {
      query = query.in("platform", [platform, "all"]);
    }
    const { data, error } = await query;
    throwIfError(error);
    return data ?? [];
  }

  subscribeToUserFeedback(userId: string, onChange: () => void) {
    let channel = this.client
      .channel(`feedback:user:${userId}:${this.dependencies.createId()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_feedback", filter: `user_id=eq.${userId}` },
        onChange,
      );
    channel = this.addChildTableListeners(channel, onChange);
    channel.subscribe();
    return () => void this.client.removeChannel(channel);
  }

  subscribeToDetail(feedbackId: string, onChange: () => void) {
    let channel = this.client
      .channel(`feedback:detail:${feedbackId}:${this.dependencies.createId()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_feedback", filter: `id=eq.${feedbackId}` },
        onChange,
      );
    for (const table of ["feedback_attachments", "feedback_messages", "feedback_events"] as const) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `feedback_id=eq.${feedbackId}` },
        onChange,
      );
    }
    channel.subscribe();
    return () => void this.client.removeChannel(channel);
  }

  subscribeToAdminFeedback(onChange: () => void) {
    let channel = this.client
      .channel(`feedback:admin:${this.dependencies.createId()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_feedback" },
        onChange,
      );
    channel = this.addChildTableListeners(channel, onChange);
    channel.subscribe();
    return () => void this.client.removeChannel(channel);
  }

  private addChildTableListeners(channel: RealtimeChannel, onChange: () => void) {
    for (const table of ["feedback_attachments", "feedback_messages", "feedback_events"] as const) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        onChange,
      );
    }
    return channel;
  }
}

export const feedbackService = new FeedbackService(
  supabase as SupabaseClient<Database>,
);
