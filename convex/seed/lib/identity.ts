import type { Doc } from "../../_generated/dataModel"
import type { MutationCtx } from "../../_generated/server"
import type { SeedRole } from "../content/identities"
import { DAY, HOUR } from "./clock"
import { sha256 } from "./hash"

/** Realistic browser strings keep session and auth panels from reading like fixtures. */
export const USER_AGENTS = [
  "Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
]

/**
 * `workspace` is the hand-authored studio account: marketing and recording
 * consent, a device session, and an auth trail. `growth` is a public signup:
 * privacy consent, one session, WhatsApp verification, and an auth log, but no
 * marketing opt-in. The difference is explicit so it cannot drift by accident.
 */
export type SeedUserProjection = "workspace" | "growth"

export type SeedSellerInput = {
  displayName: string
  status: "pending" | "active"
  onboardingChecklist: {
    payoutAccount: boolean
    consent: boolean
    firstWorkCard: boolean
    taxDetails: boolean
  }
  createdAt: number
  activatedAt?: number
  updatedAt: number
  payout?: {
    provider?: "bank" | "gopay" | "other"
    bankCode: string
    accountName: string
    accountNumberMasked: string
    accountRef: string
    status?: "pending" | "verified" | "rejected" | "suspended"
    verifiedBy?: string
    verifiedAt?: number
    createdAt: number
    updatedAt: number
  }
}

export type SeedSessionInput = {
  authSessionId?: string
  deviceName?: string
  userAgent?: string
  createdAt: number
  lastSeenAt: number
  expiresAt: number
  onlyIfMissing?: boolean
}

export type SeedConsentOverrides = {
  privacy?: { source?: string; grantedAt?: number; createdAt?: number }
  marketing?: {
    granted: boolean
    grantedAt?: number
    revokedAt?: number
    createdAt: number
  }
  recording?: { source?: string; grantedAt: number; createdAt: number }
}

export type InsertSeedUserInput = {
  key: string
  name: string
  email: string
  phone: string
  province: string
  region: string
  initials: string
  roles: SeedRole[]
  createdAt: number
  updatedAt: number
  lastActiveAt?: number
  authUserId?: string
  projection?: SeedUserProjection
  index?: number
  whatsappVerifiedAt?: number
  /** Rebuild projections for a preserved row instead of inserting a new one. */
  existing?: Doc<"users">
  roleActorId?: string
  roleReason?: string
  seller?: SeedSellerInput
  consentOverrides?: SeedConsentOverrides
  /** Workspace accounts opt into marketing unless a caller says otherwise. */
  includeMarketing?: boolean
  /** Workspace accounts have a recording consent unless a caller says otherwise. */
  includeRecording?: boolean
  session?: SeedSessionInput
  authLog?: {
    authUserId?: string
    ipHash: string
    userAgent?: string
    createdAt: number
  }
  whatsapp?: {
    expiresAt: number
    verifiedAt?: number
    messageId: string
    createdAt: number
  }
}

function defaultUserAgent(index: number): string {
  return USER_AGENTS[index % USER_AGENTS.length] as string
}

function defaultDevice(index: number): string {
  return index % 3 === 0 ? "Android" : index % 3 === 1 ? "Windows" : "iPhone"
}

/**
 * Inserts one seed user and every projection the workspace UI reads.
 *
 * Returns `created: false` when an existing row was reused (the preserved
 * admin), so callers can count new accounts without guessing.
 */
export async function insertSeedUser(
  ctx: MutationCtx,
  input: InsertSeedUserInput,
  now: number,
): Promise<{ user: Doc<"users">; created: boolean }> {
  const projection = input.projection ?? "workspace"
  const index = input.index ?? 0
  const authUserId = input.authUserId ?? `seed-${input.key}`
  const userAgent = defaultUserAgent(index)
  let user: Doc<"users">
  let created = false

  if (input.existing) {
    user = input.existing
    if (
      user.province !== input.province ||
      user.region !== input.region ||
      user.name !== input.name ||
      user.initials !== input.initials
    ) {
      await ctx.db.patch(user._id, {
        name: input.name,
        initials: input.initials,
        province: input.province,
        region: input.region,
        updatedAt: now,
      })
      user = (await ctx.db.get(user._id)) as Doc<"users">
    }
  } else {
    const userId = await ctx.db.insert("users", {
      authUserId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      phone: input.phone,
      province: input.province,
      whatsappVerified: true,
      whatsappVerifiedAt:
        input.whatsappVerifiedAt ?? input.createdAt + 2 * HOUR,
      initials: input.initials,
      region: input.region,
      roles: input.roles,
      status: "active",
      lastActiveAt: input.lastActiveAt,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    })
    user = (await ctx.db.get(userId)) as Doc<"users">
    created = true
  }

  const roleActorId = input.roleActorId ?? "system"
  const roleReason =
    input.roleReason ??
    (projection === "growth"
      ? "Pendaftaran peserta melalui halaman kelas."
      : "Penyiapan akun melalui undangan pengelola.")
  for (const role of input.roles) {
    await ctx.db.insert("roleAssignments", {
      userId: user._id,
      role,
      action: "grant",
      actorId: roleActorId,
      reason: roleReason,
      createdAt: input.createdAt,
    })
  }

  if (input.seller) {
    await ctx.db.insert("sellerProfiles", {
      userId: user._id,
      displayName: input.seller.displayName,
      status: input.seller.status,
      onboardingChecklist: input.seller.onboardingChecklist,
      activatedAt: input.seller.activatedAt,
      createdAt: input.seller.createdAt,
      updatedAt: input.seller.updatedAt,
    })
    if (input.seller.payout) {
      const payout = input.seller.payout
      await ctx.db.insert("payoutAccounts", {
        userId: user._id,
        provider: payout.provider ?? "bank",
        bankCode: payout.bankCode,
        accountName: payout.accountName,
        accountNumberMasked: payout.accountNumberMasked,
        accountRef: payout.accountRef,
        status: payout.status ?? "verified",
        verifiedBy: payout.verifiedBy,
        verifiedAt: payout.verifiedAt,
        createdAt: payout.createdAt,
        updatedAt: payout.updatedAt,
      })
    }
  }

  const session = input.session
  if (session) {
    const existingSessions = session.onlyIfMissing
      ? await ctx.db
          .query("sessions")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .collect()
      : []
    if (existingSessions.length === 0) {
      await ctx.db.insert("sessions", {
        userId: user._id,
        authSessionId: session.authSessionId ?? `seed-session-${input.key}`,
        deviceName: session.deviceName ?? defaultDevice(index),
        userAgent: session.userAgent ?? userAgent,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
      })
    }
  } else if (projection === "growth") {
    await ctx.db.insert("sessions", {
      userId: user._id,
      authSessionId: `seed-session-${input.key}`,
      deviceName: defaultDevice(index),
      userAgent,
      createdAt: input.createdAt,
      lastSeenAt: input.lastActiveAt ?? input.createdAt,
      expiresAt: input.updatedAt + 30 * DAY,
    })
  }

  const consent = input.consentOverrides
  const privacySource = consent?.privacy?.source ?? "signup"
  await ctx.db.insert("consents", {
    userId: user._id,
    kind: "privacy",
    granted: true,
    version: "2026-11",
    source: privacySource,
    grantedAt: consent?.privacy?.grantedAt ?? input.createdAt,
    createdAt: consent?.privacy?.createdAt ?? input.createdAt,
  })

  if (input.includeMarketing ?? projection === "workspace") {
    const marketing = consent?.marketing
    const granted = marketing?.granted ?? index % 3 !== 0
    await ctx.db.insert("consents", {
      userId: user._id,
      kind: "marketing",
      granted,
      version: "2026-11",
      source: "signup",
      grantedAt: marketing?.grantedAt ?? (granted ? input.createdAt : undefined),
      revokedAt: marketing?.revokedAt,
      createdAt: marketing?.createdAt ?? input.createdAt,
    })
  }

  if (input.includeRecording ?? projection === "workspace") {
    const recording = consent?.recording
    await ctx.db.insert("consents", {
      userId: user._id,
      kind: "recording",
      granted: true,
      version: "2026-11",
      source: recording?.source ?? "workspace",
      grantedAt: recording?.grantedAt ?? input.createdAt,
      createdAt: recording?.createdAt ?? input.createdAt,
    })
  }

  const whatsapp = input.whatsapp
  await ctx.db.insert("whatsappVerifications", {
    userId: user._id,
    phone: input.phone,
    tokenHash: await sha256(`seed-verification-${input.key}`),
    status: "verified",
    expiresAt: whatsapp?.expiresAt ?? input.createdAt + HOUR,
    createdAt: whatsapp?.createdAt ?? input.createdAt,
    verifiedAt:
      whatsapp?.verifiedAt ?? input.whatsappVerifiedAt ?? input.createdAt,
    messageId: whatsapp?.messageId ?? `seed-wa-${input.key}`,
  })

  const authLog = input.authLog
  await ctx.db.insert("authLogs", {
    userId: user._id,
    authUserId: authLog?.authUserId ?? authUserId,
    kind: "sign_in",
    ipHash: authLog?.ipHash ?? `seed-ip-${input.key}`,
    userAgent: authLog?.userAgent ?? userAgent,
    createdAt: authLog?.createdAt ?? input.createdAt,
  })

  return { user, created }
}

/** Stable four-digit tail so seeded payout accounts look like real ones. */
export function accountSuffix(name: string): string {
  let hash = 7
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) % 8999
  return String(1000 + hash)
}

