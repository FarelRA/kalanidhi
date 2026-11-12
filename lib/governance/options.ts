import type { StatusTone } from "../workspace/types"
import type {
  AccessLevel,
  PrivacyRequestView,
  TakedownStatus,
  TakedownView,
} from "./types"

/**
 * Closed governance enums shared by the Convex validators and the governance
 * board. The board must not restate a list that the mutation already owns.
 */

export const ACCESS_LEVELS = [
  "public",
  "community",
  "restricted",
] as const satisfies readonly AccessLevel[]

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  public: "Publik",
  community: "Komunitas",
  restricted: "Terbatas",
}

export const PRIVACY_REQUEST_KINDS = [
  "access",
  "correction",
  "deletion",
  "hold",
] as const satisfies readonly PrivacyRequestView["kind"][]

export const PRIVACY_REQUEST_KIND_LABELS: Record<
  PrivacyRequestView["kind"],
  string
> = {
  access: "Akses",
  correction: "Koreksi",
  deletion: "Penghapusan",
  hold: "Retensi",
}

export const BREAK_GLASS_ENTITY_TYPES = [
  "call_recording",
  "identity_document",
  "submission_asset",
  "message_asset",
] as const

export type BreakGlassEntityType = (typeof BREAK_GLASS_ENTITY_TYPES)[number]

export const BREAK_GLASS_ENTITY_LABELS: Record<BreakGlassEntityType, string> = {
  call_recording: "Rekaman panggilan",
  identity_document: "Dokumen identitas",
  submission_asset: "Aset tugas",
  message_asset: "Aset pesan",
}

export const TAKEDOWN_STATUS_LABELS: Record<TakedownStatus, string> = {
  requested: "Diminta",
  reviewing: "Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
  completed: "Selesai",
  reversed: "Dibalik",
}

export const TAKEDOWN_STATUS_TONES: Record<TakedownStatus, StatusTone> = {
  requested: "open",
  reviewing: "progress",
  approved: "wait",
  rejected: "muted",
  completed: "done",
  reversed: "muted",
}

export const PRIVACY_STATUS_LABELS: Record<
  PrivacyRequestView["status"],
  string
> = {
  open: "Terbuka",
  reviewing: "Ditinjau",
  completed: "Selesai",
  rejected: "Ditolak",
}

export const PRIVACY_STATUS_TONES: Record<
  PrivacyRequestView["status"],
  StatusTone
> = {
  open: "open",
  reviewing: "progress",
  completed: "done",
  rejected: "danger",
}

export const TAKEDOWN_TARGET_LABELS: Record<
  TakedownView["targetType"],
  string
> = {
  work: "Karya",
  content: "Konten",
  media: "Media",
  conversation: "Percakapan",
  certificate: "Sertifikat",
}
