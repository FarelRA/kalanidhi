import type { ContentRevisionStatus } from "../admin/types"
import type { StatusTone } from "../workspace/types"

/**
 * Catalog status is stored as a human-readable label in Convex and validated
 * by the content editor. One list keeps the validator and the editor aligned.
 */
/** Shown whenever a path or work has no linked `teachers` row. */
export const UNLINKED_TEACHER_LABEL = "Pengajar belum ditautkan"

export const CATALOG_STATUSES = [
  "Terbuka",
  "Sedang dipetakan",
  "Direncanakan",
] as const

export type CatalogStatus = (typeof CATALOG_STATUSES)[number]

export const CONTENT_REVISION_STATUSES = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived",
] as const satisfies readonly ContentRevisionStatus[]

export const CONTENT_REVISION_STATUS_LABELS: Record<
  ContentRevisionStatus,
  string
> = {
  draft: "Draf",
  in_review: "Ditinjau",
  scheduled: "Jadwal",
  published: "Terbit",
  archived: "Arsip",
}

export const CONTENT_REVISION_STATUS_TONES: Record<
  ContentRevisionStatus,
  StatusTone
> = {
  draft: "wait",
  in_review: "wait",
  scheduled: "wait",
  published: "done",
  archived: "muted",
}
