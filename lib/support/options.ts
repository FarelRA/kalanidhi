import type { StatusTone } from "../workspace/types"
import type {
  SupportChannel,
  SupportEscalation,
  SupportPriority,
  SupportStatus,
} from "./types"

/**
 * Closed support enums shared by the Convex validators and the support inbox.
 */

export const SUPPORT_STATUSES = [
  "open",
  "pending",
  "resolved",
  "closed",
] as const satisfies readonly SupportStatus[]

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Terbuka",
  pending: "Menunggu",
  resolved: "Selesai",
  closed: "Ditutup",
}

export const SUPPORT_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly SupportPriority[]

export const SUPPORT_STATUS_TONES: Record<SupportStatus, StatusTone> = {
  open: "open",
  pending: "wait",
  resolved: "done",
  closed: "muted",
}

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  low: "Rendah",
  normal: "Normal",
  high: "Tinggi",
  urgent: "Mendesak",
}

export const SUPPORT_PRIORITY_TONES: Record<SupportPriority, StatusTone> = {
  low: "muted",
  normal: "progress",
  high: "wait",
  urgent: "danger",
}

export const SUPPORT_CHANNELS = [
  "chat",
  "email",
  "whatsapp",
] as const satisfies readonly SupportChannel[]

export const SUPPORT_CHANNEL_LABELS: Record<SupportChannel, string> = {
  chat: "Chat",
  email: "Email",
  whatsapp: "WhatsApp",
}

export const SUPPORT_ESCALATIONS = [
  "payment",
  "content",
  "trust_safety",
  "technical",
] as const satisfies readonly SupportEscalation[]

export const SUPPORT_ESCALATION_LABELS: Record<SupportEscalation, string> = {
  payment: "Pembayaran",
  content: "Konten",
  trust_safety: "Trust & safety",
  technical: "Teknis",
}
