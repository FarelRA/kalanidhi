import type { CertificateStatus } from "../workspace/phase2-types"

/**
 * Closed certificate enums shared by the credentials board and the Convex
 * registry. The filter and the mutation must offer the same values.
 */

export const CERTIFICATE_STATUSES = [
  "issued",
  "revoked",
  "replaced",
] as const satisfies readonly CertificateStatus[]

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  issued: "Terbit",
  revoked: "Dicabut",
  replaced: "Diganti",
}

export const CERTIFICATE_EVENT_KINDS = [
  "issue",
  "revoke",
  "replace",
] as const

export type CertificateEventKind = (typeof CERTIFICATE_EVENT_KINDS)[number]

export const CERTIFICATE_EVENT_LABELS: Record<
  CertificateEventKind,
  string
> = {
  issue: "Terbit",
  revoke: "Dicabut",
  replace: "Diganti",
}
