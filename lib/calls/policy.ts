import type {
  CallKind,
  CallParticipantRole,
  CallScope,
  CallStatus,
  CallRecordingConsent,
} from "./types"

export const CALL_CAPACITY = 25
export const CALL_TOKEN_TTL_SECONDS = 600
export const CALL_ROOM_PREFIX = "kn-call-"

const TERMINAL_STATUSES: readonly CallStatus[] = [
  "ended",
  "missed",
  "declined",
  "cancelled",
]

/** The room name is derived only from the server-created call id. */
export function roomNameForCall(callId: string): string {
  return `${CALL_ROOM_PREFIX}${callId}`
}

export function isTerminalCallStatus(status: CallStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function isUpcomingCallStatus(status: CallStatus): boolean {
  return status === "scheduled" || status === "ringing"
}

export function internalKindFor(kind: CallKind): "voice" | "video" {
  return kind === "audio" ? "voice" : "video"
}

export function publicKindFor(kind: "voice" | "video" | "cohort"): CallKind {
  return kind === "video" ? "video" : "audio"
}

export function callScopeFor(input: {
  cohortId?: string
  cohortSessionId?: string
  conversationKind?: "direct" | "cohort" | "support" | "system"
}): CallScope {
  if (input.cohortId || input.cohortSessionId) return "cohort"
  if (input.conversationKind === "cohort") return "cohort"
  if (input.conversationKind === "support") return "support"
  return "direct"
}

/**
 * A 1:1 call is only joinable by a guest once the host has entered. This is
 * the waiting-room gate: ringing calls admit the host, active calls admit
 * everyone in the participant list.
 */
export function canJoinCall(input: {
  status: CallStatus
  viewerRole: CallParticipantRole | null
  monitorOnly: boolean
}): boolean {
  if (input.monitorOnly || !input.viewerRole) return false
  if (input.status === "active") return true
  if (input.status === "ringing") return input.viewerRole === "host"
  return false
}

export function joinBlockedReason(input: {
  status: CallStatus
  viewerRole: CallParticipantRole | null
  monitorOnly: boolean
}): string | null {
  if (input.monitorOnly) return "MONITOR_ONLY"
  if (!input.viewerRole) return "NOT_PARTICIPANT"
  if (input.status === "scheduled") return "CALL_NOT_STARTED"
  if (input.status === "ringing") {
    return input.viewerRole === "host" ? null : "WAITING_FOR_HOST"
  }
  if (isTerminalCallStatus(input.status)) return "CALL_ENDED"
  return null
}

/**
 * Recording stays off. Consent is metadata only in this phase; the state is
 * "both" only after every non-declined participant has explicitly agreed.
 */
export function consentState(input: {
  participantIds: string[]
  consentedIds: string[]
  declinedIds: string[]
}): CallRecordingConsent {
  if (input.declinedIds.length > 0) return "declined"
  if (input.participantIds.length === 0) return "pending"
  const consented = new Set(input.consentedIds)
  return input.participantIds.every((id) => consented.has(id))
    ? "both"
    : "pending"
}

export function qualitySummaryFor(
  participants: { name: string; quality: string | null }[],
): string | null {
  const rated = participants.filter(
    (participant) => participant.quality && participant.quality.length > 0,
  )
  if (rated.length === 0) return null
  return rated
    .map((participant) => `${participant.name}: ${participant.quality}`)
    .join(" · ")
    .slice(0, 240)
}
