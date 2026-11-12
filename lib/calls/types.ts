/**
 * Serialisable call view types shared by Convex functions, the token route,
 * and the workspace call room. Convex documents never leak to the client.
 */

import type { Id } from "../../convex/_generated/dataModel"

export type CallKind = "audio" | "video"

export type CallScope = "direct" | "cohort" | "support"

export type CallStatus =
  | "scheduled"
  | "ringing"
  | "active"
  | "ended"
  | "missed"
  | "declined"
  | "cancelled"

export type CallParticipantRole = "host" | "guest" | "support"

export type CallParticipantStatus = "invited" | "joined" | "left" | "declined"

export type CallRecordingConsent = "both" | "pending" | "declined"

export type CallParticipantView = {
  userId: string
  name: string
  initials: string
  role: CallParticipantRole
  status: CallParticipantStatus
  joinedAt: number | null
  leftAt: number | null
  quality: string | null
}

export type CallRecordingView = {
  id: string
  createdAt: number
  retentionUntil: number
  consentedBy: { userId: string; name: string }[]
  accessLogCount: number
}

export type CallDetail = {
  id: string
  roomName: string
  kind: CallKind
  scope: CallScope
  title: string
  status: CallStatus
  initiatorId: string
  hostId: string
  conversationId: string | null
  cohortId: string | null
  cohortSessionId: string | null
  scheduledAt: number | null
  scheduledEndsAt: number | null
  startedAt: number | null
  endedAt: number | null
  endedBy: string | null
  endedByName: string | null
  cancelledAt: number | null
  endReason: string | null
  durationMs: number | null
  recordingConsent: CallRecordingConsent
  recordingEnabled: boolean
  recordingConsentUserIds: string[]
  recordingConsentRequired: number
  qualitySummary: string | null
  recordings: CallRecordingView[]
  participants: CallParticipantView[]
  viewerRole: CallParticipantRole | null
  isHost: boolean
  canJoin: boolean
  canEnd: boolean
  monitorOnly: boolean
  joinBlockedReason: string | null
  createdAt: number
}

export type CallSummary = {
  id: string
  kind: CallKind
  scope: CallScope
  title: string
  status: CallStatus
  initiatorId: string
  hostId: string
  hostName: string
  conversationId: string | null
  cohortId: string | null
  cohortSessionId: string | null
  scheduledAt: number | null
  scheduledEndsAt: number | null
  startedAt: number | null
  endedAt: number | null
  durationMs: number | null
  participantCount: number
  recordingConsent: CallRecordingConsent
  viewerRole: CallParticipantRole | null
}

export type CallStatusCounts = Record<CallStatus, number>

export type CallOverview = {
  counts: CallStatusCounts
  activeParticipants: number
  scheduledNext24h: number
  recordingPending: number
  recent: CallSummary[]
}

export type CallStartResult = {
  callId: Id<"callSessions">
  status: CallStatus
  kind: CallKind
  scope: CallScope
}

export type CallAcceptResult = {
  status: CallStatus
  waiting: boolean
}

export type CallDeclineResult = {
  status: CallStatus
  declined: boolean
}

export type CallEndResult = {
  status: "ended"
  durationMs: number
}

export type CallRecordingConsentResult = {
  recordingConsent: CallRecordingConsent
  recordingEnabled: false
  recordingConsentRequired: number
  consented: number
}
