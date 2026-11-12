import type { StatusTone } from "../workspace/types"
import type {
  PersonAuthLogView,
  PersonRoleAssignmentView,
  PersonSellerProfile,
} from "./types"

/**
 * Closed people enums shared by the Convex read model and the people drawer.
 * The drawer must not restate a list that the schema owns.
 */

export const AUTH_LOG_KINDS = [
  "sign_in",
  "sign_out",
  "failed_sign_in",
  "session_revoked",
  "mfa",
  "impersonation",
  "invite_accepted",
] as const satisfies readonly PersonAuthLogView["kind"][]

export const AUTH_LOG_KIND_LABELS: Record<
  PersonAuthLogView["kind"],
  string
> = {
  sign_in: "Masuk",
  sign_out: "Keluar",
  failed_sign_in: "Gagal masuk",
  session_revoked: "Sesi dicabut",
  mfa: "MFA",
  impersonation: "Pratinjau",
  invite_accepted: "Undangan diterima",
}

export const ROLE_ACTIONS = ["grant", "revoke"] as const satisfies readonly PersonRoleAssignmentView["action"][]

export const ROLE_ACTION_LABELS: Record<
  PersonRoleAssignmentView["action"],
  string
> = {
  grant: "Diberikan",
  revoke: "Dicabut",
}

export const SELLER_STATUSES = [
  "pending",
  "active",
  "suspended",
] as const satisfies readonly PersonSellerProfile["status"][]

export const SELLER_STATUS_LABELS: Record<
  PersonSellerProfile["status"],
  string
> = {
  pending: "Menunggu",
  active: "Aktif",
  suspended: "Ditangguhkan",
}

export const SELLER_STATUS_TONES: Record<
  PersonSellerProfile["status"],
  StatusTone
> = {
  pending: "wait",
  active: "done",
  suspended: "danger",
}
