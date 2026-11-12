import type { StatusTone } from "../workspace/types"
import type {
  CallKind,
  CallParticipantRole,
  CallRecordingConsent,
  CallScope,
  CallStatus,
} from "./types"

/**
 * Closed call enums shared by the Convex validators and the call surfaces.
 * The room must not restate a status or kind list that the schema owns.
 */

export const CALL_KINDS = ["audio", "video"] as const satisfies readonly CallKind[]

export const CALL_KIND_LABELS: Record<CallKind, string> = {
  audio: "Suara",
  video: "Video",
}

export const CALL_STATUSES = [
  "scheduled",
  "ringing",
  "active",
  "ended",
  "missed",
  "declined",
  "cancelled",
] as const satisfies readonly CallStatus[]

export const CALL_STATUS_LABELS: Record<CallStatus, string> = {
  scheduled: "Terjadwal",
  ringing: "Berdering",
  active: "Berlangsung",
  ended: "Selesai",
  missed: "Terlewat",
  declined: "Ditolak",
  cancelled: "Dibatalkan",
}

export const CALL_STATUS_TONES: Record<CallStatus, StatusTone> = {
  scheduled: "open",
  ringing: "wait",
  active: "progress",
  ended: "done",
  missed: "danger",
  declined: "danger",
  cancelled: "muted",
}

export const CALL_SCOPES = [
  "direct",
  "cohort",
  "support",
] as const satisfies readonly CallScope[]

export const CALL_SCOPE_LABELS: Record<CallScope, string> = {
  direct: "Langsung",
  cohort: "Kohort",
  support: "Dukungan",
}

export const CALL_PARTICIPANT_ROLES = [
  "host",
  "guest",
  "support",
] as const satisfies readonly CallParticipantRole[]

export const CALL_PARTICIPANT_ROLE_LABELS: Record<
  CallParticipantRole,
  string
> = {
  host: "Tuan rumah",
  guest: "Peserta",
  support: "Dukungan",
}

export const CALL_RECORDING_CONSENT_LABELS: Record<
  CallRecordingConsent,
  string
> = {
  both: "Semua setuju",
  pending: "Menunggu",
  declined: "Ditolak",
}
