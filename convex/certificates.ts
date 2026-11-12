import { ConvexError, v } from "convex/values"

import { requireCapability } from "./access"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
import {
  nowMs,
  randomCode,
  requireActiveViewer,
  requireAnyCapability,
  requireDomainViewer,
  resolveViewer,
  writeAudit,
} from "./domainAccess"

async function uniquePublicCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = randomCode("kn", 6).toLowerCase()
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_publicCode", (q) => q.eq("publicCode", candidate))
      .unique()
    if (!existing) return candidate
  }
  throw new ConvexError({
    code: "CODE_EXHAUSTED",
    message: "Kode publik tidak dapat dibuat. Coba lagi.",
  })
}

function serialPrefix(pathId: string): string {
  const known: Record<string, string> = {
    "batik-tulis-soga": "BTS",
    "pranatacara-jawa": "PRC",
  }
  if (known[pathId]) return known[pathId]
  return pathId
    .split("-")
    .map((part) => part.slice(0, 1))
    .join("")
    .toUpperCase()
    .slice(0, 3)
}

async function uniqueSerial(
  ctx: MutationCtx,
  pathId: string,
): Promise<string> {
  const prefix = serialPrefix(pathId)
  const year = new Date().getUTCFullYear()
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `KN-${prefix}-${year}-${randomCode("", 3)
      .replace("-", "")
      .toUpperCase()
      .slice(0, 4)}`
    const existing = await ctx.db
      .query("certificates")
      .withIndex("by_serial", (q) => q.eq("serial", candidate))
      .unique()
    if (!existing) return candidate
  }
  throw new ConvexError({
    code: "SERIAL_EXHAUSTED",
    message: "Nomor seri tidak dapat dibuat. Coba lagi.",
  })
}

export async function certificateOverview(
  ctx: MutationCtx | Parameters<typeof resolveViewer>[0],
  certificate: Doc<"certificates">,
) {
  const [replacedBy, workCards, eventRows] = await Promise.all([
    certificate.replacedBy ? ctx.db.get(certificate.replacedBy) : null,
    ctx.db
      .query("workCards")
      .withIndex("by_certificateId", (q) =>
        q.eq("certificateId", certificate._id),
      )
      .collect(),
    ctx.db
      .query("certificateEvents")
      .withIndex("by_certificateId", (q) =>
        q.eq("certificateId", certificate._id),
      )
      .collect(),
  ])

  const actorIds = Array.from(new Set(eventRows.map((event) => event.actorId)))
  const actors = await Promise.all(
    actorIds.map(async (actorId) => {
      try {
        return await ctx.db.get(actorId as Id<"users">)
      } catch {
        return null
      }
    }),
  )
  const actorNameById = new Map<string, string>()
  actors.forEach((actor, index) => {
    if (actor) actorNameById.set(actorIds[index], actor.name)
  })

  const revokedBy = certificate.revokedBy ?? null
  let revokedByName: string | null = null
  if (revokedBy) {
    try {
      const revoker = await ctx.db.get(revokedBy as Id<"users">)
      revokedByName = revoker?.name ?? null
    } catch {
      revokedByName = null
    }
  }

  return {
    id: certificate._id,
    serial: certificate.serial,
    publicCode: certificate.publicCode,
    studentId: certificate.studentId,
    studentName: certificate.snapshot.studentName,
    pathId: certificate.pathId,
    pathTitle: certificate.snapshot.pathTitle,
    teacherId: certificate.teacherId,
    teacherName: certificate.snapshot.teacherName,
    issuedAt: certificate.issuedAt,
    status: certificate.status,
    statusLabel:
      certificate.status === "issued"
        ? "Terbit"
        : certificate.status === "revoked"
          ? "Dicabut"
          : "Diganti",
    assessmentScore: certificate.snapshot.assessmentScore,
    revokedAt: certificate.revokedAt ?? null,
    revokeReason: certificate.revokeReason ?? null,
    revokedBy,
    revokedByName,
    replacedByCode: replacedBy?.publicCode ?? null,
    scope:
      certificate.status === "issued"
        ? "Membuka cakupan penjualan untuk jalur ini."
        : certificate.status === "revoked"
          ? "Cakupan penjualan untuk jalur ini dicabut."
          : "Diganti dengan kode publik terbaru.",
    events: eventRows
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((event) => ({
        id: event._id,
        kind: event.kind,
        actorId: event.actorId,
        actorName: actorNameById.get(event.actorId) ?? null,
        reason: event.reason ?? null,
        createdAt: event.createdAt,
      })),
    workCards: workCards.map((card) => ({
      id: card._id,
      serial: card.serial,
      title: card.title,
      status: card.status,
      accessLevel: card.accessLevel,
    })),
  }
}

/**
 * Issues exactly one platform certificate for an approved assessment.
 * Idempotent: a retry returns the existing certificate without a second event.
 */
export async function issueCertificateForAssessment(
  ctx: MutationCtx,
  assessmentId: Id<"assessments">,
): Promise<Id<"certificates"> | null> {
  const existing = await ctx.db
    .query("certificates")
    .withIndex("by_assessmentId", (q) => q.eq("assessmentId", assessmentId))
    .first()
  if (existing) return existing._id

  const assessment = await ctx.db.get(assessmentId)
  if (!assessment) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Penilaian tidak ditemukan.",
    })
  }
  if (assessment.status !== "completed") {
    throw new ConvexError({
      code: "INVALID_TRANSITION",
      message: "Sertifikat hanya terbit dari penilaian yang selesai.",
    })
  }
  const submission = await ctx.db.get(assessment.submissionId)
  if (!submission) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Tugas tidak ditemukan.",
    })
  }
  if (submission.status !== "approved") {
    throw new ConvexError({
      code: "INVALID_TRANSITION",
      message: "Sertifikat hanya terbit dari tugas yang disetujui.",
    })
  }
  const [student, teacher, path] = await Promise.all([
    ctx.db.get(submission.studentId),
    ctx.db.get(assessment.assessorId),
    ctx.db
      .query("paths")
      .withIndex("by_slug", (q) => q.eq("slug", submission.pathId))
      .unique(),
  ])
  if (!student || !teacher) {
    throw new ConvexError({
      code: "INCOMPLETE_RECORD",
      message: "Data peserta atau pengajar tidak lengkap.",
    })
  }
  const timestamp = nowMs()
  const [serial, publicCode] = await Promise.all([
    uniqueSerial(ctx, submission.pathId),
    uniquePublicCode(ctx),
  ])
  const certificateId = await ctx.db.insert("certificates", {
    serial,
    publicCode,
    studentId: student._id,
    pathId: submission.pathId,
    teacherId: teacher._id,
    assessmentId,
    status: "issued",
    issuedAt: timestamp,
    snapshot: {
      studentName: student.name,
      pathTitle: path?.title ?? submission.pathId,
      teacherName: teacher.name,
      assessmentScore: assessment.score ?? 0,
      issuedAt: timestamp,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await ctx.db.insert("certificateEvents", {
    certificateId,
    kind: "issue",
    actorId: teacher._id,
    reason: "Penilaian disetujui",
    createdAt: timestamp,
  })
  if (submission.enrollmentId) {
    await ctx.db.patch(submission.enrollmentId, {
      certificateId,
      updatedAt: timestamp,
    })
  }
  await writeAudit(ctx, {
    actorId: teacher._id,
    actorRole: "Pengajar",
    action: "certificates.issue",
    entityType: "certificates",
    entityId: certificateId,
    reason: "Penilaian disetujui",
    after: { serial, publicCode, pathId: submission.pathId },
  })
  return certificateId
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["certificates.read.own", "learn"])
    const certificates = await ctx.db
      .query("certificates")
      .withIndex("by_studentId", (q) => q.eq("studentId", viewer.userId as Id<"users">))
      .collect()
    return await Promise.all(
      certificates
        .sort((a, b) => b.issuedAt - a.issuedAt)
        .map((certificate) => certificateOverview(ctx, certificate)),
    )
  },
})

export const listCohort = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireDomainViewer(ctx, "certificates.read.cohort")
    const certificates = await ctx.db
      .query("certificates")
      .withIndex("by_teacherId", (q) => q.eq("teacherId", viewer.userId as Id<"users">))
      .collect()
    return await Promise.all(
      certificates
        .sort((a, b) => b.issuedAt - a.issuedAt)
        .map((certificate) => certificateOverview(ctx, certificate)),
    )
  },
})

export const listRegistry = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireCapability(viewer, "certificates.manage")
    const certificates = await ctx.db.query("certificates").collect()
    return await Promise.all(
      certificates
        .sort((a, b) => b.issuedAt - a.issuedAt)
        .map((certificate) => certificateOverview(ctx, certificate)),
    )
  },
})

/** Public, unauthenticated verification. Returns only safe snapshot fields. */
export const verifyPublic = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim()
    if (!code) return null
    const certificate = await ctx.db
      .query("certificates")
      .withIndex("by_publicCode", (q) => q.eq("publicCode", code))
      .unique()
    if (!certificate) return null
    const replacedBy = certificate.replacedBy
      ? await ctx.db.get(certificate.replacedBy)
      : null
    return {
      publicCode: certificate.publicCode,
      serial: certificate.serial,
      studentName: certificate.snapshot.studentName,
      pathTitle: certificate.snapshot.pathTitle,
      teacherName: certificate.snapshot.teacherName,
      issuedAt: certificate.issuedAt,
      status: certificate.status,
      assessmentScore: certificate.snapshot.assessmentScore,
      revokedAt: certificate.revokedAt ?? null,
      replacedByPublicCode: replacedBy?.publicCode ?? null,
    }
  },
})

export const revoke = mutation({
  args: { certificateId: v.id("certificates"), reason: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireCapability(viewer, "certificates.revoke")
    const certificate = await ctx.db.get(args.certificateId)
    if (!certificate) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sertifikat tidak ditemukan.",
      })
    }
    if (certificate.status !== "issued") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Hanya sertifikat terbit yang dapat dicabut.",
      })
    }
    if (args.reason.trim().length < 8) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Pencabutan memerlukan alasan minimal 8 karakter.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(certificate._id, {
      status: "revoked",
      revokedAt: timestamp,
      revokeReason: args.reason,
      revokedBy: viewer.userId,
      updatedAt: timestamp,
    })
    await ctx.db.insert("certificateEvents", {
      certificateId: certificate._id,
      kind: "revoke",
      actorId: viewer.userId,
      reason: args.reason,
      createdAt: timestamp,
    })

    // Listings backed by this certificate are paused immediately. Historical
    // records and the public verification page remain visible.
    const cards = await ctx.db
      .query("workCards")
      .withIndex("by_certificateId", (q) => q.eq("certificateId", certificate._id))
      .collect()
    for (const card of cards) {
      if (card.status !== "paused") {
        await ctx.db.patch(card._id, {
          status: "paused",
          updatedAt: timestamp,
        })
      }
      const work = await ctx.db.get(card.workId)
      if (work && work.status === "published") {
        await ctx.db.patch(work._id, {
          status: "paused",
        })
      }
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "certificates.revoke",
      entityType: "certificates",
      entityId: certificate._id,
      reason: args.reason,
      before: { status: certificate.status },
      after: { status: "revoked", pausedWorkCards: cards.length },
      severity: "warning",
    })
    return { status: "revoked" as const }
  },
})

export const reissue = mutation({
  args: { certificateId: v.id("certificates"), reason: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireCapability(viewer, "certificates.manage")
    const certificate = await ctx.db.get(args.certificateId)
    if (!certificate) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sertifikat tidak ditemukan.",
      })
    }
    if (certificate.status !== "issued") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Hanya sertifikat terbit yang dapat diganti.",
      })
    }
    if (args.reason.trim().length < 8) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Penggantian memerlukan alasan minimal 8 karakter.",
      })
    }
    const timestamp = nowMs()
    const [serial, publicCode] = await Promise.all([
      uniqueSerial(ctx, certificate.pathId),
      uniquePublicCode(ctx),
    ])
    const replacementId = await ctx.db.insert("certificates", {
      serial,
      publicCode,
      studentId: certificate.studentId,
      pathId: certificate.pathId,
      teacherId: certificate.teacherId,
      assessmentId: certificate.assessmentId,
      status: "issued",
      issuedAt: timestamp,
      snapshot: {
        ...certificate.snapshot,
        issuedAt: timestamp,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.patch(certificate._id, {
      status: "replaced",
      replacedBy: replacementId,
      updatedAt: timestamp,
    })
    const assessment = await ctx.db.get(certificate.assessmentId)
    if (assessment) {
      const submission = await ctx.db.get(assessment.submissionId)
      if (submission) {
        await ctx.db.patch(submission.enrollmentId, {
          certificateId: replacementId,
          updatedAt: timestamp,
        })
      }
    }
    await ctx.db.insert("certificateEvents", {
      certificateId: certificate._id,
      kind: "replace",
      actorId: viewer.userId,
      reason: args.reason,
      createdAt: timestamp,
    })
    await ctx.db.insert("certificateEvents", {
      certificateId: replacementId,
      kind: "issue",
      actorId: viewer.userId,
      reason: `Pengganti ${certificate.serial}: ${args.reason}`,
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "certificates.reissue",
      entityType: "certificates",
      entityId: certificate._id,
      reason: args.reason,
      before: {
        status: certificate.status,
        publicCode: certificate.publicCode,
      },
      after: { status: "replaced", replacementId, publicCode },
      severity: "warning",
    })
    return {
      certificateId: replacementId,
      publicCode,
      serial,
    }
  },
})
