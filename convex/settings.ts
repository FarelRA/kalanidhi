import { ConvexError, v } from "convex/values"

import type { FlowKey } from "../lib/flows/definitions"

import type {
  AdminSettingsState,
  ApiKeyMetadataView,
  ConsentView,
  FeatureFlagView,
  IntegrationHealthView,
  NotificationTemplateView,
  PendingInviteView,
  PlatformSettingView,
  ProfilePreferences,
  ProfileSettingsView,
  SessionView,
  TeamMemberView,
  WebhookEndpointMetadataView,
} from "../lib/settings/types"
import { viewerForUser } from "./access"
import { isHttpUrl, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import { CONSENT_KINDS } from "../lib/settings/options"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

const NOTIFICATION_DEFAULTS: ProfilePreferences["notifications"] = {
  tasks: true,
  messages: true,
  sessionReminders: true,
  weeklyDigest: false,
  promotions: false,
}

const DEFAULT_PREFERENCES: Omit<ProfilePreferences, "whatsapp" | "bio"> = {
  locale: "id",
  timezone: "Asia/Jakarta",
  dataSaver: false,
  notifications: NOTIFICATION_DEFAULTS,
}

const CONSENT_KIND = v.union(
  ...CONSENT_KINDS.map((kind) => v.literal(kind)),
)
const featureKeyPattern = /^[a-z][a-z0-9_.-]{1,48}$/
const ALLOWED_SETTING_KEYS = new Set([
  "platform.maintenance",
  "platform.banner",
  "platform.regions",
  "platform.timezone",
  "platform.uploadLimits",
  "support.firstResponseMinutes",
  "messaging.retentionDays",
])

const SETTING_LABELS: Record<string, string> = {
  "platform.maintenance": "Mode pemeliharaan",
  "platform.banner": "Banner publik",
  "platform.regions": "Wilayah layanan",
  "platform.timezone": "Zona waktu",
  "platform.uploadLimits": "Batas unggahan",
  "support.firstResponseMinutes": "SLA respons dukungan",
  "messaging.retentionDays": "Retensi pesan",
}

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function randomSecret(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const token = Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
  return `${prefix}_${token}`
}

async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Awaited<ReturnType<typeof viewerForUser>> }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()
  if (!user) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  if (user.status !== "active") fail("SUSPENDED", "Akun ini sedang ditangguhkan.")
  return { user, viewer: await viewerForUser(ctx, user) }
}

async function readSetting(
  ctx: QueryCtx | MutationCtx,
  key: string,
): Promise<Doc<"settings"> | null> {
  return await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique()
}

function asPreferences(value: unknown): ProfilePreferences {
  if (!value || typeof value !== "object") {
    return {
      whatsapp: null,
      bio: null,
      ...DEFAULT_PREFERENCES,
    }
  }
  const candidate = value as Partial<ProfilePreferences>
  const notifications = candidate.notifications ?? NOTIFICATION_DEFAULTS
  return {
    whatsapp: typeof candidate.whatsapp === "string" ? candidate.whatsapp : null,
    bio: typeof candidate.bio === "string" ? candidate.bio : null,
    locale: typeof candidate.locale === "string" ? candidate.locale : "id",
    timezone:
      typeof candidate.timezone === "string" ? candidate.timezone : "Asia/Jakarta",
    dataSaver: Boolean(candidate.dataSaver),
    notifications: {
      tasks: Boolean(notifications.tasks ?? NOTIFICATION_DEFAULTS.tasks),
      messages: Boolean(notifications.messages ?? NOTIFICATION_DEFAULTS.messages),
      sessionReminders: Boolean(
        notifications.sessionReminders ?? NOTIFICATION_DEFAULTS.sessionReminders,
      ),
      weeklyDigest: Boolean(
        notifications.weeklyDigest ?? NOTIFICATION_DEFAULTS.weeklyDigest,
      ),
      promotions: Boolean(notifications.promotions ?? NOTIFICATION_DEFAULTS.promotions),
    },
  }
}

export const profile = query({
  args: {},
  handler: async (ctx): Promise<ProfileSettingsView> => {
    const { user, viewer } = await currentUser(ctx)
    const preferenceKey = `profile.preferences.${user._id}`
    const [preferenceRow, consents, sessions] = await Promise.all([
      readSetting(ctx, preferenceKey),
      ctx.db
        .query("consents")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
    ])
    const consentViews: ConsentView[] = consents
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((consent) => ({
        id: consent._id,
        kind: consent.kind,
        granted: consent.granted,
        version: consent.version,
        source: consent.source,
        createdAt: consent.createdAt,
        grantedAt: consent.grantedAt ?? null,
        revokedAt: consent.revokedAt ?? null,
      }))
    const sessionViews: SessionView[] = sessions
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((session) => ({
        id: session._id,
        deviceName: session.deviceName,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt ?? null,
        current: !session.revokedAt && session.expiresAt > Date.now(),
      }))

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      initials: user.initials,
      region: user.region,
      image: user.image ?? null,
      roleLabel: viewer.roleLabel,
      preferences: asPreferences(preferenceRow?.value),
      consents: consentViews,
      sessions: sessionViews,
    }
  },
})

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await currentUser(ctx)
    const name = args.name?.trim()
    const region = args.region?.trim()
    if (name !== undefined && name.length < 2) {
      fail("INVALID_PROFILE", "Nama terlalu pendek.")
    }
    if (region !== undefined && region.length < 2) {
      fail("INVALID_PROFILE", "Wilayah terlalu pendek.")
    }
    await ctx.db.patch(user._id, {
      name: name ?? user.name,
      initials: (name ?? user.name)
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0] ?? "")
        .join("")
        .toUpperCase(),
      region: region ?? user.region,
      updatedAt: Date.now(),
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.profile.update",
      entityType: "users",
      entityId: user._id,
      reason: "Profil diperbarui dari pengaturan.",
      before: { name: user.name, region: user.region },
      after: { name: name ?? user.name, region: region ?? user.region },
    })
    return null
  },
})

export const updatePreferences = mutation({
  args: {
    whatsapp: v.optional(v.string()),
    bio: v.optional(v.string()),
    locale: v.optional(v.string()),
    timezone: v.optional(v.string()),
    dataSaver: v.optional(v.boolean()),
    notifications: v.optional(
      v.object({
        tasks: v.boolean(),
        messages: v.boolean(),
        sessionReminders: v.boolean(),
        weeklyDigest: v.boolean(),
        promotions: v.boolean(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await currentUser(ctx)
    const key = `profile.preferences.${user._id}`
    const existing = await readSetting(ctx, key)
    const current = asPreferences(existing?.value)
    const next: ProfilePreferences = {
      whatsapp: args.whatsapp ?? current.whatsapp,
      bio: args.bio ?? current.bio,
      locale: args.locale ?? current.locale,
      timezone: args.timezone ?? current.timezone,
      dataSaver: args.dataSaver ?? current.dataSaver,
      notifications: args.notifications ?? current.notifications,
    }
    const timestamp = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, { value: next, updatedAt: timestamp })
    } else {
      await ctx.db.insert("settings", {
        key,
        value: next,
        updatedBy: viewer.userId,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.preferences.update",
      entityType: "settings",
      entityId: key,
      reason: "Preferensi profil diperbarui.",
      after: { locale: next.locale, timezone: next.timezone, dataSaver: next.dataSaver },
    })
    return null
  },
})

export const setConsent = mutation({
  args: {
    kind: CONSENT_KIND,
    granted: v.boolean(),
    version: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await currentUser(ctx)
    const timestamp = Date.now()
    const consentId = await ctx.db.insert("consents", {
      userId: user._id,
      kind: args.kind,
      granted: args.granted,
      version: args.version ?? "2026-11",
      source: args.source ?? "settings",
      grantedAt: args.granted ? timestamp : undefined,
      revokedAt: args.granted ? undefined : timestamp,
      createdAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.consent.update",
      entityType: "consents",
      entityId: consentId,
      reason: `Konsen ${args.kind} ${args.granted ? "diberikan" : "dicabut"}.`,
      after: { kind: args.kind, granted: args.granted },
    })
    return { consentId }
  },
})

export const revokeSession = mutation({
  args: { sessionId: v.id("sessions"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user, viewer } = await currentUser(ctx)
    const session = await ctx.db.get(args.sessionId)
    if (!session || session.userId !== user._id) {
      fail("NOT_FOUND", "Sesi tidak ditemukan.")
    }
    if (session.revokedAt) return null
    const timestamp = Date.now()
    await ctx.db.patch(session._id, {
      revokedAt: timestamp,
      revokedBy: viewer.userId,
      revokedReason: args.reason?.trim() || "Dicabut dari pengaturan sesi.",
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.session.revoke",
      entityType: "sessions",
      entityId: session._id,
      reason: args.reason?.trim() || "Sesi dicabut.",
      after: { revokedAt: timestamp },
    })
    return null
  },
})

function apiKeyView(row: Doc<"apiKeys">): ApiKeyMetadataView {
  return {
    id: row._id,
    name: row.name,
    keyPrefix: row.keyPrefix ?? null,
    scopes: row.scopes,
    status: row.status,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt ?? null,
    expiresAt: row.expiresAt ?? null,
    revokedAt: row.revokedAt ?? null,
    rotatedFrom: row.rotatedFrom ?? null,
    rotatedTo: row.rotatedTo ?? null,
  }
}

function webhookView(row: Doc<"webhookEndpoints">): WebhookEndpointMetadataView {
  return {
    id: row._id,
    name: row.name,
    url: row.url,
    events: row.events,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function templateView(row: Doc<"notificationTemplates">): NotificationTemplateView {
  return {
    id: row._id,
    key: row.key,
    channel: row.channel,
    subject: row.subject ?? null,
    body: row.body,
    locale: row.locale,
    updatedAt: row.updatedAt,
  }
}

function settingViews(
  rows: Doc<"settings">[],
  names: Map<string, string>,
): PlatformSettingView[] {
  return rows
    .filter((row) => ALLOWED_SETTING_KEYS.has(row.key))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((row) => ({
      key: row.key,
      label: SETTING_LABELS[row.key] ?? row.key,
      value: row.value,
      editable: true,
      updatedBy: row.updatedBy ?? null,
      updatedByName: row.updatedBy
        ? (names.get(row.updatedBy) ?? "Akun tidak ditemukan")
        : null,
      updatedAt: row.updatedAt ?? null,
    }))
}

export const adminState = query({
  args: {},
  handler: async (ctx): Promise<AdminSettingsState> => {
    await requireAdmin(ctx, "settings.platform")
    const [
      settings,
      flags,
      integrations,
      apiKeys,
      webhooks,
      templates,
      users,
      invites,
      slas,
    ] = await Promise.all([
      ctx.db.query("settings").collect(),
      ctx.db.query("featureFlags").collect(),
      ctx.db.query("integrationHealth").collect(),
      ctx.db.query("apiKeys").collect(),
      ctx.db.query("webhookEndpoints").collect(),
      ctx.db.query("notificationTemplates").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("invites").collect(),
      ctx.db.query("slaPolicies").collect(),
    ])

    const latestByIntegration = new Map<string, Doc<"integrationHealth">>()
    const names = new Map<string, string>(
      users.map((user) => [user._id, user.name]),
    )
    for (const row of integrations.sort((a, b) => a.checkedAt - b.checkedAt)) {
      latestByIntegration.set(row.integration, row)
    }
    const integrationRows: IntegrationHealthView[] = (
      ["payment_gateway", "email", "whatsapp", "livekit", "storage"] as const
    ).map((integration) => {
      const row = latestByIntegration.get(integration)
      return {
        integration,
        status: row?.status ?? "unknown",
        message: row?.message ?? null,
        latencyMs: row?.latencyMs ?? null,
        checkedAt: row?.checkedAt ?? null,
      }
    })

    const flagRows: FeatureFlagView[] = flags
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((row) => ({
        id: row._id,
        key: row.key,
        description: row.description,
        enabled: row.enabled,
        rolloutPercent: row.rolloutPercent,
        updatedBy: row.updatedBy ?? null,
        updatedByName: row.updatedBy
          ? (names.get(row.updatedBy) ?? "Akun tidak ditemukan")
          : null,
        updatedAt: row.updatedAt,
      }))

    const team: TeamMemberView[] = users
      .filter((user) => user.roles.includes("admin"))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        status: user.status,
        createdAt: user.createdAt,
      }))

    const pendingInvites: PendingInviteView[] = invites
      .filter((invite) => invite.status === "pending")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((invite) => ({
        id: invite._id,
        email: invite.email,
        name: invite.name ?? null,
        roles: invite.roles,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }))

    const maintenance = settings.find((row) => row.key === "platform.maintenance")
    const banner = settings.find((row) => row.key === "platform.banner")
    const regions = settings.find((row) => row.key === "platform.regions")
    const timezone = settings.find((row) => row.key === "platform.timezone")

    const maintenanceValue = (maintenance?.value ?? {}) as {
      enabled?: boolean
      message?: string
    }
    const bannerValue = (banner?.value ?? {}) as {
      enabled?: boolean
      message?: string
    }
    const regionValue = Array.isArray(regions?.value)
      ? (regions?.value as string[])
      : ["Yogyakarta", "Jawa Tengah"]

    return {
      settings: settingViews(settings, names),
      flags: flagRows,
      integrations: integrationRows,
      apiKeys: apiKeys
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(apiKeyView),
      webhooks: webhooks
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(webhookView),
      templates: templates
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(templateView),
      team,
      invites: pendingInvites,
      slas: slas
        .filter((row) => row.active)
        .sort((a, b) => a.flowKey.localeCompare(b.flowKey))
        .map((row) => ({
          key: row.key,
          flowKey: row.flowKey as FlowKey,
          name: row.name,
          targetMinutes: row.targetMinutes,
          escalationMinutes: row.escalationMinutes ?? null,
        })),
      maintenance: {
        enabled: Boolean(maintenanceValue.enabled),
        message:
          typeof maintenanceValue.message === "string"
            ? maintenanceValue.message
            : "Ruang kerja tetap terbuka; situs publik menampilkan pemberitahuan.",
      },
      banner: {
        enabled: Boolean(bannerValue.enabled),
        message:
          typeof bannerValue.message === "string"
            ? bannerValue.message
            : "Pemberitahuan publik belum diatur.",
      },
      regions: regionValue,
      timezone:
        timezone && typeof timezone.value === "string"
          ? timezone.value
          : "Asia/Jakarta",
      revenueSplit: {
        teacher: 70,
        platform: 15,
        community: 15,
        editable: false,
        note: "Dihitung sistem dari nilai bruto. Tidak ada editor per transaksi.",
      },
    }
  },
})

export const updateSetting = mutation({
  args: {
    key: v.string(),
    value: v.any(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const reason = requireReason(args.reason)
    if (args.key.toLowerCase().includes("split") || args.key.includes("70")) {
      fail(
        "READ_ONLY_SETTING",
        "Bagi hasil 70/15/15 dihitung sistem dan tidak dapat diubah dari pengaturan.",
      )
    }
    if (!ALLOWED_SETTING_KEYS.has(args.key)) {
      fail("UNKNOWN_SETTING", "Kunci pengaturan tidak dikenal.")
    }
    if (args.key === "platform.maintenance" || args.key === "platform.banner") {
      const value = args.value as { enabled?: unknown; message?: unknown }
      if (typeof value?.enabled !== "boolean") {
        fail("INVALID_SETTING", "Nilai enabled harus boolean.")
      }
    }
    if (args.key === "platform.regions") {
      if (!Array.isArray(args.value) || args.value.some((item) => typeof item !== "string")) {
        fail("INVALID_SETTING", "Wilayah harus berupa daftar teks.")
      }
    }
    if (args.key === "platform.timezone" && typeof args.value !== "string") {
      fail("INVALID_SETTING", "Zona waktu harus teks.")
    }
    if (args.key === "support.firstResponseMinutes") {
      if (typeof args.value !== "number" || args.value <= 0) {
        fail("INVALID_SETTING", "SLA respons harus angka positif.")
      }
    }
    if (args.key === "messaging.retentionDays") {
      if (typeof args.value !== "number" || args.value < 1) {
        fail("INVALID_SETTING", "Retensi pesan harus minimal satu hari.")
      }
    }
    const existing = await readSetting(ctx, args.key)
    const timestamp = Date.now()
    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        updatedBy: viewer.userId,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("settings", {
        key: args.key,
        value: args.value,
        updatedBy: viewer.userId,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.platform.update",
      entityType: "settings",
      entityId: args.key,
      reason,
      before: existing ? { value: existing.value } : undefined,
      after: { value: args.value },
      severity: "warning",
    })
    return null
  },
})

export const setFeatureFlag = mutation({
  args: {
    key: v.string(),
    description: v.optional(v.string()),
    enabled: v.boolean(),
    rolloutPercent: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const reason = requireReason(args.reason)
    const key = args.key.trim()
    if (!featureKeyPattern.test(key)) {
      fail("INVALID_FLAG", "Kunci flag tidak sah.")
    }
    const rollout = Math.min(Math.max(args.rolloutPercent ?? 100, 0), 100)
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description ?? existing.description,
        enabled: args.enabled,
        rolloutPercent: rollout,
        updatedBy: viewer.userId,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("featureFlags", {
        key,
        description: args.description ?? key,
        enabled: args.enabled,
        rolloutPercent: rollout,
        updatedBy: viewer.userId,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.flag.update",
      entityType: "featureFlags",
      entityId: key,
      reason,
      before: existing
        ? { enabled: existing.enabled, rolloutPercent: existing.rolloutPercent }
        : undefined,
      after: { enabled: args.enabled, rolloutPercent: rollout },
    })
    return null
  },
})

export const createApiKey = mutation({
  args: {
    name: v.string(),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const name = args.name.trim()
    if (!name || args.scopes.length === 0) {
      fail("INVALID_API_KEY", "Nama dan setidaknya satu scope wajib diisi.")
    }
    const token = randomSecret("kn")
    const keyHash = await hashToken(token)
    const timestamp = Date.now()
    const keyId = await ctx.db.insert("apiKeys", {
      name,
      keyHash,
      keyPrefix: token.slice(0, 8),
      scopes: args.scopes,
      status: "active",
      createdBy: viewer.userId,
      createdAt: timestamp,
      expiresAt: args.expiresAt,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.apiKey.create",
      entityType: "apiKeys",
      entityId: keyId,
      reason: args.reason?.trim() || "Kunci API dibuat.",
      after: { name, scopes: args.scopes, keyPrefix: token.slice(0, 8) },
    })
    // The raw token is returned once and never stored or logged.
    return { keyId, token, keyPrefix: token.slice(0, 8) }
  },
})

export const rotateApiKey = mutation({
  args: { keyId: v.id("apiKeys"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const reason = requireReason(args.reason)
    const existing = await ctx.db.get(args.keyId)
    if (!existing) fail("NOT_FOUND", "Kunci API tidak ditemukan.")
    if (existing.status !== "active") {
      fail("INVALID_TRANSITION", "Hanya kunci aktif yang dapat diputar.")
    }
    const token = randomSecret("kn")
    const keyHash = await hashToken(token)
    const timestamp = Date.now()
    const newId = await ctx.db.insert("apiKeys", {
      name: existing.name,
      keyHash,
      keyPrefix: token.slice(0, 8),
      scopes: existing.scopes,
      status: "active",
      createdBy: viewer.userId,
      createdAt: timestamp,
      expiresAt: existing.expiresAt,
      rotatedFrom: existing._id,
    })
    await ctx.db.patch(existing._id, {
      status: "revoked",
      revokedAt: timestamp,
      rotatedTo: newId,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.apiKey.rotate",
      entityType: "apiKeys",
      entityId: newId,
      reason,
      before: { keyId: existing._id, status: existing.status },
      after: { keyId: newId, keyPrefix: token.slice(0, 8) },
      severity: "warning",
    })
    return { keyId: newId, token, keyPrefix: token.slice(0, 8) }
  },
})

export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const reason = requireReason(args.reason)
    const key = await ctx.db.get(args.keyId)
    if (!key) fail("NOT_FOUND", "Kunci API tidak ditemukan.")
    if (key.status === "revoked") return null
    const timestamp = Date.now()
    await ctx.db.patch(key._id, { status: "revoked", revokedAt: timestamp })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.apiKey.revoke",
      entityType: "apiKeys",
      entityId: key._id,
      reason,
      before: { status: key.status },
      after: { status: "revoked" },
      severity: "warning",
    })
    return null
  },
})

function assertSafeWebhookUrl(url: string): string {
  if (!isHttpUrl(url)) fail("INVALID_URL", "URL webhook harus http atau https.")
  const parsed = new URL(url)
  if (parsed.protocol !== "https:") {
    fail("INVALID_URL", "Webhook harus memakai HTTPS.")
  }
  const host = parsed.hostname.toLowerCase()
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "169.254.169.254"
  ) {
    fail("INVALID_URL", "Webhook tidak boleh menunjuk ke alamat privat.")
  }
  return url
}

export const createWebhookEndpoint = mutation({
  args: {
    name: v.string(),
    url: v.string(),
    events: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const name = args.name.trim()
    if (!name || args.events.length === 0) {
      fail("INVALID_WEBHOOK", "Nama dan setidaknya satu event wajib diisi.")
    }
    const url = assertSafeWebhookUrl(args.url.trim())
    const secret = randomSecret("whsec")
    const secretHash = await hashToken(secret)
    const timestamp = Date.now()
    // No delivery is sent here. The one-minute dispatcher picks up pending
    // `webhookDeliveries` rows, so endpoint creation stays a pure write.
    const endpointId = await ctx.db.insert("webhookEndpoints", {
      name,
      url,
      secretHash,
      events: args.events,
      status: "active",
      createdBy: viewer.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.webhook.create",
      entityType: "webhookEndpoints",
      entityId: endpointId,
      reason: "Endpoint webhook dibuat.",
      after: { name, url, events: args.events },
    })
    // The signing secret is returned once and never stored in plain text.
    return { endpointId, secret }
  },
})

export const setWebhookStatus = mutation({
  args: {
    endpointId: v.id("webhookEndpoints"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("revoked")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const reason = requireReason(args.reason)
    const endpoint = await ctx.db.get(args.endpointId)
    if (!endpoint) fail("NOT_FOUND", "Endpoint webhook tidak ditemukan.")
    await ctx.db.patch(endpoint._id, {
      status: args.status,
      updatedAt: Date.now(),
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.webhook.status",
      entityType: "webhookEndpoints",
      entityId: endpoint._id,
      reason,
      before: { status: endpoint.status },
      after: { status: args.status },
    })
    return null
  },
})

export const saveNotificationTemplate = mutation({
  args: {
    key: v.string(),
    channel: v.union(
      v.literal("email"),
      v.literal("whatsapp"),
      v.literal("push"),
      v.literal("in_app"),
    ),
    subject: v.optional(v.string()),
    body: v.string(),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "settings.platform")
    const key = args.key.trim()
    const body = args.body.trim()
    if (!key || body.length < 4) {
      fail("INVALID_TEMPLATE", "Kunci dan isi template wajib diisi.")
    }
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("notificationTemplates")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        channel: args.channel,
        subject: args.subject,
        body,
        locale: args.locale ?? existing.locale,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("notificationTemplates", {
        key,
        channel: args.channel,
        subject: args.subject,
        body,
        locale: args.locale ?? "id",
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "settings.template.save",
      entityType: "notificationTemplates",
      entityId: key,
      reason: "Template notifikasi diperbarui.",
      after: { channel: args.channel, locale: args.locale ?? "id" },
    })
    return { key }
  },
})
