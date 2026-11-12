import { ConvexError, v } from "convex/values"

import type {
  BreakGlassView,
  CulturalSourceView,
  GovernanceSummary,
  ImpersonationView,
  PrivacyRequestView,
  TakedownView,
} from "../lib/governance/types"
import {
  ACCESS_LEVELS,
  BREAK_GLASS_ENTITY_TYPES,
  PRIVACY_REQUEST_KINDS,
} from "../lib/governance/options"
import { viewerForUser } from "./access"
import { requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server"

const accessLevelValidator = v.union(
  ...ACCESS_LEVELS.map((level) => v.literal(level)),
)
const withdrawalStatusValidator = v.union(
  v.literal("active"),
  v.literal("withdrawal_requested"),
  v.literal("withdrawn"),
)
const sourceStatusValidator = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("archived"),
)
const takedownTargetValidator = v.union(
  v.literal("work"),
  v.literal("content"),
  v.literal("media"),
  v.literal("conversation"),
  v.literal("certificate"),
)
const takedownStatusValidator = v.union(
  v.literal("requested"),
  v.literal("reviewing"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("completed"),
  v.literal("reversed"),
)
const privacyKindValidator = v.union(
  ...PRIVACY_REQUEST_KINDS.map((kind) => v.literal(kind)),
)
const privacyStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewing"),
  v.literal("completed"),
  v.literal("rejected"),
)
const breakGlassEntityValidator = v.union(
  ...BREAK_GLASS_ENTITY_TYPES.map((entity) => v.literal(entity)),
)

const DAY_MS = 86_400_000

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

function randomCode(prefix: string): string {
  const year = new Date().getUTCFullYear()
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  return `${prefix}-${year}-${String(random % 1_000_000).padStart(6, "0")}`
}

async function userNames(
  ctx: QueryCtx | MutationCtx,
): Promise<Map<string, string>> {
  const users = await ctx.db.query("users").collect()
  return new Map(users.map((user) => [user._id, user.name]))
}

function sourceView(
  source: Doc<"culturalSources">,
  names: Map<string, string>,
): CulturalSourceView {
  return {
    id: source._id,
    community: source.community,
    sourceName: source.sourceName,
    pathId: source.pathId ?? null,
    workId: source.workId ?? null,
    permissionDocumentRef: source.permissionDocumentRef,
    permissionDocumentUrl: source.permissionDocumentUrl ?? null,
    permissionDate: source.permissionDate,
    permissionStatus: source.permissionStatus,
    accessLevel: source.accessLevel,
    attribution: source.attribution,
    notes: source.notes ?? null,
    withdrawalStatus: source.withdrawalStatus,
    withdrawalReason: source.withdrawalReason ?? null,
    withdrawalRequestedAt: source.withdrawalRequestedAt ?? null,
    withdrawnAt: source.withdrawnAt ?? null,
    status: source.status,
    createdBy: source.createdBy ?? null,
    createdByName: source.createdBy
      ? (names.get(source.createdBy) ?? "Akun tidak ditemukan")
      : null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  }
}

export const listCulturalSources = query({
  args: {
    status: v.optional(sourceStatusValidator),
    withdrawal: v.optional(withdrawalStatusValidator),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CulturalSourceView[]> => {
    await requireAdmin(ctx, "governance.manage")
    const needle = args.q?.trim().toLowerCase() ?? ""
    const names = await userNames(ctx)
    const rows = await ctx.db.query("culturalSources").collect()
    return rows
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => !args.withdrawal || row.withdrawalStatus === args.withdrawal)
      .filter((row) => {
        if (!needle) return true
        return `${row.community} ${row.sourceName} ${row.attribution} ${row.permissionDocumentRef}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => sourceView(row, names))
  },
})

export const getCulturalSource = query({
  args: { sourceId: v.id("culturalSources") },
  handler: async (ctx, args): Promise<CulturalSourceView | null> => {
    await requireAdmin(ctx, "governance.manage")
    const source = await ctx.db.get(args.sourceId)
    if (!source) return null
    const names = await userNames(ctx)
    return sourceView(source, names)
  },
})

export const createCulturalSource = mutation({
  args: {
    community: v.string(),
    sourceName: v.string(),
    pathId: v.optional(v.string()),
    workId: v.optional(v.id("works")),
    permissionDocumentRef: v.string(),
    permissionDocumentUrl: v.optional(v.string()),
    permissionDate: v.number(),
    accessLevel: accessLevelValidator,
    attribution: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const community = args.community.trim()
    const sourceName = args.sourceName.trim()
    const reference = args.permissionDocumentRef.trim()
    const attribution = args.attribution.trim()
    if (!community || !sourceName || !reference || !attribution) {
      fail(
        "INVALID_SOURCE",
        "Komunitas, nama sumber, dokumen izin, dan atribusi wajib diisi.",
      )
    }
    if (args.permissionDate <= 0) {
      fail("INVALID_SOURCE", "Tanggal izin tidak sah.")
    }
    if (args.workId) {
      const work = await ctx.db.get(args.workId)
      if (!work) fail("NOT_FOUND", "Karya tidak ditemukan.")
    }
    const timestamp = Date.now()
    const sourceId = await ctx.db.insert("culturalSources", {
      community,
      sourceName,
      pathId: args.pathId,
      workId: args.workId,
      permissionDocumentRef: reference,
      permissionDocumentUrl: args.permissionDocumentUrl,
      permissionDate: args.permissionDate,
      permissionStatus: "granted",
      accessLevel: args.accessLevel,
      attribution,
      notes: args.notes,
      withdrawalStatus: "active",
      status: "active",
      createdBy: viewer.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.source.create",
      entityType: "culturalSources",
      entityId: sourceId,
      reason: `Sumber budaya ${sourceName} dicatat.`,
      after: {
        community,
        permissionDocumentRef: reference,
        accessLevel: args.accessLevel,
      },
    })
    return { sourceId }
  },
})

export const updateCulturalSource = mutation({
  args: {
    sourceId: v.id("culturalSources"),
    community: v.optional(v.string()),
    sourceName: v.optional(v.string()),
    pathId: v.optional(v.string()),
    permissionDocumentRef: v.optional(v.string()),
    permissionDocumentUrl: v.optional(v.string()),
    permissionDate: v.optional(v.number()),
    accessLevel: v.optional(accessLevelValidator),
    attribution: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(sourceStatusValidator),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const source = await ctx.db.get(args.sourceId)
    if (!source) fail("NOT_FOUND", "Sumber budaya tidak ditemukan.")
    if (source.withdrawalStatus === "withdrawn") {
      fail("SOURCE_WITHDRAWN", "Sumber yang ditarik tidak dapat diubah tanpa pemulihan.")
    }
    const timestamp = Date.now()
    const names = await userNames(ctx)
    await ctx.db.patch(source._id, {
      community: args.community?.trim() ?? source.community,
      sourceName: args.sourceName?.trim() ?? source.sourceName,
      pathId: args.pathId ?? source.pathId,
      permissionDocumentRef:
        args.permissionDocumentRef?.trim() ?? source.permissionDocumentRef,
      permissionDocumentUrl:
        args.permissionDocumentUrl ?? source.permissionDocumentUrl,
      permissionDate: args.permissionDate ?? source.permissionDate,
      accessLevel: args.accessLevel ?? source.accessLevel,
      attribution: args.attribution?.trim() ?? source.attribution,
      notes: args.notes ?? source.notes,
      status: args.status ?? source.status,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.source.update",
      entityType: "culturalSources",
      entityId: source._id,
      reason,
      before: sourceView(source, names),
      after: {
        accessLevel: args.accessLevel ?? source.accessLevel,
        status: args.status ?? source.status,
      },
    })
    return null
  },
})

async function pauseDependentWorks(
  ctx: MutationCtx,
  source: Doc<"culturalSources">,
  reason: string,
): Promise<string[]> {
  const effects: string[] = []
  if (source.workId) {
    const work = await ctx.db.get(source.workId)
    if (work && work.status === "published") {
      await ctx.db.patch(work._id, { status: "paused" })
      effects.push(`Karya ${work.title} dijeda.`)
    }
    const card = await ctx.db
      .query("workCards")
      .withIndex("by_workId", (q) => q.eq("workId", source.workId as Id<"works">))
      .first()
    if (card && card.status === "published") {
      await ctx.db.patch(card._id, { status: "paused", updatedAt: Date.now() })
      effects.push(`Kartu karya ${card.title} dijeda.`)
    }
  }
  if (source.pathId) {
    const works = await ctx.db
      .query("works")
      .withIndex("by_pathId", (q) => q.eq("pathId", source.pathId))
      .collect()
    for (const work of works) {
      if (work.status !== "published") continue
      if (source.workId && work._id === source.workId) continue
      await ctx.db.patch(work._id, { status: "paused" })
      effects.push(`Karya ${work.title} pada jalur ${source.pathId} dijeda.`)
    }
  }
  if (effects.length > 0) {
    await appendAudit(ctx, {
      actorId: "system",
      action: "governance.source.pauseListings",
      entityType: "culturalSources",
      entityId: source._id,
      reason,
      after: { effects },
      severity: "warning",
    })
  }
  return effects
}

export const requestWithdrawal = mutation({
  args: {
    sourceId: v.id("culturalSources"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const source = await ctx.db.get(args.sourceId)
    if (!source) fail("NOT_FOUND", "Sumber budaya tidak ditemukan.")
    if (source.withdrawalStatus === "withdrawn") {
      return { withdrawalStatus: "withdrawn" as const }
    }
    const timestamp = Date.now()
    await ctx.db.patch(source._id, {
      withdrawalStatus: "withdrawal_requested",
      withdrawalRequestedAt: timestamp,
      withdrawalReason: reason,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.source.withdrawal.request",
      entityType: "culturalSources",
      entityId: source._id,
      reason,
      before: { withdrawalStatus: source.withdrawalStatus },
      after: { withdrawalStatus: "withdrawal_requested" },
      severity: "warning",
    })
    return { withdrawalStatus: "withdrawal_requested" as const }
  },
})

export const withdrawCulturalSource = mutation({
  args: {
    sourceId: v.id("culturalSources"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const source = await ctx.db.get(args.sourceId)
    if (!source) fail("NOT_FOUND", "Sumber budaya tidak ditemukan.")
    if (source.withdrawalStatus === "withdrawn") {
      return { effects: [] as string[] }
    }
    const timestamp = Date.now()
    await ctx.db.patch(source._id, {
      withdrawalStatus: "withdrawn",
      permissionStatus: "withdrawn",
      withdrawnAt: timestamp,
      withdrawalReason: reason,
      updatedAt: timestamp,
    })
    const effects = await pauseDependentWorks(ctx, source, reason)
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.source.withdraw",
      entityType: "culturalSources",
      entityId: source._id,
      reason,
      before: { permissionStatus: source.permissionStatus, withdrawalStatus: source.withdrawalStatus },
      after: { permissionStatus: "withdrawn", withdrawalStatus: "withdrawn", effects },
      severity: "warning",
    })
    return { effects }
  },
})

export const restoreCulturalSource = mutation({
  args: {
    sourceId: v.id("culturalSources"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason, 8)
    const source = await ctx.db.get(args.sourceId)
    if (!source) fail("NOT_FOUND", "Sumber budaya tidak ditemukan.")
    const timestamp = Date.now()
    await ctx.db.patch(source._id, {
      withdrawalStatus: "active",
      permissionStatus: "granted",
      status: "active",
      withdrawnAt: undefined,
      withdrawalReason: undefined,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.source.restore",
      entityType: "culturalSources",
      entityId: source._id,
      reason,
      before: { withdrawalStatus: source.withdrawalStatus, permissionStatus: source.permissionStatus },
      after: { withdrawalStatus: "active", permissionStatus: "granted" },
    })
    return null
  },
})

function takedownView(request: Doc<"takedownRequests">): TakedownView {
  const effects =
    request.effects &&
    typeof request.effects === "object" &&
    "items" in request.effects &&
    Array.isArray((request.effects as { items?: unknown }).items)
      ? ((request.effects as { items: string[] }).items ?? [])
      : []
  return {
    id: request._id,
    code: request.code,
    targetType: request.targetType,
    targetId: request.targetId,
    targetLabel: request.targetLabel,
    culturalSourceId: request.culturalSourceId ?? null,
    requesterName: request.requesterName,
    requesterContact: request.requesterContact,
    reason: request.reason,
    evidence: request.evidence ?? null,
    status: request.status,
    decisionReason: request.decisionReason ?? null,
    decidedBy: request.decidedBy ?? null,
    decidedAt: request.decidedAt ?? null,
    completedAt: request.completedAt ?? null,
    reversedAt: request.reversedAt ?? null,
    effects,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  }
}

export const listTakedowns = query({
  args: {
    status: v.optional(takedownStatusValidator),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TakedownView[]> => {
    await requireAdmin(ctx, "governance.manage")
    const needle = args.q?.trim().toLowerCase() ?? ""
    const rows = await ctx.db.query("takedownRequests").collect()
    return rows
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => {
        if (!needle) return true
        return `${row.code} ${row.targetLabel} ${row.requesterName} ${row.reason}`
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(takedownView)
  },
})

export const createTakedown = mutation({
  args: {
    targetType: takedownTargetValidator,
    targetId: v.string(),
    targetLabel: v.string(),
    culturalSourceId: v.optional(v.id("culturalSources")),
    requesterName: v.string(),
    requesterContact: v.string(),
    reason: v.string(),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const requesterName = args.requesterName.trim()
    const requesterContact = args.requesterContact.trim()
    const targetLabel = args.targetLabel.trim()
    if (!requesterName || !requesterContact || !targetLabel) {
      fail("INVALID_TAKEDOWN", "Pemohon, kontak, dan target wajib diisi.")
    }
    const timestamp = Date.now()
    const takedownId = await ctx.db.insert("takedownRequests", {
      code: randomCode("TDK"),
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel,
      culturalSourceId: args.culturalSourceId,
      requesterName,
      requesterContact,
      reason,
      evidence: args.evidence,
      status: "requested",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.takedown.create",
      entityType: "takedownRequests",
      entityId: takedownId,
      reason,
      after: { targetType: args.targetType, targetId: args.targetId },
      severity: "warning",
    })
    return { takedownId }
  },
})

export const reviewTakedown = mutation({
  args: {
    takedownId: v.id("takedownRequests"),
    decision: v.union(v.literal("reviewing"), v.literal("approved"), v.literal("rejected")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const request = await ctx.db.get(args.takedownId)
    if (!request) fail("NOT_FOUND", "Permintaan takedown tidak ditemukan.")
    if (["completed", "reversed"].includes(request.status)) {
      fail("INVALID_TRANSITION", "Permintaan takedown ini sudah selesai.")
    }
    const timestamp = Date.now()
    await ctx.db.patch(request._id, {
      status: args.decision,
      decisionReason: reason,
      decidedBy: viewer.userId,
      decidedAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: `governance.takedown.${args.decision}`,
      entityType: "takedownRequests",
      entityId: request._id,
      reason,
      before: { status: request.status },
      after: { status: args.decision },
      severity: "warning",
    })
    return null
  },
})

type EffectSnapshot = {
  items: string[]
  before: { table: string; id: string; status: string }[]
}

export const executeTakedown = mutation({
  args: { takedownId: v.id("takedownRequests"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const request = await ctx.db.get(args.takedownId)
    if (!request) fail("NOT_FOUND", "Permintaan takedown tidak ditemukan.")
    if (request.status !== "approved") {
      fail("INVALID_TRANSITION", "Takedown harus disetujui sebelum dijalankan.")
    }
    const timestamp = Date.now()
    const effects: EffectSnapshot = { items: [], before: [] }
    let ownerId: Id<"users"> | null = null

    if (request.targetType === "work") {
      const work = await ctx.db.get(request.targetId as Id<"works">)
      if (work) {
        effects.before.push({ table: "works", id: work._id, status: work.status as string })
        ownerId = work.makerId ?? null
        await ctx.db.patch(work._id, { status: "paused" })
        effects.items.push(`Karya ${work.title} dihentikan dari tayang.`)
      }
      const cards = await ctx.db.query("workCards").collect()
      for (const card of cards) {
        if (card.workId !== request.targetId) continue
        if (card.status !== "published") continue
        effects.before.push({ table: "workCards", id: card._id, status: card.status })
        await ctx.db.patch(card._id, { status: "paused", updatedAt: timestamp })
        effects.items.push(`Kartu karya ${card.title} dijeda.`)
      }
      if (work?.pathId) {
        const related = await ctx.db
          .query("works")
          .withIndex("by_pathId", (q) => q.eq("pathId", work.pathId as string))
          .collect()
        for (const item of related) {
          if (item._id === work._id || item.status !== "published") continue
          effects.before.push({ table: "works", id: item._id, status: item.status ?? "draft" })
          await ctx.db.patch(item._id, { status: "paused" })
          effects.items.push(`Karya terkait ${item.title} dijeda.`)
        }
      }
    } else if (request.targetType === "content") {
      const revision = await ctx.db.get(request.targetId as Id<"contentRevisions">)
      if (revision) {
        effects.before.push({ table: "contentRevisions", id: revision._id, status: revision.status })
        await ctx.db.patch(revision._id, { status: "archived" })
        effects.items.push(`Revisi konten versi ${revision.version} diarsipkan.`)
      }
    } else if (request.targetType === "media") {
      const asset = await ctx.db.get(request.targetId as Id<"mediaAssets">)
      if (asset) {
        effects.before.push({ table: "mediaAssets", id: asset._id, status: asset.status })
        await ctx.db.patch(asset._id, { status: "archived" })
        effects.items.push(`Aset media ${asset.filename} diarsipkan.`)
      }
    } else if (request.targetType === "conversation") {
      const conversation = await ctx.db.get(request.targetId as Id<"conversations">)
      if (conversation) {
        effects.before.push({ table: "conversations", id: conversation._id, status: conversation.status })
        await ctx.db.patch(conversation._id, { status: "archived", updatedAt: timestamp })
        effects.items.push("Percakapan diarsipkan dari tampilan aktif.")
      }
    } else {
      const certificate = await ctx.db.get(request.targetId as Id<"certificates">)
      if (certificate) {
        if (certificate.status !== "issued") {
          fail("INVALID_TRANSITION", "Sertifikat ini tidak dapat dicabut lagi.")
        }
        effects.before.push({ table: "certificates", id: certificate._id, status: certificate.status })
        ownerId = certificate.studentId
        await ctx.db.patch(certificate._id, {
          status: "revoked",
          revokedAt: timestamp,
          revokedBy: viewer.userId,
          revokeReason: reason,
          updatedAt: timestamp,
        })
        await ctx.db.insert("certificateEvents", {
          certificateId: certificate._id,
          kind: "revoke",
          actorId: viewer.userId,
          reason,
          createdAt: timestamp,
        })
        effects.items.push(`Sertifikat ${certificate.serial} dicabut.`)
      }
    }

    if (ownerId) {
      await ctx.db.insert("notificationOutbox", {
        channel: "in_app",
        recipient: ownerId,
        recipientId: ownerId,
        template: "governance.takedown",
        payload: { code: request.code, reason },
        status: "pending",
        attempts: 0,
        scheduledAt: timestamp,
        title: "Karya atau kredensial ditahan",
        body: `Permintaan ${request.code} diproses. Buka dukungan bila perlu klarifikasi.`,
        entityType: "takedownRequests",
        entityId: request._id,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      effects.items.push("Pemilik menerima pemberitahuan dalam aplikasi.")
    }

    await ctx.db.patch(request._id, {
      status: "completed",
      completedAt: timestamp,
      effects,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.takedown.execute",
      entityType: "takedownRequests",
      entityId: request._id,
      reason,
      before: { status: request.status, before: effects.before },
      after: { status: "completed", effects: effects.items },
      severity: "critical",
    })
    return { effects: effects.items }
  },
})

export const reverseTakedown = mutation({
  args: { takedownId: v.id("takedownRequests"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason, 8)
    const request = await ctx.db.get(args.takedownId)
    if (!request) fail("NOT_FOUND", "Permintaan takedown tidak ditemukan.")
    if (request.status !== "completed") {
      fail("INVALID_TRANSITION", "Hanya takedown selesai yang dapat dibalik.")
    }
    if (request.targetType === "certificate") {
      fail("NOT_REVERSIBLE", "Pencabutan sertifikat tidak dibalik; terbitkan ulang.")
    }
    const effects = request.effects as EffectSnapshot | undefined
    for (const item of effects?.before ?? []) {
      if (item.table === "works") {
        await ctx.db.patch(item.id as Id<"works">, {
          status: item.status as "draft" | "review" | "published" | "paused" | "sold_out",
        })
      } else if (item.table === "workCards") {
        await ctx.db.patch(item.id as Id<"workCards">, {
          status: item.status as
            | "draft"
            | "submitted"
            | "teacher_confirmed"
            | "admin_review"
            | "published"
            | "paused"
            | "sold_out",
          updatedAt: Date.now(),
        })
      } else if (item.table === "contentRevisions") {
        await ctx.db.patch(item.id as Id<"contentRevisions">, {
          status: item.status as
            | "draft"
            | "in_review"
            | "scheduled"
            | "published"
            | "archived",
        })
      } else if (item.table === "mediaAssets") {
        await ctx.db.patch(item.id as Id<"mediaAssets">, {
          status: item.status as "active" | "archived",
        })
      } else if (item.table === "conversations") {
        await ctx.db.patch(item.id as Id<"conversations">, {
          status: item.status as "open" | "archived" | "flagged",
          updatedAt: Date.now(),
        })
      }
    }
    const timestamp = Date.now()
    await ctx.db.patch(request._id, {
      status: "reversed",
      reversedAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.takedown.reverse",
      entityType: "takedownRequests",
      entityId: request._id,
      reason,
      before: { status: "completed" },
      after: { status: "reversed" },
      severity: "warning",
    })
    return null
  },
})

function privacyView(
  request: Doc<"privacyRequests">,
  names: Map<string, string>,
): PrivacyRequestView {
  const subjectId = request.subjectUserId ?? request.requesterId ?? null
  return {
    id: request._id,
    requesterId: request.requesterId ?? null,
    requesterEmail: request.requesterEmail,
    subjectUserId: subjectId,
    subjectName: subjectId ? (names.get(subjectId) ?? null) : null,
    kind: request.kind,
    status: request.status,
    reason: request.reason ?? null,
    resolution: request.resolution ?? null,
    dataScope: request.dataScope ?? null,
    evidence: request.evidence ?? null,
    correction: request.correction ?? null,
    retentionHoldUntil: request.retentionHoldUntil ?? null,
    deletionAppliedAt: request.deletionAppliedAt ?? null,
    handledBy: request.handledBy ?? null,
    reviewedAt: request.reviewedAt ?? null,
    completedBy: request.completedBy ?? null,
    completedByName: request.completedBy
      ? (names.get(request.completedBy) ?? "Akun tidak ditemukan")
      : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    completedAt: request.completedAt ?? null,
  }
}

async function activeRetentionHold(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<Doc<"privacyRequests"> | null> {
  const rows = await ctx.db
    .query("privacyRequests")
    .withIndex("by_subjectUserId", (q) => q.eq("subjectUserId", userId))
    .collect()
  const timestamp = Date.now()
  return (
    rows.find(
      (row) =>
        row.kind === "hold" &&
        row.status === "completed" &&
        (row.retentionHoldUntil === undefined || row.retentionHoldUntil > timestamp),
    ) ?? null
  )
}

async function resolvePrivacyViewer(
  ctx: QueryCtx | MutationCtx,
): Promise<{ user: Doc<"users">; viewer: Awaited<ReturnType<typeof viewerForUser>>; admin: boolean }> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  const user = await ctx.db
    .query("users")
    .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
    .unique()
  if (!user) fail("UNAUTHENTICATED", "Masuk diperlukan.")
  if (user.status !== "active") fail("SUSPENDED", "Akun ini sedang ditangguhkan.")
  const viewer = await viewerForUser(ctx, user)
  return {
    user,
    viewer,
    admin: viewer.capabilities.includes("governance.manage"),
  }
}

export const listPrivacyRequests = query({
  args: {
    status: v.optional(privacyStatusValidator),
    kind: v.optional(privacyKindValidator),
  },
  handler: async (ctx, args): Promise<PrivacyRequestView[]> => {
    const { user, admin } = await resolvePrivacyViewer(ctx)
    const names = await userNames(ctx)
    const rows = await ctx.db.query("privacyRequests").collect()
    return rows
      .filter((row) => admin || row.requesterId === user._id)
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => !args.kind || row.kind === args.kind)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => privacyView(row, names))
  },
})

export const createPrivacyRequest = mutation({
  args: {
    kind: privacyKindValidator,
    reason: v.string(),
    subjectUserId: v.optional(v.id("users")),
    dataScope: v.optional(v.string()),
    correction: v.optional(
      v.object({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        region: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { user, viewer, admin } = await resolvePrivacyViewer(ctx)
    const subjectId = args.subjectUserId ?? user._id
    if (args.subjectUserId && args.subjectUserId !== user._id && !admin) {
      fail("FORBIDDEN", "Permintaan untuk akun lain memerlukan peran pengelola.")
    }
    const subject = await ctx.db.get(subjectId)
    if (!subject) fail("NOT_FOUND", "Akun subjek tidak ditemukan.")
    const reason = requireReason(args.reason)
    if (args.kind === "correction" && !args.correction) {
      fail("INVALID_REQUEST", "Permintaan koreksi memerlukan nilai pengganti.")
    }
    const timestamp = Date.now()
    const requestId = await ctx.db.insert("privacyRequests", {
      requesterId: user._id,
      requesterEmail: user.email,
      subjectUserId: subject._id,
      kind: args.kind,
      status: "open",
      reason,
      dataScope: args.dataScope,
      correction: args.correction,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.privacy.create",
      entityType: "privacyRequests",
      entityId: requestId,
      reason,
      after: { kind: args.kind, subjectUserId: subject._id },
    })
    return { requestId }
  },
})

export const reviewPrivacyRequest = mutation({
  args: {
    requestId: v.id("privacyRequests"),
    decision: v.union(v.literal("reviewing"), v.literal("completed"), v.literal("rejected")),
    resolution: v.string(),
    retentionHoldUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const request = await ctx.db.get(args.requestId)
    if (!request) fail("NOT_FOUND", "Permintaan privasi tidak ditemukan.")
    if (["completed", "rejected"].includes(request.status)) {
      fail("INVALID_TRANSITION", "Permintaan privasi ini sudah selesai.")
    }
    const resolution = requireReason(args.resolution)
    const timestamp = Date.now()
    const subjectId = request.subjectUserId ?? request.requesterId
    if (!subjectId) fail("NOT_FOUND", "Subjek permintaan tidak ditemukan.")
    const subject = await ctx.db.get(subjectId)
    if (!subject) fail("NOT_FOUND", "Subjek permintaan tidak ditemukan.")

    if (args.decision === "completed" && request.kind === "deletion") {
      const hold = await activeRetentionHold(ctx, subject._id)
      if (hold) {
        fail(
          "RETENTION_HOLD",
          "Penghapusan diblokir oleh retensi aktif. Selesaikan hold terlebih dahulu.",
        )
      }
      await ctx.db.patch(subject._id, {
        name: "Akun dihapus",
        email: `deleted+${subject._id}@kalanidhi.invalid`,
        initials: "AD",
        image: undefined,
        region: "",
        status: "deleted",
        updatedAt: timestamp,
      })
      await appendAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "governance.privacy.delete",
        entityType: "users",
        entityId: subject._id,
        reason: resolution,
        before: { status: subject.status },
        after: { status: "deleted", financialRecords: "preserved" },
        severity: "critical",
      })
    }

    if (args.decision === "completed" && request.kind === "correction") {
      const correction = request.correction
      if (!correction) fail("INVALID_REQUEST", "Nilai koreksi tidak tersedia.")
      await ctx.db.patch(subject._id, {
        name: correction.name ?? subject.name,
        email: correction.email ?? subject.email,
        region: correction.region ?? subject.region,
        updatedAt: timestamp,
      })
      await appendAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "governance.privacy.correct",
        entityType: "users",
        entityId: subject._id,
        reason: resolution,
        before: { name: subject.name, email: subject.email, region: subject.region },
        after: {
          name: correction.name ?? subject.name,
          email: correction.email ?? subject.email,
          region: correction.region ?? subject.region,
        },
      })
    }

    await ctx.db.patch(request._id, {
      status: args.decision,
      resolution,
      handledBy: viewer.userId,
      reviewedAt: timestamp,
      completedAt: args.decision === "completed" ? timestamp : undefined,
      completedBy: args.decision === "completed" ? viewer.userId : undefined,
      retentionHoldUntil:
        request.kind === "hold" && args.decision === "completed"
          ? (args.retentionHoldUntil ?? timestamp + 365 * DAY_MS)
          : request.retentionHoldUntil,
      deletionAppliedAt:
        request.kind === "deletion" && args.decision === "completed"
          ? timestamp
          : request.deletionAppliedAt,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: `governance.privacy.${args.decision}`,
      entityType: "privacyRequests",
      entityId: request._id,
      reason: resolution,
      before: { status: request.status },
      after: { status: args.decision },
      severity: "warning",
    })
    return null
  },
})

export const listImpersonations = query({
  args: {},
  handler: async (ctx): Promise<ImpersonationView[]> => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const names = await userNames(ctx)
    const rows = await ctx.db.query("impersonationSessions").collect()
    const timestamp = Date.now()
    return rows
      .filter((row) => row.actorId === viewer.userId || row.targetId === viewer.userId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((row) => ({
        id: row._id,
        actorId: row.actorId,
        actorName: names.get(row.actorId) ?? null,
        targetId: row.targetId,
        targetName: names.get(row.targetId) ?? null,
        reason: row.reason,
        readOnly: row.readOnly,
        startedAt: row.startedAt,
        expiresAt: row.expiresAt,
        endedAt: row.endedAt ?? null,
        active: !row.endedAt && row.expiresAt > timestamp,
      }))
  },
})

export const getImpersonation = query({
  args: { sessionId: v.id("impersonationSessions") },
  handler: async (ctx, args): Promise<ImpersonationView | null> => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const row = await ctx.db.get(args.sessionId)
    if (!row) return null
    if (row.actorId !== viewer.userId && row.targetId !== viewer.userId) {
      return null
    }
    const names = await userNames(ctx)
    return {
      id: row._id,
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? null,
      targetId: row.targetId,
      targetName: names.get(row.targetId) ?? null,
      reason: row.reason,
      readOnly: row.readOnly,
      startedAt: row.startedAt,
      expiresAt: row.expiresAt,
      endedAt: row.endedAt ?? null,
      active: !row.endedAt && row.expiresAt > Date.now(),
    }
  },
})

export const startImpersonation = mutation({
  args: {
    targetId: v.id("users"),
    reason: v.string(),
    minutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason, 8)
    if (args.targetId === viewer.userId) {
      fail("SELF_DEALING", "Tidak dapat melihat sebagai diri sendiri.")
    }
    const target = await ctx.db.get(args.targetId)
    if (!target) fail("NOT_FOUND", "Akun target tidak ditemukan.")
    if (target.roles.includes("admin")) {
      fail("INVALID_TARGET", "Pengelola tidak dapat melihat sebagai pengelola lain.")
    }
    if (target.status !== "active") {
      fail("INVALID_TARGET", "Hanya akun aktif yang dapat dilihat sebagai.")
    }
    const minutes = Math.min(Math.max(args.minutes ?? 15, 1), 60)
    const timestamp = Date.now()
    const expiresAt = timestamp + minutes * 60_000
    const sessionId = await ctx.db.insert("impersonationSessions", {
      actorId: viewer.userId as Id<"users">,
      targetId: target._id,
      reason,
      readOnly: true,
      startedAt: timestamp,
      expiresAt,
    })
    await ctx.db.insert("authLogs", {
      userId: target._id,
      kind: "impersonation",
      createdAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.impersonation.start",
      entityType: "impersonationSessions",
      entityId: sessionId,
      reason,
      after: { targetId: target._id, readOnly: true, expiresAt },
      severity: "warning",
    })
    return { sessionId, expiresAt, readOnly: true as const }
  },
})

export const endImpersonation = mutation({
  args: { sessionId: v.id("impersonationSessions"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const session = await ctx.db.get(args.sessionId)
    if (!session || session.actorId !== viewer.userId) {
      fail("NOT_FOUND", "Sesi pratinjau tidak ditemukan.")
    }
    if (session.endedAt) return null
    const timestamp = Date.now()
    await ctx.db.patch(session._id, { endedAt: timestamp })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.impersonation.end",
      entityType: "impersonationSessions",
      entityId: session._id,
      reason: args.reason?.trim() || "Sesi pratinjau diakhiri.",
      before: { endedAt: null },
      after: { endedAt: timestamp },
    })
    return null
  },
})

async function activeRecordGrant(
  ctx: MutationCtx,
  actorId: Id<"users">,
  entityType: Doc<"breakGlassGrants">["entityType"],
  entityId: string,
): Promise<Doc<"breakGlassGrants"> | null> {
  const rows = await ctx.db
    .query("breakGlassGrants")
    .withIndex("by_entity", (q) =>
      q.eq("entityType", entityType).eq("entityId", entityId),
    )
    .collect()
  const timestamp = Date.now()
  return (
    rows
      .filter(
        (row) =>
          row.actorId === actorId && !row.revokedAt && row.expiresAt > timestamp,
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  )
}

export const grantBreakGlass = mutation({
  args: {
    entityType: breakGlassEntityValidator,
    entityId: v.string(),
    reason: v.string(),
    minutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason, 8)
    const minutes = Math.min(Math.max(args.minutes ?? 10, 1), 120)
    const timestamp = Date.now()
    const expiresAt = timestamp + minutes * 60_000
    const grantId = await ctx.db.insert("breakGlassGrants", {
      actorId: viewer.userId as Id<"users">,
      entityType: args.entityType,
      entityId: args.entityId,
      reason,
      expiresAt,
      createdAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.breakGlass.grant",
      entityType: "breakGlassGrants",
      entityId: grantId,
      reason,
      after: { entityType: args.entityType, entityId: args.entityId, expiresAt },
      severity: "warning",
    })
    return { grantId, expiresAt }
  },
})

export const revokeBreakGlass = mutation({
  args: { grantId: v.id("breakGlassGrants"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const reason = requireReason(args.reason)
    const grant = await ctx.db.get(args.grantId)
    if (!grant) fail("NOT_FOUND", "Izin akses tidak ditemukan.")
    if (grant.revokedAt) return null
    const timestamp = Date.now()
    await ctx.db.patch(grant._id, {
      revokedAt: timestamp,
      revokedBy: viewer.userId,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.breakGlass.revoke",
      entityType: "breakGlassGrants",
      entityId: grant._id,
      reason,
      before: { revokedAt: null },
      after: { revokedAt: timestamp },
    })
    return null
  },
})

export const listBreakGlass = query({
  args: { activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<BreakGlassView[]> => {
    await requireAdmin(ctx, "governance.manage")
    const names = await userNames(ctx)
    const timestamp = Date.now()
    const [records, messages] = await Promise.all([
      ctx.db.query("breakGlassGrants").collect(),
      ctx.db.query("messageAccessGrants").collect(),
    ])
    const recordViews: BreakGlassView[] = records.map((row) => ({
      id: row._id,
      source: "record",
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? null,
      entityType: row.entityType,
      entityId: row.entityId,
      reason: row.reason,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt ?? null,
      revokedBy: row.revokedBy ?? null,
      revokedByName: row.revokedBy
        ? (names.get(row.revokedBy) ?? "Akun tidak ditemukan")
        : null,
      active: !row.revokedAt && row.expiresAt > timestamp,
    }))
    const messageViews: BreakGlassView[] = messages.map((row) => ({
      id: row._id,
      source: "message",
      actorId: row.actorId,
      actorName: names.get(row.actorId) ?? null,
      entityType: "conversation",
      entityId: row.conversationId,
      reason: row.reason,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      revokedAt: row.revokedAt ?? null,
      revokedBy: null,
      revokedByName: null,
      active: !row.revokedAt && row.expiresAt > timestamp,
    }))
    const rows = [...recordViews, ...messageViews].sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    return args.activeOnly ? rows.filter((row) => row.active) : rows
  },
})

export const logBreakGlassAccess = mutation({
  args: {
    entityType: breakGlassEntityValidator,
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "governance.manage")
    const grant = await activeRecordGrant(
      ctx,
      viewer.userId as Id<"users">,
      args.entityType,
      args.entityId,
    )
    if (!grant) {
      // A denied attempt is persisted. Do not throw: a Convex mutation rolls
      // back its writes on error, which would erase the denial audit trail.
      await appendAudit(ctx, {
        actorId: viewer.userId,
        actorRole: viewer.roleLabel,
        action: "governance.breakGlass.denied",
        entityType: args.entityType,
        entityId: args.entityId,
        reason: "Akses ditolak: tidak ada izin aktif.",
        severity: "warning",
      })
      return { allowed: false as const, grantId: null, expiresAt: null }
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "governance.breakGlass.access",
      entityType: args.entityType,
      entityId: args.entityId,
      reason: grant.reason,
      after: { grantId: grant._id, expiresAt: grant.expiresAt },
      severity: "warning",
    })
    return {
      allowed: true as const,
      grantId: grant._id,
      expiresAt: grant.expiresAt,
    }
  },
})

export const summary = query({
  args: {},
  handler: async (ctx): Promise<GovernanceSummary> => {
    await requireAdmin(ctx, "governance.manage")
    const timestamp = Date.now()
    const [sources, takedowns, privacy, impersonations, records, messages] =
      await Promise.all([
        ctx.db.query("culturalSources").collect(),
        ctx.db.query("takedownRequests").collect(),
        ctx.db.query("privacyRequests").collect(),
        ctx.db.query("impersonationSessions").collect(),
        ctx.db.query("breakGlassGrants").collect(),
        ctx.db.query("messageAccessGrants").collect(),
      ])
    return {
      sources: sources.filter((row) => row.status === "active").length,
      withdrawalPending: sources.filter(
        (row) => row.withdrawalStatus === "withdrawal_requested",
      ).length,
      takedownsOpen: takedowns.filter((row) =>
        ["requested", "reviewing", "approved"].includes(row.status),
      ).length,
      privacyOpen: privacy.filter((row) =>
        ["open", "reviewing"].includes(row.status),
      ).length,
      activeImpersonations: impersonations.filter(
        (row) => !row.endedAt && row.expiresAt > timestamp,
      ).length,
      activeBreakGlass:
        records.filter((row) => !row.revokedAt && row.expiresAt > timestamp)
          .length +
        messages.filter((row) => !row.revokedAt && row.expiresAt > timestamp)
          .length,
    }
  },
})
