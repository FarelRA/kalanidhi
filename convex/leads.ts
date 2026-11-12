import { ConvexError, v } from "convex/values"

import type {
  LeadAssignmentView,
  LeadDetail,
  LeadIntent,
  LeadNoteView,
  LeadOwner,
  LeadStatus,
  LeadSummary,
} from "../lib/admin/types"
import { now, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

const leadIntent = v.union(
  v.literal("student"),
  v.literal("institution"),
  v.literal("consultation"),
  v.literal("notify"),
)

const leadStatus = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("qualified"),
  v.literal("converted"),
  v.literal("lost"),
  v.literal("closed"),
  v.literal("spam"),
)

const leadView = v.union(
  v.literal("all"),
  v.literal("new"),
  v.literal("follow"),
  v.literal("institutions"),
  v.literal("done"),
  v.literal("spam"),
)

const ALLOWED_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "qualified", "lost", "spam"],
  contacted: ["qualified", "lost", "spam"],
  qualified: ["converted", "lost", "spam"],
  converted: [],
  lost: ["qualified", "spam"],
  closed: [],
  spam: ["new"],
}

/** Public landing form. No viewer is required and behaviour is unchanged. */
export const create = mutation({
  args: {
    intent: leadIntent,
    name: v.optional(v.string()),
    email: v.string(),
    whatsapp: v.optional(v.string()),
    institution: v.optional(v.string()),
    institutionType: v.optional(v.string()),
    participants: v.optional(v.number()),
    interest: v.optional(v.string()),
    message: v.optional(v.string()),
    source: v.optional(v.string()),
    consent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("leads", {
      ...args,
      status: "new" as const,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})

async function ownerMap(
  ctx: QueryCtx | MutationCtx,
): Promise<Map<string, LeadOwner>> {
  const users = await ctx.db.query("users").collect()
  return new Map(
    users.map((user) => [
      user._id,
      { id: user._id, name: user.name, email: user.email },
    ]),
  )
}

type LeadBundle = {
  lead: Doc<"leads">
  owner: LeadOwner | null
  notesCount: number
  followUpAt: number | null
}

async function loadBundles(
  ctx: QueryCtx | MutationCtx,
): Promise<LeadBundle[]> {
  const [leads, assignments, notes, owners] = await Promise.all([
    ctx.db.query("leads").collect(),
    ctx.db.query("leadAssignments").collect(),
    ctx.db.query("leadNotes").collect(),
    ownerMap(ctx),
  ])

  const assignmentByLead = new Map<string, Doc<"leadAssignments">>()
  for (const assignment of assignments) {
    const current = assignmentByLead.get(assignment.leadId)
    if (!current || assignment.createdAt > current.createdAt) {
      assignmentByLead.set(assignment.leadId, assignment)
    }
  }

  const notesByLead = new Map<string, { count: number; followUpAt: number | null }>()
  for (const note of notes) {
    const existing = notesByLead.get(note.leadId) ?? {
      count: 0,
      followUpAt: null,
    }
    existing.count += 1
    if (note.followUpAt && (!existing.followUpAt || note.followUpAt > existing.followUpAt)) {
      existing.followUpAt = note.followUpAt
    }
    notesByLead.set(note.leadId, existing)
  }

  return leads
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((lead) => {
      const assignment = assignmentByLead.get(lead._id)
      const note = notesByLead.get(lead._id)
      return {
        lead,
        owner: assignment ? (owners.get(assignment.ownerId) ?? null) : null,
        notesCount: note?.count ?? 0,
        followUpAt: note?.followUpAt ?? null,
      }
    })
}

function toSummary(bundle: LeadBundle): LeadSummary {
  const { lead } = bundle
  const ageDays = Math.max(0, Math.floor((now() - lead.createdAt) / 86_400_000))
  return {
    id: lead._id,
    intent: lead.intent as LeadIntent,
    name: lead.name ?? null,
    email: lead.email,
    whatsapp: lead.whatsapp ?? null,
    institution: lead.institution ?? null,
    institutionType: lead.institutionType ?? null,
    participants: lead.participants ?? null,
    interest: lead.interest ?? null,
    message: lead.message ?? null,
    source: lead.source ?? null,
    status: lead.status as LeadStatus,
    consent: lead.consent,
    owner: bundle.owner,
    notesCount: bundle.notesCount,
    followUpAt: bundle.followUpAt,
    convertedAt: lead.convertedAt ?? null,
    createdAt: lead.createdAt,
    ageDays,
  }
}

function matchesView(summary: LeadSummary, view: string): boolean {
  if (view === "all") return true
  if (view === "new") return summary.status === "new"
  if (view === "follow") {
    return ["new", "contacted", "qualified"].includes(summary.status)
  }
  if (view === "institutions") {
    return summary.intent === "institution"
  }
  if (view === "done") return summary.status === "converted"
  if (view === "spam") return summary.status === "spam"
  return true
}

function matchesQuery(summary: LeadSummary, q?: string): boolean {
  if (!q?.trim()) return true
  const needle = q.trim().toLowerCase()
  return `${summary.name ?? ""} ${summary.email} ${summary.whatsapp ?? ""} ${summary.institution ?? ""} ${summary.interest ?? ""} ${summary.source ?? ""} ${summary.owner?.name ?? ""}`
    .toLowerCase()
    .includes(needle)
}

function filteredSummaries(
  bundles: LeadBundle[],
  args: { view?: string; q?: string; status?: LeadStatus; intent?: LeadIntent; ownerId?: string },
): LeadSummary[] {
  return bundles
    .map(toSummary)
    .filter((summary) => matchesView(summary, args.view ?? "all"))
    .filter((summary) => matchesQuery(summary, args.q))
    .filter((summary) => !args.status || summary.status === args.status)
    .filter((summary) => !args.intent || summary.intent === args.intent)
    .filter((summary) => !args.ownerId || summary.owner?.id === args.ownerId)
}

export const list = query({
  args: {
    view: v.optional(leadView),
    q: v.optional(v.string()),
    status: v.optional(leadStatus),
    intent: v.optional(leadIntent),
    ownerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args): Promise<LeadSummary[]> => {
    await requireAdmin(ctx, "leads.read")
    return filteredSummaries(await loadBundles(ctx), args)
  },
})

export const get = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args): Promise<LeadDetail | null> => {
    await requireAdmin(ctx, "leads.read")
    const bundles = await loadBundles(ctx)
    const bundle = bundles.find((item) => item.lead._id === args.id)
    if (!bundle) return null

    const [notes, assignments, owners] = await Promise.all([
      ctx.db
        .query("leadNotes")
        .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
        .collect(),
      ctx.db
        .query("leadAssignments")
        .withIndex("by_leadId", (q) => q.eq("leadId", args.id))
        .collect(),
      ownerMap(ctx),
    ])

    const noteViews: LeadNoteView[] = notes
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((note) => ({
        id: note._id,
        authorId: note.authorId,
        authorName: owners.get(note.authorId)?.name ?? note.authorId,
        kind: note.kind,
        body: note.body,
        followUpAt: note.followUpAt ?? null,
        createdAt: note.createdAt,
      }))

    const assignmentViews: LeadAssignmentView[] = assignments
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((assignment) => ({
        id: assignment._id,
        ownerId: assignment.ownerId,
        ownerName: owners.get(assignment.ownerId)?.name ?? assignment.ownerId,
        assignedBy: assignment.assignedBy,
        createdAt: assignment.createdAt,
      }))

    return {
      lead: toSummary(bundle),
      notes: noteViews,
      assignments: assignmentViews,
    }
  },
})

export const owners = query({
  args: {},
  handler: async (ctx): Promise<LeadOwner[]> => {
    await requireAdmin(ctx, "leads.read")
    const users = await ctx.db.query("users").collect()
    return users
      .filter((user) => user.roles.includes("admin") && user.status === "active")
      .map((user) => ({ id: user._id, name: user.name, email: user.email }))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

async function assignLead(
  ctx: MutationCtx,
  actorId: string,
  actorRole: string,
  leadId: Id<"leads">,
  ownerId: Id<"users">,
  reason: string,
) {
  const lead = await ctx.db.get(leadId)
  if (!lead) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Lead tidak ada." })
  }
  const owner = await ctx.db.get(ownerId)
  if (!owner || owner.status !== "active") {
    throw new ConvexError({
      code: "OWNER_NOT_ACTIVE",
      message: "Pemilik lead harus akun aktif.",
    })
  }

  await ctx.db.insert("leadAssignments", {
    leadId,
    ownerId,
    assignedBy: actorId,
    createdAt: now(),
  })
  await ctx.db.patch(leadId, {
    updatedAt: now(),
  })
  await appendAudit(ctx, {
    actorId,
    actorRole,
    action: "leads.assign",
    entityType: "leads",
    entityId: leadId,
    reason,
    after: { ownerId, ownerName: owner.name },
  })
}

export const assign = mutation({
  args: {
    leadId: v.id("leads"),
    ownerId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const reason = requireReason(args.reason)
    await assignLead(
      ctx,
      viewer.userId,
      viewer.roleLabel,
      args.leadId,
      args.ownerId,
      reason,
    )
    return null
  },
})

export const addNote = mutation({
  args: {
    leadId: v.id("leads"),
    kind: v.union(
      v.literal("note"),
      v.literal("call"),
      v.literal("email"),
      v.literal("whatsapp"),
    ),
    body: v.string(),
    followUpAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const body = args.body.trim()
    if (body.length < 2) {
      throw new ConvexError({
        code: "NOTE_REQUIRED",
        message: "Catatan tidak boleh kosong.",
      })
    }
    const lead = await ctx.db.get(args.leadId)
    if (!lead) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead tidak ada." })
    }

    const noteId = await ctx.db.insert("leadNotes", {
      leadId: args.leadId,
      authorId: viewer.userId,
      kind: args.kind,
      body,
      followUpAt: args.followUpAt,
      createdAt: now(),
    })
    await ctx.db.patch(args.leadId, { updatedAt: now() })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "leads.note",
      entityType: "leads",
      entityId: args.leadId,
      reason: body.slice(0, 160),
      after: { kind: args.kind, followUpAt: args.followUpAt ?? null },
    })
    return noteId
  },
})

async function changeStatus(
  ctx: MutationCtx,
  actorId: string,
  actorRole: string,
  leadId: Id<"leads">,
  status: LeadStatus,
  reason: string,
) {
  const lead = await ctx.db.get(leadId)
  if (!lead) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Lead tidak ada." })
  }
  if (lead.status === status) return
  const allowed = ALLOWED_TRANSITIONS[lead.status as LeadStatus] ?? []
  if (!allowed.includes(status)) {
    throw new ConvexError({
      code: "INVALID_TRANSITION",
      message: `Lead tidak bisa berpindah dari ${lead.status} ke ${status}.`,
    })
  }

  await ctx.db.patch(leadId, {
    status,
    updatedAt: now(),
    convertedAt: status === "converted" ? now() : lead.convertedAt,
  })
  await appendAudit(ctx, {
    actorId,
    actorRole,
    action: "leads.status",
    entityType: "leads",
    entityId: leadId,
    reason,
    before: { status: lead.status },
    after: { status },
  })
}

export const setStatus = mutation({
  args: {
    leadId: v.id("leads"),
    status: leadStatus,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const reason = requireReason(args.reason)
    await changeStatus(
      ctx,
      viewer.userId,
      viewer.roleLabel,
      args.leadId,
      args.status as LeadStatus,
      reason,
    )
    return null
  },
})

export const convert = mutation({
  args: { leadId: v.id("leads"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const reason = requireReason(args.reason)
    const lead = await ctx.db.get(args.leadId)
    if (!lead) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Lead tidak ada." })
    }
    if (lead.status !== "qualified") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Lead harus terkualifikasi sebelum dikonversi.",
      })
    }

    const timestamp = now()
    await ctx.db.patch(lead._id, {
      status: "converted",
      convertedAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.insert("leadNotes", {
      leadId: lead._id,
      authorId: viewer.userId,
      kind: "note",
      body: "Lead dikonversi. Pendaftaran peserta dilakukan melalui tautan pendaftaran publik.",
      createdAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "leads.convert",
      entityType: "leads",
      entityId: lead._id,
      reason,
      before: { status: lead.status },
      after: { status: "converted" },
    })

    return {
      registrationPath: `/daftar?email=${encodeURIComponent(lead.email)}`,
      status: "converted" as const,
    }
  },
})

export const bulkAssign = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    ownerId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const reason = requireReason(args.reason)
    for (const leadId of args.leadIds) {
      await assignLead(
        ctx,
        viewer.userId,
        viewer.roleLabel,
        leadId,
        args.ownerId,
        reason,
      )
    }
    return { updated: args.leadIds.length }
  },
})

export const bulkStatus = mutation({
  args: {
    leadIds: v.array(v.id("leads")),
    status: leadStatus,
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.write")
    const reason = requireReason(args.reason)
    let updated = 0
    for (const leadId of args.leadIds) {
      try {
        await changeStatus(
          ctx,
          viewer.userId,
          viewer.roleLabel,
          leadId,
          args.status as LeadStatus,
          reason,
        )
        updated += 1
      } catch {
        // A legal transition is required per row; skip the illegal ones.
      }
    }
    return { updated }
  },
})

/**
 * Export is a typed query plus a mutation wrapper: the mutation logs the
 * export, the client turns the rows into CSV. No server file is written.
 */
export const exportLeads = mutation({
  args: {
    view: v.optional(leadView),
    q: v.optional(v.string()),
    status: v.optional(leadStatus),
    intent: v.optional(leadIntent),
    ownerId: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "leads.read")
    const reason = requireReason(args.reason)
    const rows = filteredSummaries(await loadBundles(ctx), args)
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "leads.export",
      entityType: "leads",
      entityId: args.view ?? "all",
      reason,
      after: { rows: rows.length, view: args.view ?? "all" },
    })
    return { rows, generatedAt: now() }
  },
})
