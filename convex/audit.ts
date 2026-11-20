import { v } from "convex/values"

import { LOG_KINDS } from "../lib/admin/log"
import type {
  LogDetail,
  LogKind,
  LogListResult,
  LogRow,
} from "../lib/admin/types"
import { requireAdmin } from "./admin_context"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"
import { severityValidator } from "./tables/common"

const logKindValidator = v.union(
  ...LOG_KINDS.map((kind) => v.literal(kind)),
)

export type AuditInput = {
  actorId: string
  actorRole?: string
  action: string
  entityType: string
  entityId?: string
  reason?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  requestId?: string
  severity?: "info" | "warning" | "error" | "critical"
}

/**
 * Append-only audit event. There is deliberately no update or delete export
 * anywhere in this module or the database schema.
 */
export async function appendAudit(
  ctx: MutationCtx,
  input: AuditInput,
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    reason: input.reason,
    before: input.before,
    after: input.after,
    requestId: input.requestId,
    severity: input.severity ?? "info",
    createdAt: Date.now(),
  })
}

function maskEmail(value: string): string {
  const [name, domain] = value.split("@")
  if (!domain) return "***"
  const head = name.slice(0, 1)
  return `${head}***@${domain}`
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "")
  return digits.length > 4 ? `***${digits.slice(-4)}` : "***"
}

const ENTITY_LABELS: Record<string, string> = {
  auditLogs: "Audit",
  auth: "Autentikasi",
  authLogs: "Autentikasi",
  breakGlassGrants: "Akses darurat",
  calls: "Panggilan",
  certificates: "Sertifikat",
  content: "Konten",
  contentLocks: "Kunci konten",
  contentRevisions: "Revisi konten",
  conversations: "Percakapan",
  culturalSources: "Sumber budaya",
  faqs: "FAQ",
  flowDefinitions: "Definisi proses",
  impersonationSessions: "Sesi pratinjau",
  leads: "Lead",
  mediaAssets: "Aset media",
  moderation: "Moderasi",
  notifications: "Notifikasi",
  payments: "Pembayaran",
  privacyRequests: "Permintaan privasi",
  siteContent: "Konten landing",
  stats: "Statistik",
  takedownRequests: "Takedown",
  users: "Akun",
  workCards: "Kartu karya",
  works: "Karya",
}

function entityLabel(entityType: string): string {
  if (ENTITY_LABELS[entityType]) return ENTITY_LABELS[entityType]
  const spaced = entityType
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
  if (!spaced) return "Catatan"
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

async function userNamesFor(
  ctx: QueryCtx | MutationCtx,
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(
      ids.filter(
        (id): id is string => Boolean(id) && id !== "system",
      ),
    ),
  )
  const users = await Promise.all(
    unique.map(async (id) => {
      try {
        return await ctx.db.get(id as Id<"users">)
      } catch {
        return null
      }
    }),
  )
  return new Map(
    unique.map((id, index) => [id, users[index]?.name ?? "Akun tidak ditemukan"]),
  )
}

function displayActor(
  id: string | null | undefined,
  names: Map<string, string>,
): string | null {
  if (!id) return null
  if (id === "system") return "Sistem"
  return names.get(id) ?? "Akun tidak ditemukan"
}

type InternalLogRow = LogRow & {
  actorId?: string | null
  entityType?: string
}

function inRange(
  timestamp: number,
  filter: { from?: number; to?: number },
): boolean {
  if (filter.from !== undefined && timestamp < filter.from) return false
  if (filter.to !== undefined && timestamp > filter.to) return false
  return true
}

function matchesQuery(row: InternalLogRow, q?: string): boolean {
  if (!q) return true
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  return `${row.actor ?? ""} ${row.action} ${row.entity} ${row.entityType ?? ""} ${row.entityId ?? ""} ${row.detail} ${row.requestId ?? ""}`
    .toLowerCase()
    .includes(needle)
}

type LogFilters = {
  actorId?: string
  entityType?: string
  entityId?: string
  action?: string
  severity?: "info" | "warning" | "error" | "critical"
  requestId?: string
  from?: number
  to?: number
  q?: string
}

function filterRows(
  rows: InternalLogRow[],
  filters: LogFilters,
): InternalLogRow[] {
  return rows
    .filter((row) => {
      if (filters.actorId && row.actorId !== filters.actorId) return false
      if (
        filters.entityType &&
        !(row.entityType ?? row.entity).startsWith(filters.entityType)
      ) {
        return false
      }
      if (filters.entityId && row.entityId !== filters.entityId) return false
      if (filters.action && row.action !== filters.action) return false
      if (filters.severity && row.severity !== filters.severity) return false
      if (filters.requestId && row.requestId !== filters.requestId) return false
      if (!inRange(row.createdAt, filters)) return false
      return matchesQuery(row, filters.q)
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

function severityForStatus(status: string): LogRow["severity"] {
  if (["dead", "failed", "down"].includes(status)) return "error"
  if (["pending", "degraded"].includes(status)) return "warning"
  return "info"
}

async function auditRows(
  rows: Doc<"auditLogs">[],
  filters: LogFilters,
  names: Map<string, string>,
): Promise<InternalLogRow[]> {
  return filterRows(
    rows.map((row) => ({
      id: row._id,
      kind: "audit" as const,
      label: "Audit",
      actorId: row.actorId ?? null,
      actor: displayActor(row.actorId, names),
      action: row.action,
      entityType: row.entityType,
      entity: entityLabel(row.entityType),
      entityId: row.entityId ?? null,
      severity: row.severity,
      requestId: row.requestId ?? null,
      detail: row.reason ?? "",
      createdAt: row.createdAt,
    })),
    filters,
  )
}

async function collectRows(
  ctx: QueryCtx | MutationCtx,
  kind: LogKind,
  filters: LogFilters,
): Promise<LogListResult> {
  if (kind === "audit") {
    const rows = await ctx.db
      .query("auditLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(500)
    const names = await userNamesFor(
      ctx,
      rows.map((row) => row.actorId),
    )
    return {
      kind,
      available: true,
      note: null,
      rows: await auditRows(rows, filters, names),
    }
  }

  if (kind === "auth") {
    const rows = await ctx.db
      .query("authLogs")
      .withIndex("by_createdAt")
      .order("desc")
      .take(500)
    const names = await userNamesFor(
      ctx,
      rows.map((row) => row.userId ?? row.authUserId),
    )
    return {
      kind,
      available: true,
      note: "Token, alamat IP, dan user agent tidak ditampilkan.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Auth",
          actorId: row.userId ?? row.authUserId ?? null,
          actor: displayActor(row.userId ?? row.authUserId, names),
          action: row.kind,
          entityType: "auth",
          entity: entityLabel("auth"),
          entityId: row.userId ?? null,
          severity:
            row.kind === "failed_sign_in"
              ? ("warning" as const)
              : ("info" as const),
          requestId: row.requestId ?? null,
          detail: "Peristiwa sesi autentikasi.",
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  if (kind === "payments") {
    const rows = await ctx.db
      .query("paymentEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(500)
    return {
      kind,
      available: true,
      note: "Payload provider tidak ditampilkan.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Pembayaran",
          actorId: null,
          actor: null,
          action: row.kind,
          entityType: "payments",
          entity: entityLabel("payments"),
          entityId: row.paymentId ?? row.orderId ?? null,
          severity:
            row.kind === "failed" ? ("error" as const) : ("info" as const),
          requestId: null,
          detail: row.amount
            ? `Nominal ${row.amount.toLocaleString("id-ID")} rupiah.`
            : "Peristiwa pembayaran.",
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  if (kind === "notifications") {
    const rows = await ctx.db.query("notificationOutbox").collect()
    return {
      kind,
      available: true,
      note: "Alamat penerima disamarkan.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Notifikasi",
          actorId: null,
          actor: null,
          action: `${row.channel}:${row.status}`,
          entityType: "notifications",
          entity: entityLabel("notifications"),
          entityId: row._id,
          severity: severityForStatus(row.status),
          requestId: null,
          detail: [
            `${row.template} ke ${row.recipient.includes("@") ? maskEmail(row.recipient) : maskPhone(row.recipient)}.`,
            `${row.attempts} percobaan.`,
            `Dijadwalkan ${new Date(row.scheduledAt).toISOString()}.`,
            row.sentAt ? `Terkirim ${new Date(row.sentAt).toISOString()}.` : "Belum terkirim.",
            row.error ? `Galat, ${row.error}` : null,
          ]
            .filter(Boolean)
            .join(" "),
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  if (kind === "calls") {
    const rows = await ctx.db.query("callEvents").collect()
    const names = await userNamesFor(
      ctx,
      rows.map((row) => row.actorId),
    )
    return {
      kind,
      available: true,
      note: "Payload panggilan tidak ditampilkan.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Panggilan",
          actorId: row.actorId ?? null,
          actor: displayActor(row.actorId, names),
          action: row.kind,
          entityType: "calls",
          entity: entityLabel("calls"),
          entityId: row.callId,
          severity: "info" as const,
          requestId: null,
          detail: "Peristiwa panggilan.",
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  if (kind === "moderation") {
    const rows = await ctx.db.query("messageFlags").collect()
    const names = await userNamesFor(
      ctx,
      rows.map((row) => row.reportedBy),
    )
    return {
      kind,
      available: true,
      note: "Isi pesan tidak ditampilkan tanpa break-glass.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Moderasi",
          actorId: row.reportedBy,
          actor: displayActor(row.reportedBy, names),
          action: `flag:${row.status}`,
          entityType: "moderation",
          entity: entityLabel("moderation"),
          entityId: row.messageId,
          severity: row.status === "open" ? ("warning" as const) : ("info" as const),
          requestId: null,
          detail: row.reason,
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  if (kind === "content") {
    const rows = await ctx.db
      .query("contentRevisions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(500)
    const names = await userNamesFor(
      ctx,
      rows.map((row) => row.authorId),
    )
    return {
      kind,
      available: true,
      note: "Snapshots lengkap tersedia di editor konten.",
      rows: filterRows(
        rows.map((row) => ({
          id: row._id,
          kind,
          label: "Konten",
          actorId: row.authorId,
          actor: displayActor(row.authorId, names),
          action: `revision:${row.status}`,
          entityType: "content",
          entity: entityLabel("content"),
          entityId: String(row.version),
          severity: "info" as const,
          requestId: null,
          detail: row.note,
          createdAt: row.createdAt,
        })),
        filters,
      ),
    }
  }

  return {
    kind,
    available: false,
    note:
      kind === "api"
        ? "Log API belum memiliki sumber data pada fase ini."
        : "Log galat belum memiliki sumber data pada fase ini.",
    rows: [],
  }
}

export const list = query({
  args: {
    kind: v.optional(logKindValidator),
    actorId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    severity: v.optional(severityValidator),
    requestId: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<LogListResult> => {
    await requireAdmin(ctx, "logs.read")
    return await collectRows(ctx, args.kind ?? "audit", args)
  },
})

export const get = query({
  args: { kind: logKindValidator, id: v.string() },
  handler: async (ctx, args): Promise<LogDetail | null> => {
    await requireAdmin(ctx, "logs.read")
    const result = await collectRows(ctx, args.kind, {})
    const row = result.rows.find((item) => item.id === args.id)
    if (!row) return null

    const allKinds: LogKind[] = LOG_KINDS.filter(
      (kind) => kind !== "api" && kind !== "errors",
    )
    const related: LogRow[] = []
    for (const kind of allKinds) {
      const collection = await collectRows(ctx, kind, {
        requestId: row.requestId ?? undefined,
        entityId: row.entityId ?? undefined,
      })
      for (const item of collection.rows) {
        if (item.id === row.id && item.kind === row.kind) continue
        if (
          (row.requestId && item.requestId === row.requestId) ||
          (row.entityId && item.entityId === row.entityId)
        ) {
          related.push(item)
        }
      }
    }
    related.sort((a, b) => b.createdAt - a.createdAt)

    let before: Record<string, unknown> | null = null
    let after: Record<string, unknown> | null = null
    if (args.kind === "audit") {
      const doc = await ctx.db.get(args.id as Id<"auditLogs">)
      before = (doc?.before as Record<string, unknown> | undefined) ?? null
      after = (doc?.after as Record<string, unknown> | undefined) ?? null
    }

    return {
      ...row,
      available: result.available,
      before,
      after,
      correlation: {
        requestId: row.requestId,
        entityType:
          (row as InternalLogRow).entityType ?? row.entity,
        entityId: row.entityId,
        events: related.slice(0, 20),
      },
    }
  },
})

export const exportLogs = mutation({
  args: {
    kind: logKindValidator,
    reason: v.string(),
    actorId: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    action: v.optional(v.string()),
    severity: v.optional(severityValidator),
    requestId: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "logs.read")
    const result = await collectRows(ctx, args.kind, args)
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "audit.export",
      entityType: "auditLogs",
      entityId: args.kind,
      reason: args.reason,
      after: { kind: args.kind, rows: result.rows.length },
    })
    return { kind: args.kind, rows: result.rows, generatedAt: Date.now() }
  },
})
