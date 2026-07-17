import type { DocumentPickerAsset } from "expo-document-picker";
import * as Crypto from "expo-crypto";

import type { Database, Json } from "@/types/database.types";

export type Feedback = Database["public"]["Tables"]["app_feedback"]["Row"];
export type FeedbackAttachment = Database["public"]["Tables"]["feedback_attachments"]["Row"];
export type FeedbackMessage = Database["public"]["Tables"]["feedback_messages"]["Row"];
export type FeedbackEvent = Database["public"]["Tables"]["feedback_events"]["Row"];
export type AppRelease = Database["public"]["Tables"]["app_releases"]["Row"];
export type PlatformAdmin = Database["public"]["Tables"]["platform_admins"]["Row"];

export type FeedbackCategory = Database["public"]["Enums"]["feedback_category"];
export type FeedbackStatus = Database["public"]["Enums"]["feedback_status"];
export type FeedbackPriority = Database["public"]["Enums"]["feedback_priority"];
export type AppReleasePlatform = Database["public"]["Enums"]["app_release_platform"];

export const FEEDBACK_ATTACHMENT_BUCKET = "feedback-screenshots";
export const MAX_FEEDBACK_TITLE_LENGTH = 160;
export const MAX_FEEDBACK_DESCRIPTION_LENGTH = 10_000;
export const MAX_FEEDBACK_MESSAGE_LENGTH = 5_000;
export const MAX_FEEDBACK_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type FeedbackAttachmentInput = Pick<
  DocumentPickerAsset,
  "uri" | "name" | "mimeType" | "size" | "file"
>;

export type RawAppContext = {
  appVersion?: unknown;
  buildVersion?: unknown;
  platform?: unknown;
  osVersion?: unknown;
  deviceModel?: unknown;
  locale?: unknown;
  timezone?: unknown;
  route?: unknown;
  releaseChannel?: unknown;
  isDevice?: unknown;
  [key: string]: unknown;
};

export type SanitizedAppContext = {
  appVersion?: string;
  buildVersion?: string;
  platform?: "ios" | "android" | "web";
  osVersion?: string;
  deviceModel?: string;
  locale?: string;
  timezone?: string;
  route?: string;
  releaseChannel?: string;
  isDevice?: boolean;
};

export type FeedbackSubmissionDraft = {
  category: FeedbackCategory;
  title: string;
  description: string;
  appContext?: RawAppContext;
  attachments?: FeedbackAttachmentInput[];
};

export type FeedbackSubmission = FeedbackSubmissionDraft & {
  idempotencyKey: string;
};

export type FeedbackDetail = {
  feedback: Feedback;
  attachments: FeedbackAttachment[];
  messages: FeedbackMessage[];
  events: FeedbackEvent[];
};

export type FeedbackSubmissionResult = {
  feedback: Feedback;
  attachments: FeedbackAttachment[];
};

export type AdminFeedbackFilters = {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  priority?: FeedbackPriority;
  assignedTo?: string | null;
  limit?: number;
  offset?: number;
};

export type AdminFeedbackPage = {
  items: Feedback[];
  count: number;
};

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, maxLength);
  return cleaned || undefined;
}

function cleanRoute(value: unknown) {
  const route = cleanString(value, 300);
  if (!route) return undefined;
  return route.split(/[?#]/, 1)[0] || undefined;
}

export function sanitizeAppContext(context?: RawAppContext): SanitizedAppContext {
  if (!context) return {};

  const platform =
    context.platform === "ios" ||
    context.platform === "android" ||
    context.platform === "web"
      ? context.platform
      : undefined;

  return removeUndefinedValues({
    appVersion: cleanString(context.appVersion, 50),
    buildVersion: cleanString(context.buildVersion, 50),
    platform,
    osVersion: cleanString(context.osVersion, 80),
    deviceModel: cleanString(context.deviceModel, 120),
    locale: cleanString(context.locale, 35),
    timezone: cleanString(context.timezone, 80),
    route: cleanRoute(context.route),
    releaseChannel: cleanString(context.releaseChannel, 80),
    isDevice: typeof context.isDevice === "boolean" ? context.isDevice : undefined,
  });
}

function removeUndefinedValues<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

export function appContextToJson(context?: RawAppContext): Json {
  return sanitizeAppContext(context) as Json;
}

export function prepareFeedbackSubmission(
  draft: FeedbackSubmissionDraft,
  createId: () => string = Crypto.randomUUID,
): FeedbackSubmission {
  return { ...draft, idempotencyKey: createId() };
}

export function validateFeedbackSubmission(input: FeedbackSubmission) {
  const title = input.title.trim();
  const description = input.description.trim();

  if (!input.idempotencyKey.trim()) {
    throw new Error("Feedback submission idempotency key is required.");
  }
  if (!title || title.length > MAX_FEEDBACK_TITLE_LENGTH) {
    throw new Error(`Feedback title must be between 1 and ${MAX_FEEDBACK_TITLE_LENGTH} characters.`);
  }
  if (!description || description.length > MAX_FEEDBACK_DESCRIPTION_LENGTH) {
    throw new Error(
      `Feedback description must be between 1 and ${MAX_FEEDBACK_DESCRIPTION_LENGTH} characters.`,
    );
  }
  input.attachments?.forEach(validateFeedbackAttachment);

  return { title, description };
}

export function validateFeedbackMessage(body: string) {
  const cleaned = body.trim();
  if (!cleaned || cleaned.length > MAX_FEEDBACK_MESSAGE_LENGTH) {
    throw new Error(
      `Feedback message must be between 1 and ${MAX_FEEDBACK_MESSAGE_LENGTH} characters.`,
    );
  }
  return cleaned;
}

export function validateFeedbackAttachment(asset: FeedbackAttachmentInput) {
  if (!asset.uri && !asset.file) {
    throw new Error("Feedback attachment must include a readable URI or web File.");
  }
  if (asset.size !== undefined && asset.size > MAX_FEEDBACK_ATTACHMENT_BYTES) {
    throw new Error("Feedback attachment exceeds the 15 MB size limit.");
  }
  if (asset.size !== undefined && asset.size < 0) {
    throw new Error("Feedback attachment size cannot be negative.");
  }
}

export function sanitizeAttachmentFileName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 120);
  return normalized || "attachment";
}
