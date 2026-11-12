/**
 * Log kinds and severities are closed enums shared by the Convex validator,
 * the log explorer filter, and the audit writer. The filter must offer every
 * value.
 */
export const LOG_KINDS = [
  "audit",
  "auth",
  "payments",
  "notifications",
  "calls",
  "moderation",
  "content",
  "api",
  "errors",
] as const

export type LogKind = (typeof LOG_KINDS)[number]

export const LOG_KIND_LABELS: Record<LogKind, string> = {
  audit: "Audit",
  auth: "Auth",
  payments: "Pembayaran",
  notifications: "Notifikasi",
  calls: "Panggilan",
  moderation: "Moderasi",
  content: "Konten",
  api: "API",
  errors: "Galat",
}

export const LOG_SEVERITIES = [
  "info",
  "warning",
  "error",
  "critical",
] as const

export type LogSeverity = (typeof LOG_SEVERITIES)[number]

export const LOG_SEVERITY_LABELS: Record<LogSeverity, string> = {
  info: "Info",
  warning: "Peringatan",
  error: "Galat",
  critical: "Kritis",
}
