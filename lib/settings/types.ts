/** Serialisable settings and integration view types. */

export type ProfilePreferences = {
  whatsapp: string | null
  bio: string | null
  locale: string
  timezone: string
  dataSaver: boolean
  notifications: {
    tasks: boolean
    messages: boolean
    sessionReminders: boolean
    weeklyDigest: boolean
    promotions: boolean
  }
}

export type ConsentView = {
  id: string
  kind: "privacy" | "recording" | "marketing" | "guardian"
  granted: boolean
  version: string
  source: string
  createdAt: number
  grantedAt: number | null
  revokedAt: number | null
}

export type SessionView = {
  id: string
  deviceName: string
  userAgent: string
  createdAt: number
  lastSeenAt: number
  expiresAt: number
  revokedAt: number | null
  current: boolean
}

export type ProfileSettingsView = {
  userId: string
  name: string
  email: string
  initials: string
  region: string
  image: string | null
  roleLabel: string
  preferences: ProfilePreferences
  consents: ConsentView[]
  sessions: SessionView[]
}

export type FeatureFlagView = {
  id: string
  key: string
  description: string
  enabled: boolean
  rolloutPercent: number
  updatedAt: number
}

export type IntegrationHealthView = {
  integration:
    | "payment_gateway"
    | "email"
    | "whatsapp"
    | "livekit"
    | "storage"
  status: "healthy" | "degraded" | "down" | "unknown"
  message: string | null
  latencyMs: number | null
  checkedAt: number | null
}

export type ApiKeyMetadataView = {
  id: string
  name: string
  keyPrefix: string | null
  scopes: string[]
  status: "active" | "revoked" | "expired"
  createdAt: number
  lastUsedAt: number | null
  expiresAt: number | null
  revokedAt: number | null
}

export type WebhookEndpointMetadataView = {
  id: string
  name: string
  url: string
  events: string[]
  status: "active" | "paused" | "revoked"
  createdAt: number
  updatedAt: number
}

export type NotificationTemplateView = {
  id: string
  key: string
  channel: "email" | "whatsapp" | "push" | "in_app"
  subject: string | null
  body: string
  locale: string
  updatedAt: number
}

export type TeamMemberView = {
  id: string
  name: string
  email: string
  initials: string
  status: "active" | "suspended" | "invited" | "deleted"
  createdAt: number
}

export type PendingInviteView = {
  id: string
  email: string
  name: string | null
  roles: string[]
  expiresAt: number
  createdAt: number
}

export type PlatformSettingView = {
  key: string
  label: string
  value: unknown
  editable: boolean
}

export type AdminSettingsState = {
  settings: PlatformSettingView[]
  flags: FeatureFlagView[]
  integrations: IntegrationHealthView[]
  apiKeys: ApiKeyMetadataView[]
  webhooks: WebhookEndpointMetadataView[]
  templates: NotificationTemplateView[]
  team: TeamMemberView[]
  invites: PendingInviteView[]
  slas: {
    key: string
    flowKey: string
    name: string
    targetMinutes: number
    escalationMinutes: number | null
  }[]
  maintenance: {
    enabled: boolean
    message: string
  }
  banner: {
    enabled: boolean
    message: string
  }
  regions: string[]
  timezone: string
  revenueSplit: {
    teacher: number
    platform: number
    community: number
    editable: false
    note: string
  }
}
