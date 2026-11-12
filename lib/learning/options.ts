import type { StatusTone } from "../workspace/types"
import type {
  CohortStatus,
  CurriculumStatus,
  EnrollmentStatus,
  LearningPathStatus,
  LessonAccessLevel,
  LessonKind,
  SessionKind,
  SessionStatus,
  SubmissionStatus,
} from "../workspace/phase2-types"

/**
 * Closed curriculum enums shared by the Convex validators and the curriculum
 * editor. The editor renders these lists; it never restates them.
 */

export const LESSON_KINDS = [
  "text",
  "video",
  "audio",
  "file",
  "practice",
] as const satisfies readonly LessonKind[]

export const LESSON_KIND_LABELS: Record<LessonKind, string> = {
  text: "Teks",
  video: "Video",
  audio: "Audio",
  file: "Berkas",
  practice: "Praktik",
}

export const LESSON_ACCESS_LEVELS = [
  "public",
  "enrolled",
  "certified",
] as const satisfies readonly LessonAccessLevel[]

export const LESSON_ACCESS_LABELS: Record<LessonAccessLevel, string> = {
  public: "Publik",
  enrolled: "Peserta",
  certified: "Bersertifikat",
}

export const COHORT_STATUSES = [
  "draft",
  "enrolling",
  "active",
  "completed",
  "cancelled",
] as const satisfies readonly CohortStatus[]

export const COHORT_STATUS_LABELS: Record<CohortStatus, string> = {
  draft: "Draf",
  enrolling: "Pendaftaran",
  active: "Berjalan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
}

export const COHORT_STATUS_TONES: Record<CohortStatus, StatusTone> = {
  draft: "muted",
  enrolling: "open",
  active: "progress",
  completed: "done",
  cancelled: "danger",
}

export const ENROLLMENT_STATUSES = [
  "pending_payment",
  "active",
  "completed",
  "withdrawn",
] as const satisfies readonly EnrollmentStatus[]

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  pending_payment: "Menunggu bayar",
  active: "Aktif",
  completed: "Selesai",
  withdrawn: "Keluar",
}

export const ENROLLMENT_STATUS_TONES: Record<EnrollmentStatus, StatusTone> = {
  pending_payment: "wait",
  active: "progress",
  completed: "done",
  withdrawn: "muted",
}

export const SESSION_KINDS = [
  "session",
  "office_hours",
  "call",
  "assessment",
] as const satisfies readonly SessionKind[]

export const SESSION_KIND_LABELS: Record<SessionKind, string> = {
  session: "Kelas kohort",
  office_hours: "Jam kantor",
  call: "Panggilan",
  assessment: "Penilaian",
}

export const SESSION_STATUSES = [
  "scheduled",
  "live",
  "ended",
  "cancelled",
] as const satisfies readonly SessionStatus[]

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  scheduled: "Terjadwal",
  live: "Berlangsung",
  ended: "Selesai",
  cancelled: "Dibatalkan",
}

export const SESSION_STATUS_TONES: Record<SessionStatus, StatusTone> = {
  scheduled: "open",
  live: "progress",
  ended: "done",
  cancelled: "danger",
}

export const SUBMISSION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "revision_requested",
  "approved",
  "rejected",
] as const satisfies readonly SubmissionStatus[]

export const CURRICULUM_STATUSES = [
  "draft",
  "published",
] as const satisfies readonly CurriculumStatus[]

export const CURRICULUM_STATUS_LABELS: Record<CurriculumStatus, string> = {
  draft: "Draf",
  published: "Terbit",
}

export const PATH_STATUSES = [
  "open",
  "mapping",
  "planned",
  "archived",
] as const satisfies readonly LearningPathStatus[]

export const PATH_STATUS_LABELS: Record<LearningPathStatus, string> = {
  open: "Terbuka",
  mapping: "Sedang dipetakan",
  planned: "Direncanakan",
  archived: "Diarsipkan",
}

export const PATH_STATUS_TONES: Record<LearningPathStatus, StatusTone> = {
  open: "done",
  mapping: "progress",
  planned: "muted",
  archived: "muted",
}
