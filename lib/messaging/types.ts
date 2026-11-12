/**
 * Serialisable messaging view types shared by Convex queries and the client.
 * Convex documents never leak into components; these are the only shapes the
 * chat surface consumes.
 */

export type ConversationKind = "direct" | "cohort" | "support" | "system"

export type ConversationStatus = "open" | "archived" | "flagged"

export type MessageKind = "text" | "voice" | "image" | "file" | "system" | "call"

export type ConversationMemberView = {
  userId: string
  name: string
  initials: string
  role: "member" | "owner" | "support"
}

export type MessageAssetView = {
  id: string
  kind: "image" | "audio" | "video" | "file"
  filename: string
  mimeType: string
  size: number
  durationMs: number | null
  width: number | null
  height: number | null
  transcript: string | null
  url: string | null
  waveform: number[]
  senderId: string | null
  senderName: string | null
  createdAt: number
}

export type MessageReplyView = {
  id: string
  body: string
  senderName: string
}

export type MessageEditView = {
  id: string
  previousBody: string
  nextBody: string
  editorId: string
  editorName: string
  createdAt: number
}

export type MessageView = {
  id: string
  conversationId: string
  kind: MessageKind
  senderId: string | null
  senderName: string
  body: string | null
  containsExternalLink: boolean
  replyTo: MessageReplyView | null
  edits: MessageEditView[]
  editedAt: number | null
  deletedAt: number | null
  removedBy: string | null
  removalReason: string | null
  createdAt: number
  asset: MessageAssetView | null
}

export type MessagePage = {
  messages: MessageView[]
  hasMore: boolean
}

export type ConversationSummary = {
  id: string
  kind: ConversationKind
  title: string
  pathId: string | null
  cohortId: string | null
  status: ConversationStatus
  isMember: boolean
  canReadContent: boolean
  contentLocked: boolean
  mutedUntil: number | null
  lastReadAt: number | null
  unreadCount: number
  messageCount: number
  openFlagCount: number
  blockedPair: boolean
  lastMessageAt: number | null
  lastMessagePreview: string | null
  members: ConversationMemberView[]
}

export type BreakGlassGrantView = {
  id: string
  reason: string
  expiresAt: number
}

export type ConversationDetail = ConversationSummary & {
  supportRequestedBy: string | null
  supportConsentAt: number | null
  activeGrant: BreakGlassGrantView | null
}

export type PresenceView = {
  userId: string
  name: string
  initials: string
  lastSeenAt: number | null
  typingUntil: number | null
}

export type ReceiptView = {
  userId: string
  name: string
  initials: string
  lastReadAt: number | null
  readCount: number
}

export type ContactView = {
  userId: string
  name: string
  initials: string
  roleLabel: "Pengajar" | "Peserta"
  pathId: string | null
}

export type NotificationView = {
  id: string
  template: string
  title: string
  body: string
  entityType: string | null
  entityId: string | null
  conversationId: string | null
  attempts: number
  scheduledAt: number
  sentAt: number | null
  error: string | null
  createdAt: number
  readAt: number | null
}

export type ModerationFlagView = {
  id: string
  messageId: string
  conversationId: string
  reporterId: string
  reporterName: string
  reason: string
  status: "open" | "reviewing" | "resolved" | "dismissed"
  createdAt: number
  resolvedAt: number | null
  resolution: string | null
}
