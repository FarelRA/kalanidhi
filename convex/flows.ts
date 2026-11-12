import { ConvexError, v } from "convex/values"

import {
  AUTOMATION_ACTIONS,
  AUTOMATION_TRIGGERS,
  FLOW_KEYS,
  flowSpec,
  isFlowKey,
  isTerminalState,
  stateLabel,
  type AutomationAction,
  type AutomationTrigger,
  type FlowKey,
} from "../lib/flows/definitions"
import type {
  FlowAutomationView,
  FlowDefinitionView,
  FlowOverview,
  FlowSlaView,
  StuckRecordView,
} from "../lib/flows/types"
import type { Id } from "./_generated/dataModel"
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server"
import { requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"

const MINUTE_MS = 60_000

const flowKeyValidator = v.union(...FLOW_KEYS.map((key) => v.literal(key)))
const roleValidator = v.union(
  v.literal("admin"),
  v.literal("teacher"),
  v.literal("student"),
  v.literal("system"),
)
const triggerValidator = v.union(
  ...AUTOMATION_TRIGGERS.map((trigger) => v.literal(trigger)),
)
const actionValidator = v.union(
  ...AUTOMATION_ACTIONS.map((action) => v.literal(action)),
)
const automationKindValidator = v.union(
  v.literal("assignment"),
  v.literal("reminder"),
  v.literal("escalation"),
  v.literal("notification"),
)

function fail(code: string, message: string): never {
  throw new ConvexError({ code, message })
}

export function assertFlowKey(value: string): FlowKey {
  if (!isFlowKey(value)) fail("INVALID_FLOW", "Alur tidak dikenal.")
  return value
}

export function flowSlaMinutes(targetMinutes: number): number {
  return Math.max(1, Math.round(targetMinutes))
}

type FlowContext = QueryCtx | MutationCtx

async function slaFor(
  ctx: FlowContext,
  flowKey: FlowKey,
): Promise<FlowSlaView> {
  const rows = await ctx.db
    .query("slaPolicies")
    .withIndex("by_flowKey", (q) => q.eq("flowKey", flowKey))
    .collect()
  const configured = rows
    .filter((row) => row.active)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const spec = flowSpec(flowKey)
  if (!configured) {
    return {
      key: spec.sla.key,
      flowKey,
      name: spec.sla.name,
      targetMinutes: spec.sla.targetMinutes,
      escalationMinutes: spec.sla.escalationMinutes ?? null,
      owner: spec.sla.owner,
      active: true,
    }
  }
  return {
    key: configured.key,
    flowKey,
    name: configured.name,
    targetMinutes: configured.targetMinutes,
    escalationMinutes: configured.escalationMinutes ?? null,
    owner: configured.owner,
    active: configured.active,
  }
}

async function automationsFor(
  ctx: FlowContext,
  flowKey: FlowKey,
): Promise<FlowAutomationView[]> {
  const rows = await ctx.db
    .query("automationRules")
    .withIndex("by_flowKey", (q) => q.eq("flowKey", flowKey))
    .collect()
  if (rows.length > 0) {
    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => ({
        key: row.key,
        flowKey,
        kind: row.kind,
        trigger: row.trigger as AutomationTrigger,
        action: row.action as AutomationAction,
        enabled: row.enabled,
      }))
  }
  return flowSpec(flowKey).automations.map((item) => ({
    ...item,
    flowKey,
  }))
}

export async function definitionFor(
  ctx: FlowContext,
  flowKey: FlowKey,
): Promise<FlowDefinitionView> {
  const spec = flowSpec(flowKey)
  const definition = await ctx.db
    .query("flowDefinitions")
    .withIndex("by_key", (q) => q.eq("key", flowKey))
    .unique()
  const storedTransitions = await ctx.db
    .query("flowTransitions")
    .withIndex("by_flowKey", (q) => q.eq("flowKey", flowKey))
    .collect()

  const transitions =
    storedTransitions.length > 0
      ? storedTransitions
          .sort((a, b) => a.createdAt - b.createdAt)
          .map((row) => ({
            from: row.fromState,
            to: row.toState,
            guard: row.guard,
            requiresRole: (row.requiresRole ?? null) as
              | "admin"
              | "teacher"
              | "student"
              | "system"
              | null,
            slaHours: row.slaHours ?? null,
          }))
      : spec.transitions.map((item) => ({
          from: item.from,
          to: item.to,
          guard: item.guard,
          requiresRole: item.requiresRole ?? null,
          slaHours: item.slaHours ?? null,
        }))

  return {
    key: flowKey,
    name: definition?.name ?? spec.name,
    owner: definition?.owner ?? spec.owner,
    description: definition?.description ?? spec.description,
    version: definition?.version ?? 0,
    active: definition?.active ?? true,
    source: definition ? "configured" : "default",
    states: spec.states.map((item) => ({
      key: item.key,
      label: item.label,
      terminal: item.terminal ?? false,
      tone: item.tone,
    })),
    transitions,
    sla: await slaFor(ctx, flowKey),
    automations: await automationsFor(ctx, flowKey),
  }
}

export const listDefinitions = query({
  args: {},
  handler: async (ctx): Promise<FlowDefinitionView[]> => {
    await requireAdmin(ctx, "flows.manage")
    return await Promise.all(FLOW_KEYS.map((key) => definitionFor(ctx, key)))
  },
})

export const getDefinition = query({
  args: { flowKey: flowKeyValidator },
  handler: async (ctx, args): Promise<FlowDefinitionView> => {
    await requireAdmin(ctx, "flows.manage")
    return await definitionFor(ctx, assertFlowKey(args.flowKey))
  },
})

export const slas = query({
  args: { flowKey: v.optional(flowKeyValidator) },
  handler: async (ctx, args): Promise<FlowSlaView[]> => {
    await requireAdmin(ctx, "flows.manage")
    const keys = args.flowKey ? [assertFlowKey(args.flowKey)] : FLOW_KEYS
    return await Promise.all(keys.map((key) => slaFor(ctx, key)))
  },
})

export const automationRules = query({
  args: { flowKey: v.optional(flowKeyValidator) },
  handler: async (ctx, args): Promise<FlowAutomationView[]> => {
    await requireAdmin(ctx, "flows.manage")
    const keys = args.flowKey ? [assertFlowKey(args.flowKey)] : FLOW_KEYS
    const rows = await Promise.all(keys.map((key) => automationsFor(ctx, key)))
    return rows.flat()
  },
})

type DistributionRecord = {
  recordId: string
  state: string
  createdAt: number
  label: string
  ownerId: string | null
}

const STUCK_STATES: Record<FlowKey, string[]> = {
  lead: ["new", "contacted", "qualified"],
  teacher: ["review"],
  enrollment: ["pending_payment"],
  submission: ["submitted", "under_review"],
  assessment: ["queued", "in_review"],
  certificate: [],
  work: ["submitted", "teacher_confirmed", "admin_review"],
  order: ["awaiting_payment", "in_progress", "delivered"],
  payment: ["pending"],
  payout: ["pending", "approved"],
  refund: ["requested", "reviewing"],
  call: ["scheduled"],
  support: ["open", "pending"],
  content: ["in_review"],
}

const NEXT_ACTION: Record<FlowKey, string> = {
  lead: "Hubungi lead dan catat kualifikasi",
  teacher: "Tinjau dossier pengajar",
  enrollment: "Cocokkan pembayaran",
  submission: "Buka tugas dan nilai",
  assessment: "Selesaikan rubrik",
  certificate: "Periksa penerbitan",
  work: "Tinjau izin dan moderasi karya",
  order: "Tindak lanjuti pesanan",
  payment: "Rekonsiliasi pembayaran",
  payout: "Putuskan pencairan",
  refund: "Tinjau bukti refund",
  call: "Konfirmasi jadwal panggilan",
  support: "Balas tiket",
  content: "Tinjau revisi konten",
}

async function userNameMap(ctx: FlowContext): Promise<Map<string, string>> {
  const users = await ctx.db.query("users").collect()
  return new Map(users.map((user) => [user._id, user.name]))
}

async function loadRecords(
  ctx: FlowContext,
  flowKey: FlowKey,
): Promise<DistributionRecord[]> {
  switch (flowKey) {
    case "lead": {
      const [leads, assignments] = await Promise.all([
        ctx.db.query("leads").collect(),
        ctx.db.query("leadAssignments").collect(),
      ])
      const ownerByLead = new Map<string, string>()
      for (const assignment of assignments.sort(
        (a, b) => a.createdAt - b.createdAt,
      )) {
        ownerByLead.set(assignment.leadId, assignment.ownerId)
      }
      return leads.map((lead) => ({
        recordId: lead._id,
        state: lead.status,
        createdAt: lead.createdAt,
        label: lead.name ?? lead.email,
        ownerId: ownerByLead.get(lead._id) ?? null,
      }))
    }
    case "teacher": {
      const teachers = await ctx.db.query("teachers").collect()
      return teachers.map((teacher) => ({
        recordId: teacher._id,
        state: teacher.status ?? (teacher.verified ? "active" : "review"),
        createdAt: teacher.verifiedAt ?? 0,
        label: teacher.name,
        ownerId: teacher.userId ?? null,
      }))
    }
    case "enrollment": {
      const [enrollments, cohorts] = await Promise.all([
        ctx.db.query("enrollments").collect(),
        ctx.db.query("cohorts").collect(),
      ])
      const teacherByCohort = new Map(
        cohorts.map((cohort) => [cohort._id, cohort.teacherId] as const),
      )
      return enrollments.map((enrollment) => ({
        recordId: enrollment._id,
        state: enrollment.status,
        createdAt: enrollment.createdAt,
        label: enrollment.pathId,
        ownerId: enrollment.cohortId
          ? (teacherByCohort.get(enrollment.cohortId) ?? null)
          : null,
      }))
    }
    case "submission": {
      const [submissions, cohorts] = await Promise.all([
        ctx.db.query("submissions").collect(),
        ctx.db.query("cohorts").collect(),
      ])
      const teacherByCohort = new Map(
        cohorts.map((cohort) => [cohort._id, cohort.teacherId] as const),
      )
      return submissions.map((submission) => ({
        recordId: submission._id,
        state: submission.status,
        createdAt: submission.createdAt,
        label: submission.taskTitle,
        ownerId: teacherByCohort.get(submission.cohortId) ?? null,
      }))
    }
    case "assessment": {
      const assessments = await ctx.db.query("assessments").collect()
      return assessments.map((assessment) => ({
        recordId: assessment._id,
        state: assessment.status,
        createdAt: assessment.createdAt,
        label: `Penilaian ${assessment._id.slice(-6)}`,
        ownerId: assessment.assessorId,
      }))
    }
    case "certificate": {
      const certificates = await ctx.db.query("certificates").collect()
      return certificates.map((certificate) => ({
        recordId: certificate._id,
        state: certificate.status,
        createdAt: certificate.createdAt,
        label: certificate.serial,
        ownerId: certificate.teacherId,
      }))
    }
    case "work": {
      const cards = await ctx.db.query("workCards").collect()
      return cards.map((card) => ({
        recordId: card._id,
        state: card.status,
        createdAt: card.createdAt,
        label: card.title,
        ownerId: card.makerId,
      }))
    }
    case "order": {
      const orders = await ctx.db.query("orders").collect()
      return orders.map((order) => ({
        recordId: order._id,
        state: order.status,
        createdAt: order.createdAt,
        label: order.code,
        ownerId: order.sellerId,
      }))
    }
    case "payment": {
      const [payments, orders] = await Promise.all([
        ctx.db.query("payments").collect(),
        ctx.db.query("orders").collect(),
      ])
      const sellerByOrder = new Map(
        orders.map((order) => [order._id, order.sellerId] as const),
      )
      return payments.map((payment) => ({
        recordId: payment._id,
        state: payment.status,
        createdAt: payment.createdAt,
        label: payment.providerChargeId,
        ownerId: sellerByOrder.get(payment.orderId) ?? null,
      }))
    }
    case "payout": {
      const payouts = await ctx.db.query("payouts").collect()
      return payouts.map((payout) => ({
        recordId: payout._id,
        state: payout.status,
        createdAt: payout.createdAt,
        label: payout.reference ?? `Payout ${payout._id.slice(-6)}`,
        ownerId: payout.teacherId,
      }))
    }
    case "refund": {
      const refunds = await ctx.db.query("refunds").collect()
      return refunds.map((refund) => ({
        recordId: refund._id,
        state: refund.status,
        createdAt: refund.createdAt,
        label: refund.reason,
        ownerId: refund.requestedBy ?? null,
      }))
    }
    case "call": {
      const calls = await ctx.db.query("callSessions").collect()
      return calls.map((call) => ({
        recordId: call._id,
        state: call.status,
        createdAt: call.createdAt,
        label: call.roomName,
        ownerId: call.initiatorId,
      }))
    }
    case "support": {
      const tickets = await ctx.db.query("supportTickets").collect()
      return tickets.map((ticket) => ({
        recordId: ticket._id,
        state: ticket.status,
        createdAt: ticket.createdAt,
        label: `${ticket.code} · ${ticket.subject}`,
        ownerId: ticket.assigneeId ?? null,
      }))
    }
    case "content": {
      const revisions = await ctx.db.query("contentRevisions").collect()
      return revisions.map((revision) => ({
        recordId: revision._id,
        state: revision.status,
        createdAt: revision.createdAt,
        label: `Versi ${revision.version}`,
        ownerId: revision.authorId,
      }))
    }
  }
}

export const overview = query({
  args: { flowKey: flowKeyValidator },
  handler: async (ctx, args): Promise<FlowOverview> => {
    await requireAdmin(ctx, "flows.manage")
    const flowKey = assertFlowKey(args.flowKey)
    const definition = await definitionFor(ctx, flowKey)
    const records = await loadRecords(ctx, flowKey)
    const slaMinutes = flowSlaMinutes(definition.sla.targetMinutes)
    const countByState = new Map<string, number>()
    for (const record of records) {
      countByState.set(record.state, (countByState.get(record.state) ?? 0) + 1)
    }

    const timestamp = Date.now()
    const names = await userNameMap(ctx)
    const stuckStates = new Set(STUCK_STATES[flowKey])
    const stuck: StuckRecordView[] = records
      .filter((record) => stuckStates.has(record.state))
      .map((record) => {
        const ageMinutes = Math.max(
          0,
          Math.floor((timestamp - record.createdAt) / MINUTE_MS),
        )
        const dueAt = record.createdAt + slaMinutes * MINUTE_MS
        return {
          flowKey,
          flowName: definition.name,
          recordId: record.recordId,
          label: record.label,
          state: record.state,
          stateLabel: stateLabel(flowKey, record.state),
          ageMinutes,
          ownerId: record.ownerId,
          ownerName: record.ownerId
            ? (names.get(record.ownerId) ?? "Tanpa nama")
            : null,
          dueAt,
          overdue: timestamp > dueAt,
          nextAction: NEXT_ACTION[flowKey],
        }
      })
      .sort((a, b) => b.ageMinutes - a.ageMinutes)

    return {
      definition,
      distribution: definition.states.map((state) => ({
        state: state.key,
        label: state.label,
        count: countByState.get(state.key) ?? 0,
        terminal: state.terminal,
        tone: state.tone,
      })),
      stuck,
    }
  },
})

export const stuckRecords = query({
  args: { flowKey: v.optional(flowKeyValidator) },
  handler: async (ctx, args): Promise<StuckRecordView[]> => {
    await requireAdmin(ctx, "flows.manage")
    const keys = args.flowKey ? [assertFlowKey(args.flowKey)] : FLOW_KEYS
    const rows: StuckRecordView[] = []
    for (const key of keys) {
      const definition = await definitionFor(ctx, key)
      const records = await loadRecords(ctx, key)
      const slaMinutes = flowSlaMinutes(definition.sla.targetMinutes)
      const names = await userNameMap(ctx)
      const timestamp = Date.now()
      const stuckStates = new Set(STUCK_STATES[key])
      for (const record of records) {
        if (!stuckStates.has(record.state)) continue
        const ageMinutes = Math.max(
          0,
          Math.floor((timestamp - record.createdAt) / MINUTE_MS),
        )
        const dueAt = record.createdAt + slaMinutes * MINUTE_MS
        rows.push({
          flowKey: key,
          flowName: definition.name,
          recordId: record.recordId,
          label: record.label,
          state: record.state,
          stateLabel: stateLabel(key, record.state),
          ageMinutes,
          ownerId: record.ownerId,
          ownerName: record.ownerId
            ? (names.get(record.ownerId) ?? "Tanpa nama")
            : null,
          dueAt,
          overdue: timestamp > dueAt,
          nextAction: NEXT_ACTION[key],
        })
      }
    }
    return rows.sort((a, b) => b.ageMinutes - a.ageMinutes)
  },
})

function validateTransitions(
  flowKey: FlowKey,
  transitions: {
    from: string
    to: string
    guard: string
    requiresRole?: string
    slaHours?: number
  }[],
): void {
  const spec = flowSpec(flowKey)
  const states = new Set(spec.states.map((state) => state.key))
  if (transitions.length === 0) {
    fail("INVALID_FLOW", "Alur harus memiliki setidaknya satu transisi.")
  }
  const seen = new Set<string>()
  for (const item of transitions) {
    if (!states.has(item.from) || !states.has(item.to)) {
      fail(
        "INVALID_FLOW",
        `Transisi ${item.from} → ${item.to} memakai keadaan yang tidak dikenal.`,
      )
    }
    if (isTerminalState(flowKey, item.from)) {
      fail(
        "INVALID_FLOW",
        `Keadaan terminal ${item.from} tidak boleh memiliki transisi keluar.`,
      )
    }
    if (item.guard.trim().length < 4) {
      fail("INVALID_FLOW", "Setiap transisi wajib memiliki penjaga.")
    }
    const key = `${item.from}->${item.to}`
    if (seen.has(key)) {
      fail("INVALID_FLOW", `Transisi ganda ${item.from} → ${item.to}.`)
    }
    seen.add(key)
    if (item.slaHours !== undefined && item.slaHours < 0) {
      fail("INVALID_FLOW", "SLA transisi tidak boleh negatif.")
    }
  }
}

export const saveDefinition = mutation({
  args: {
    flowKey: flowKeyValidator,
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
    transitions: v.array(
      v.object({
        from: v.string(),
        to: v.string(),
        guard: v.string(),
        requiresRole: v.optional(roleValidator),
        slaHours: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "flows.manage")
    const flowKey = assertFlowKey(args.flowKey)
    validateTransitions(flowKey, args.transitions)
    const spec = flowSpec(flowKey)
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("flowDefinitions")
      .withIndex("by_key", (q) => q.eq("key", flowKey))
      .unique()

    const version = (existing?.version ?? 0) + 1
    if (existing) {
      await ctx.db.patch(existing._id, {
        description: args.description ?? existing.description,
        active: args.active ?? existing.active,
        version,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("flowDefinitions", {
        key: flowKey,
        name: spec.name,
        owner: spec.owner,
        description: args.description ?? spec.description,
        version,
        active: args.active ?? true,
        updatedAt: timestamp,
      })
    }

    const current = await ctx.db
      .query("flowTransitions")
      .withIndex("by_flowKey", (q) => q.eq("flowKey", flowKey))
      .collect()
    const previous = current.map((row) => ({
      from: row.fromState,
      to: row.toState,
      guard: row.guard,
    }))
    for (const row of current) {
      await ctx.db.delete(row._id)
    }
    for (const item of args.transitions) {
      await ctx.db.insert("flowTransitions", {
        flowKey,
        fromState: item.from,
        toState: item.to,
        guard: item.guard.trim(),
        slaHours: item.slaHours,
        requiresRole: item.requiresRole,
        createdAt: timestamp,
      })
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "flows.definition.save",
      entityType: "flowDefinitions",
      entityId: flowKey,
      reason: `Konfigurasi alur ${flowKey} versi ${version}`,
      before: { version: existing?.version ?? 0, transitions: previous },
      after: { version, transitions: args.transitions },
    })
    return { flowKey, version }
  },
})

export const saveSlaPolicy = mutation({
  args: {
    flowKey: flowKeyValidator,
    key: v.optional(v.string()),
    name: v.string(),
    targetMinutes: v.number(),
    escalationMinutes: v.optional(v.number()),
    owner: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "flows.manage")
    const flowKey = assertFlowKey(args.flowKey)
    if (args.targetMinutes <= 0) {
      fail("INVALID_SLA", "Target SLA harus lebih besar dari nol.")
    }
    if (
      args.escalationMinutes !== undefined &&
      args.escalationMinutes < args.targetMinutes
    ) {
      fail("INVALID_SLA", "Eskalasi tidak boleh lebih cepat dari target.")
    }
    const key = args.key ?? `sla:${flowKey}`
    const spec = flowSpec(flowKey)
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("slaPolicies")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        targetMinutes: args.targetMinutes,
        escalationMinutes: args.escalationMinutes,
        owner: args.owner ?? existing.owner,
        active: args.active ?? existing.active,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("slaPolicies", {
        key,
        flowKey,
        name: args.name,
        targetMinutes: args.targetMinutes,
        escalationMinutes: args.escalationMinutes,
        owner: args.owner ?? spec.sla.owner,
        active: args.active ?? true,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "flows.sla.save",
      entityType: "slaPolicies",
      entityId: key,
      reason: "Ambang SLA diperbarui",
      before: existing
        ? {
            targetMinutes: existing.targetMinutes,
            escalationMinutes: existing.escalationMinutes ?? null,
          }
        : undefined,
      after: {
        targetMinutes: args.targetMinutes,
        escalationMinutes: args.escalationMinutes ?? null,
      },
    })
    return { key, flowKey }
  },
})

export const saveAutomationRule = mutation({
  args: {
    flowKey: flowKeyValidator,
    key: v.string(),
    kind: automationKindValidator,
    trigger: triggerValidator,
    action: actionValidator,
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "flows.manage")
    const flowKey = assertFlowKey(args.flowKey)
    const timestamp = Date.now()
    const existing = await ctx.db
      .query("automationRules")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        flowKey,
        kind: args.kind,
        trigger: args.trigger,
        action: args.action,
        enabled: args.enabled,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("automationRules", {
        key: args.key,
        flowKey,
        kind: args.kind,
        trigger: args.trigger,
        action: args.action,
        enabled: args.enabled,
        updatedAt: timestamp,
      })
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "flows.automation.save",
      entityType: "automationRules",
      entityId: args.key,
      reason: "Aturan otomasi diperbarui",
      before: existing
        ? {
            trigger: existing.trigger,
            action: existing.action,
            enabled: existing.enabled,
          }
        : undefined,
      after: {
        trigger: args.trigger,
        action: args.action,
        enabled: args.enabled,
      },
    })
    return { key: args.key, flowKey }
  },
})

type OverrideTarget = {
  entityType: string
  entityId: string
  from: string
  label: string
  patch: (ctx: MutationCtx, toState: string) => Promise<void>
}

async function resolveOverrideTarget(
  ctx: MutationCtx,
  flowKey: FlowKey,
  recordId: string,
): Promise<OverrideTarget> {
  switch (flowKey) {
    case "lead": {
      const lead = await ctx.db.get(recordId as Id<"leads">)
      if (!lead) fail("NOT_FOUND", "Lead tidak ditemukan.")
      return {
        entityType: "leads",
        entityId: lead._id,
        from: lead.status,
        label: lead.name ?? lead.email,
        patch: async (db, toState) => {
          await db.db.patch(lead._id, {
            status: toState as typeof lead.status,
            updatedAt: Date.now(),
          })
        },
      }
    }
    case "work": {
      const card = await ctx.db.get(recordId as Id<"workCards">)
      if (!card) fail("NOT_FOUND", "Kartu karya tidak ditemukan.")
      return {
        entityType: "workCards",
        entityId: card._id,
        from: card.status,
        label: card.title,
        patch: async (db, toState) => {
          await db.db.patch(card._id, {
            status: toState as typeof card.status,
            updatedAt: Date.now(),
          })
          const work = await db.db.get(card.workId)
          if (work) {
            const workStatus =
              toState === "published" ||
              toState === "paused" ||
              toState === "sold_out" ||
              toState === "draft"
                ? toState
                : "review"
            await db.db.patch(work._id, { status: workStatus })
          }
        },
      }
    }
    case "order": {
      const order = await ctx.db.get(recordId as Id<"orders">)
      if (!order) fail("NOT_FOUND", "Pesanan tidak ditemukan.")
      return {
        entityType: "orders",
        entityId: order._id,
        from: order.status,
        label: order.code,
        patch: async (db, toState) => {
          await db.db.patch(order._id, {
            status: toState as typeof order.status,
            updatedAt: Date.now(),
          })
        },
      }
    }
    case "support": {
      const ticket = await ctx.db.get(recordId as Id<"supportTickets">)
      if (!ticket) fail("NOT_FOUND", "Tiket dukungan tidak ditemukan.")
      return {
        entityType: "supportTickets",
        entityId: ticket._id,
        from: ticket.status,
        label: `${ticket.code} · ${ticket.subject}`,
        patch: async (db, toState) => {
          await db.db.patch(ticket._id, {
            status: toState as typeof ticket.status,
            updatedAt: Date.now(),
            closedAt: toState === "closed" ? Date.now() : ticket.closedAt,
          })
        },
      }
    }
    case "enrollment": {
      const enrollment = await ctx.db.get(recordId as Id<"enrollments">)
      if (!enrollment) fail("NOT_FOUND", "Pendaftaran tidak ditemukan.")
      return {
        entityType: "enrollments",
        entityId: enrollment._id,
        from: enrollment.status,
        label: enrollment.pathId,
        patch: async (db, toState) => {
          await db.db.patch(enrollment._id, {
            status: toState as typeof enrollment.status,
            updatedAt: Date.now(),
          })
        },
      }
    }
    case "content": {
      const revision = await ctx.db.get(recordId as Id<"contentRevisions">)
      if (!revision) fail("NOT_FOUND", "Revisi konten tidak ditemukan.")
      return {
        entityType: "contentRevisions",
        entityId: revision._id,
        from: revision.status,
        label: `Versi ${revision.version}`,
        patch: async (db, toState) => {
          await db.db.patch(revision._id, {
            status: toState as typeof revision.status,
          })
        },
      }
    }
    default:
      fail(
        "OVERRIDE_UNSUPPORTED",
        "Alur ini tidak mendukung override langsung dari papan alur.",
      )
  }
}

export const manualOverride = mutation({
  args: {
    flowKey: flowKeyValidator,
    recordId: v.string(),
    toState: v.string(),
    reason: v.string(),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "flows.manage")
    const reason = requireReason(args.reason, 8)
    const flowKey = assertFlowKey(args.flowKey)
    const definition = await definitionFor(ctx, flowKey)
    const target = await resolveOverrideTarget(ctx, flowKey, args.recordId)
    if (target.from === args.toState) {
      fail("INVALID_TRANSITION", "Keadaan tujuan sama dengan keadaan saat ini.")
    }
    const allowed = definition.transitions.some(
      (item) => item.from === target.from && item.to === args.toState,
    )
    if (!allowed) {
      fail(
        "INVALID_TRANSITION",
        `Transisi ${target.from} → ${args.toState} tidak diizinkan oleh definisi alur.`,
      )
    }

    await target.patch(ctx, args.toState)
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "flows.override",
      entityType: target.entityType,
      entityId: target.entityId,
      reason,
      requestId: args.requestId,
      before: { status: target.from },
      after: { status: args.toState, flowKey },
      severity: "warning",
    })
    return {
      flowKey,
      from: target.from,
      to: args.toState,
      label: target.label,
    }
  },
})
