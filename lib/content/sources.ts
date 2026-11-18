import { formatDate } from "@/lib/format"

import type { PublicCulturalSource } from "./types"

/**
 * Presentation helpers for `culturalSources`. Every row is described on its own
 * so a footer or summary card never borrows one source's date or attribution
 * for the rest of the site.
 */

export type CulturalSourceStatus = PublicCulturalSource["permissionStatus"]

/** Finished, neutral labels shared by the footer and the ethics card. */
export const CULTURAL_SOURCE_STATUS_LABELS = {
  pending: "Menunggu persetujuan",
  granted: "Izin tercatat",
  withdrawn: "Izin ditarik",
  public_reference: "Rujukan publik",
  citation: "Rujukan publik",
} satisfies Record<CulturalSourceStatus, string>

export const CULTURAL_SOURCE_REFERENCE_LABELS = {
  public: "Rujukan publik",
  archive: "Arsip pengelola",
} as const

export type CulturalSourceReferenceKind = keyof typeof CULTURAL_SOURCE_REFERENCE_LABELS

/** Neutral site-wide sentence; the reader is pointed to the full source card. */
export const CULTURAL_SOURCE_CARD_LABEL = "Kartu Sumber Budaya"

export const CULTURAL_SOURCE_NOTE_PREFIX =
  "Beberapa sumber budaya; rincian izin dan atribusi ada di "

export const CULTURAL_SOURCE_NOTE = `${CULTURAL_SOURCE_NOTE_PREFIX}${CULTURAL_SOURCE_CARD_LABEL}.`

const PUBLIC_REFERENCE_MARKER = /rujukan publik/i
const HTTP_URL = /^https?:\/\//i

type SourceLike = Pick<
  PublicCulturalSource,
  | "community"
  | "sourceName"
  | "permissionDate"
  | "permissionStatus"
  | "permissionReference"
  | "attribution"
>

/**
 * A source can be a community permission or a public citation. A citation is
 * marked either by an explicit status or by the reference itself, and it never
 * reads as "Izin tercatat".
 */
export function isPublicReferenceSource(source: SourceLike): boolean {
  if (
    source.permissionStatus === "public_reference" ||
    source.permissionStatus === "citation"
  ) {
    return true
  }
  return (
    source.permissionStatus === "granted" &&
    PUBLIC_REFERENCE_MARKER.test(source.permissionReference)
  )
}

/** The full community name is too long for a compact footer row. */
export function shortCommunityName(community: string): string {
  const trimmed = community.trim()
  if (!trimmed) return community
  return trimmed.split(" (")[0]?.split(",")[0]?.trim() || trimmed
}

export type CulturalSourceSummary = {
  community: string
  shortCommunity: string
  sourceName: string
  statusLabel: string
  /** Only a granted permission carries a date; a citation or request does not. */
  dateLabel: string | null
  reference: string | null
  referenceKind: CulturalSourceReferenceKind | null
  referenceLabel: string | null
  attribution: string
}

/**
 * Describes one source without touching any sibling. Rows are deliberately
 * independent: no "latest" source can stand in for the whole list.
 */
export function summarizeCulturalSource(
  source: SourceLike,
  formatDateValue: (value: number) => string = formatDate,
): CulturalSourceSummary {
  const publicReference = isPublicReferenceSource(source)
  const statusLabel = publicReference
    ? CULTURAL_SOURCE_REFERENCE_LABELS.public
    : (CULTURAL_SOURCE_STATUS_LABELS[source.permissionStatus] ?? "Status izin")

  const hasDate =
    !publicReference &&
    source.permissionStatus === "granted" &&
    typeof source.permissionDate === "number" &&
    Number.isFinite(source.permissionDate)
  const dateLabel = hasDate
    ? formatDateValue(source.permissionDate as number)
    : null

  const reference = source.permissionReference?.trim() || null
  const referenceKind: CulturalSourceReferenceKind | null = reference
    ? HTTP_URL.test(reference)
      ? "public"
      : "archive"
    : null

  return {
    community: source.community,
    shortCommunity: shortCommunityName(source.community),
    sourceName: source.sourceName,
    statusLabel,
    dateLabel,
    reference,
    referenceKind,
    referenceLabel: referenceKind
      ? CULTURAL_SOURCE_REFERENCE_LABELS[referenceKind]
      : null,
    attribution: source.attribution,
  }
}
