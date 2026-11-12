import type { StatusTone } from "../workspace/types"

/**
 * The lead state machine and its labels. The Convex mutation and the admin
 * drawer both read this module so a transition can never drift from the UI.
 */

export const LEAD_INTENTS = [
  "student",
  "institution",
  "consultation",
  "notify",
] as const

export type LeadIntent = (typeof LEAD_INTENTS)[number]

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
  "closed",
  "spam",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["contacted", "qualified", "lost", "spam"],
  contacted: ["qualified", "lost", "spam"],
  qualified: ["converted", "lost", "spam"],
  converted: [],
  lost: ["qualified", "spam"],
  closed: [],
  spam: ["new"],
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Baru",
  contacted: "Dihubungi",
  qualified: "Terkualifikasi",
  converted: "Dikonversi",
  lost: "Hilang",
  closed: "Ditutup",
  spam: "Spam",
}

export const LEAD_STATUS_TONES: Record<LeadStatus, StatusTone> = {
  new: "open",
  contacted: "wait",
  qualified: "progress",
  converted: "done",
  lost: "danger",
  closed: "muted",
  spam: "danger",
}

export const LEAD_INTENT_LABELS: Record<LeadIntent, string> = {
  student: "Peserta",
  institution: "Institusi",
  consultation: "Konsultasi",
  notify: "Pemberitahuan",
}

/**
 * Institution taxonomy used by the public lead form. Convex stores the label,
 * so this stays a single shared list instead of a local component array.
 */
export const INSTITUTION_TYPES = [
  "Sekolah",
  "EO & wedding organizer",
  "Desa wisata & hotel",
  "Korporat",
  "Lainnya",
] as const

export type InstitutionType = (typeof INSTITUTION_TYPES)[number]
