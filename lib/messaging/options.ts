import type { StatusTone } from "../workspace/types"
import type { ConversationKind, ConversationStatus } from "./types"

/**
 * Closed conversation enums shared by the Convex validators and the message
 * center. The inbox must not restate a list that the schema owns.
 */

export const CONVERSATION_KINDS = [
  "direct",
  "cohort",
  "support",
  "system",
] as const satisfies readonly ConversationKind[]

export const CONVERSATION_KIND_LABELS: Record<ConversationKind, string> = {
  direct: "Langsung",
  cohort: "Kohort",
  support: "Dukungan",
  system: "Sistem",
}

export const CONVERSATION_STATUSES = [
  "open",
  "archived",
  "flagged",
] as const satisfies readonly ConversationStatus[]

export const CONVERSATION_STATUS_LABELS: Record<ConversationStatus, string> = {
  open: "Terbuka",
  archived: "Ditutup",
  flagged: "Terlapor",
}

export const CONVERSATION_STATUS_TONES: Record<
  ConversationStatus,
  StatusTone
> = {
  open: "open",
  archived: "muted",
  flagged: "danger",
}
