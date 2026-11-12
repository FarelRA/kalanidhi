/** Serialisable support view types shared by Convex and the support surface. */

export type SupportStatus = "open" | "pending" | "resolved" | "closed"
export type SupportPriority = "low" | "normal" | "high" | "urgent"
export type SupportChannel = "chat" | "email" | "whatsapp"
export type SupportEscalation =
  | "payment"
  | "content"
  | "trust_safety"
  | "technical"

export type SupportLinkType =
  | "account"
  | "order"
  | "payment"
  | "enrollment"
  | "certificate"
  | "work"
  | "conversation"

export type SupportLink = {
  type: SupportLinkType
  id: string
  label: string | null
}

export type SupportMessageView = {
  id: string
  kind: "user" | "internal" | "system"
  authorName: string
  body: string
  createdAt: number
}

export type SupportTicketSummary = {
  id: string
  code: string
  subject: string
  requesterId: string | null
  requesterName: string
  requesterEmail: string | null
  priority: SupportPriority
  status: SupportStatus
  assigneeId: string | null
  assigneeName: string | null
  channel: SupportChannel
  createdAt: number
  updatedAt: number
  ageMinutes: number
  firstResponseAt: number | null
  firstResponseMinutes: number | null
  slaMinutes: number
  slaBreached: boolean
  escalatedTo: SupportEscalation | null
  links: SupportLink[]
  messageCount: number
  lastMessagePreview: string | null
}

export type SupportTicketDetail = SupportTicketSummary & {
  messages: SupportMessageView[]
  resolutionNote: string | null
  resolvedAt: number | null
  closedAt: number | null
  reopenedAt: number | null
  escalationReason: string | null
  sourceConversationId: string | null
  assignedAt: number | null
  assignedBy: string | null
  assignedByName: string | null
  resolvedBy: string | null
  resolvedByName: string | null
  lastResponseAt: number | null
  canReply: boolean
}

export type SupportCannedReplyView = {
  id: string
  key: string
  title: string
  body: string
  category: "payment" | "content" | "trust_safety" | "technical" | "general"
  active: boolean
  updatedAt: number
}

export type SupportQueueSummary = {
  open: number
  pending: number
  resolved: number
  breached: number
  unassigned: number
}
