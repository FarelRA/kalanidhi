import type {
  ApiKeyMetadataView,
  ConsentView,
  IntegrationHealthView,
  ProfilePreferences,
  WebhookDeliveryView,
  WebhookEndpointMetadataView,
} from "./types"

/**
 * Closed settings enums shared by the Convex validators and the settings
 * panel. Consent kinds and notification channels are schema data, not UI copy.
 */

export const CONSENT_KINDS = [
  "privacy",
  "recording",
  "marketing",
  "guardian",
] as const satisfies readonly ConsentView["kind"][]

export const CONSENT_KIND_LABELS: Record<ConsentView["kind"], string> = {
  privacy: "Kebijakan privasi",
  recording: "Rekaman panggilan",
  marketing: "Kabar pemasaran",
  guardian: "Konsen wali",
}

export const NOTIFICATION_KEYS = [
  "tasks",
  "messages",
  "sessionReminders",
  "weeklyDigest",
  "promotions",
] as const satisfies readonly (keyof ProfilePreferences["notifications"])[]

export type NotificationKey = (typeof NOTIFICATION_KEYS)[number]

export const NOTIFICATION_LABELS: Record<NotificationKey, string> = {
  tasks: "Tugas dan penilaian",
  messages: "Pesan langsung",
  sessionReminders: "Pengingat sesi",
  weeklyDigest: "Ringkasan mingguan",
  promotions: "Promosi jalur baru",
}

export const INTEGRATION_KEYS = [
  "payment_gateway",
  "email",
  "whatsapp",
  "livekit",
  "storage",
] as const satisfies readonly IntegrationHealthView["integration"][]

export type IntegrationKey = (typeof INTEGRATION_KEYS)[number]

export const INTEGRATION_LABELS: Record<IntegrationKey, string> = {
  payment_gateway: "Gerbang pembayaran",
  email: "Email transaksional",
  whatsapp: "WhatsApp",
  livekit: "LiveKit",
  storage: "Penyimpanan media",
}

export const INTEGRATION_STATUS_LABELS: Record<
  IntegrationHealthView["status"],
  string
> = {
  healthy: "Sehat",
  degraded: "Menurun",
  down: "Mati",
  unknown: "Belum diketahui",
}

export const INTEGRATION_STATUS_TONES: Record<
  IntegrationHealthView["status"],
  "done" | "wait" | "danger" | "muted"
> = {
  healthy: "done",
  degraded: "wait",
  down: "danger",
  unknown: "muted",
}

export const API_KEY_STATUSES = [
  "active",
  "revoked",
  "expired",
] as const satisfies readonly ApiKeyMetadataView["status"][]

export const API_KEY_STATUS_LABELS: Record<
  ApiKeyMetadataView["status"],
  string
> = {
  active: "Aktif",
  revoked: "Dicabut",
  expired: "Kedaluwarsa",
}

export const WEBHOOK_STATUSES = [
  "active",
  "paused",
  "revoked",
] as const satisfies readonly WebhookEndpointMetadataView["status"][]

export const WEBHOOK_STATUS_LABELS: Record<
  WebhookEndpointMetadataView["status"],
  string
> = {
  active: "Aktif",
  paused: "Dijeda",
  revoked: "Dicabut",
}

export const WEBHOOK_DELIVERY_STATUSES = [
  "pending",
  "delivered",
  "failed",
  "dead",
] as const satisfies readonly WebhookDeliveryView["status"][]

export const WEBHOOK_DELIVERY_STATUS_LABELS: Record<
  WebhookDeliveryView["status"],
  string
> = {
  pending: "Menunggu",
  delivered: "Terkirim",
  failed: "Gagal",
  dead: "Mati",
}

export const WEBHOOK_DELIVERY_STATUS_TONES: Record<
  WebhookDeliveryView["status"],
  "done" | "wait" | "danger" | "muted"
> = {
  pending: "wait",
  delivered: "done",
  failed: "danger",
  dead: "muted",
}
