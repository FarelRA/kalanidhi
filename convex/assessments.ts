import { ConvexError, v } from "convex/values"

import type { Viewer } from "../lib/access/viewer"
import { assertNoSelfDealing, assertScope } from "./access"
import { issueCertificateForAssessment } from "./certificates"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import {
  nowMs,
  randomCode,
  requireActiveViewer,
  requireAnyCapability,
  requireWorkspaceViewer,
  resolveViewer,
  writeAudit,
} from "./domainAccess"

const HOUR_MS = 3_600_000
const DAY_MS = 86_400_000
const DEFAULT_SLA_HOURS = 72
const DEFAULT_ASSET_LIMIT = 5
const DEFAULT_MAX_ASSET_BYTES = 25 * 1024 * 1024

type ResolverCtx = Parameters<typeof resolveViewer>[0]

export type RubricCriterion = {
  criterion: string
  weight: number
  score?: number
  comment?: string
}

const BATIK_RUBRIC: RubricCriterion[] = [
  { criterion: "Ketepatan proses", weight: 40 },
  { criterion: "Kualitas garis canting", weight: 30 },
  { criterion: "Catatan proses", weight: 30 },
]

const PRANATACARA_RUBRIC: RubricCriterion[] = [
  { criterion: "Urutan acara", weight: 45 },
  { criterion: "Tata wicara", weight: 35 },
  { criterion: "Kejelasan suara", weight: 20 },
]

const DEFAULT_RUBRIC: RubricCriterion[] = [
  { criterion: "Ketepatan proses", weight: 40 },
  { criterion: "Kualitas hasil", weight: 30 },
  { criterion: "Catatan proses", weight: 30 },
]

export function rubricForPath(pathId: string): RubricCriterion[] {
  if (pathId === "batik-tulis-soga") return BATIK_RUBRIC
  if (pathId === "pranatacara-jawa") return PRANATACARA_RUBRIC
  return DEFAULT_RUBRIC
}

function statusTone(status: Doc<"submissions">["status"]) {
  if (status === "approved") return "done" as const
  if (status === "rejected" || status === "revision_requested") return "danger" as const
  if (status === "submitted") return "wait" as const
  if (status === "under_review") return "progress" as const
  return "muted" as const
}

function statusLabel(status: Doc<"submissions">["status"]) {
  switch (status) {
    case "draft":
      return "Draf"
    case "submitted":
      return "Menunggu penilaian"
    case "under_review":
      return "Sedang dinilai"
    case "revision_requested":
      return "Revisi diminta"
    case "approved":
      return "Disetujui"
    case "rejected":
      return "Ditolak"
  }
}

async function pathTitle(ctx: ResolverCtx, pathId: string): Promise<string> {
  const path = await ctx.db
    .query("paths")
    .withIndex("by_slug", (q) => q.eq("slug", pathId))
    .unique()
  return path?.title ?? pathId
}

async function submissionOverview(
  ctx: ResolverCtx,
  submission: Doc<"submissions">,
  now: number,
) {
  const [student, cohort, pathTitleValue, assets, assessment] = await Promise.all([
    ctx.db.get(submission.studentId),
    ctx.db.get(submission.cohortId),
    pathTitle(ctx, submission.pathId),
    ctx.db
      .query("submissionAssets")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submission._id))
      .collect(),
    ctx.db
      .query("assessments")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submission._id))
      .order("desc")
      .first(),
  ])
  const teacher = cohort ? await ctx.db.get(cohort.teacherId) : null
  const submittedAt = submission.submittedAt ?? null
  const ageHours = submittedAt
    ? Math.max(0, Math.round((now - submittedAt) / HOUR_MS))
    : 0
  return {
    id: submission._id,
    code: submission.code,
    studentId: submission.studentId,
    studentName: student?.name ?? "—",
    studentInitials: student?.initials ?? "—",
    cohortId: submission.cohortId,
    cohort: cohort?.code ?? "—",
    pathId: submission.pathId,
    pathTitle: pathTitleValue,
    taskTitle: submission.taskTitle,
    status: submission.status,
    statusLabel: statusLabel(submission.status),
    tone: statusTone(submission.status),
    submittedAt,
    dueAt: submission.dueAt,
    ageHours,
    slaHours: DEFAULT_SLA_HOURS,
    teacher: teacher?.name ?? "—",
    teacherId: cohort?.teacherId ?? null,
    score: assessment?.score ?? null,
    feedback: assessment?.feedback ?? null,
    evidenceText: submission.evidenceText ?? null,
    evidence: assets.map((asset) => ({
      id: asset._id,
      filename: asset.filename,
      kind: asset.kind,
      mimeType: asset.mimeType,
      size: asset.size,
      storageId: asset.storageId,
    })),
    revisionCount: submission.revisionCount,
    rubric: (assessment?.rubric ?? rubricForPath(submission.pathId)).map(
      (criterion) => ({
        criterion: criterion.criterion,
        weight: criterion.weight,
        score: criterion.score ?? null,
        comment: criterion.comment ?? null,
      }),
    ),
    assessmentId: assessment?._id ?? null,
    assessmentStatus: assessment?.status ?? null,
    escalatedAt: submission.escalatedAt ?? null,
    escalationReason: submission.escalationReason ?? null,
  }
}

async function scopedSubmission(
  ctx: ResolverCtx,
  viewer: Viewer,
  submissionId: Id<"submissions">,
): Promise<Doc<"submissions"> | null> {
  const submission = await ctx.db.get(submissionId)
  if (!submission) return null
  if (viewer.entitlements.operate) return submission
  if (submission.studentId === viewer.userId) return submission
  if (viewer.entitlements.teach) {
    const cohort = await ctx.db.get(submission.cohortId)
    if (cohort?.teacherId === viewer.userId) return submission
  }
  return null
}

function validateRubric(rubric: RubricCriterion[]): {
  rubric: RubricCriterion[]
  score: number
} {
  if (rubric.length === 0) {
    throw new ConvexError({
      code: "INVALID_RUBRIC",
      message: "Rubrik wajib memiliki minimal satu kriteria.",
    })
  }
  let weightTotal = 0
  for (const criterion of rubric) {
    if (!criterion.criterion.trim()) {
      throw new ConvexError({
        code: "INVALID_RUBRIC",
        message: "Setiap kriteria rubrik wajib bernama.",
      })
    }
    if (!Number.isFinite(criterion.weight) || criterion.weight <= 0) {
      throw new ConvexError({
        code: "INVALID_RUBRIC",
        message: "Bobot setiap kriteria harus positif.",
      })
    }
    if (
      typeof criterion.score !== "number" ||
      !Number.isFinite(criterion.score) ||
      criterion.score < 0 ||
      criterion.score > 100
    ) {
      throw new ConvexError({
        code: "INVALID_SCORE",
        message: "Nilai setiap kriteria harus berada pada 0–100.",
      })
    }
    weightTotal += criterion.weight
  }
  if (Math.abs(weightTotal - 100) > 0.01) {
    throw new ConvexError({
      code: "INVALID_RUBRIC",
      message: `Bobot rubrik harus berjumlah 100 (saat ini ${weightTotal}).`,
    })
  }
  const weighted = rubric.reduce(
    (total, criterion) => total + (criterion.score ?? 0) * criterion.weight,
    0,
  )
  const score = Math.round(weighted / 100)
  return { rubric, score }
}

async function learningSettings(ctx: ResolverCtx) {
  const doc = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "learning"))
    .unique()
  const value = (doc?.value ?? {}) as {
    submissionAssetLimit?: unknown
    maxAssetBytes?: unknown
  }
  return {
    assetLimit:
      typeof value.submissionAssetLimit === "number" &&
      Number.isInteger(value.submissionAssetLimit) &&
      value.submissionAssetLimit > 0
        ? value.submissionAssetLimit
        : DEFAULT_ASSET_LIMIT,
    maxAssetBytes:
      typeof value.maxAssetBytes === "number" && value.maxAssetBytes > 0
        ? value.maxAssetBytes
        : DEFAULT_MAX_ASSET_BYTES,
  }
}

function assertMimeAllowed(kind: string, mimeType: string): void {
  const allowed =
    (kind === "image" && mimeType.startsWith("image/")) ||
    (kind === "audio" && mimeType.startsWith("audio/")) ||
    (kind === "video" && mimeType.startsWith("video/")) ||
    (kind === "file" &&
      (mimeType === "application/pdf" ||
        mimeType === "text/plain" ||
        mimeType ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType.startsWith("application/zip")))
  if (!allowed) {
    throw new ConvexError({
      code: "UNSUPPORTED_ASSET",
      message: "Jenis bukti tidak didukung untuk kategori ini.",
    })
  }
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireWorkspaceViewer(ctx)
    if (!viewer.capabilities.includes("learn")) {
      requireAnyCapability(viewer, ["learn"])
    }
    const now = nowMs()
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_studentId", (q) => q.eq("studentId", viewer.userId as Id<"users">))
      .collect()
    return await Promise.all(
      submissions
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map((submission) => submissionOverview(ctx, submission, now)),
    )
  },
})

export const listQueue = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, [
      "assess",
      "submissions.grade",
      "submissions.escalate",
    ])
    const now = nowMs()
    let submissions: Doc<"submissions">[]
    if (viewer.entitlements.operate) {
      submissions = await ctx.db.query("submissions").collect()
    } else {
      const cohorts = await ctx.db
        .query("cohorts")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", viewer.userId as Id<"users">))
        .collect()
      submissions = (
        await Promise.all(
          cohorts.map((cohort) =>
            ctx.db
              .query("submissions")
              .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
              .collect(),
          ),
        )
      ).flat()
    }
    const queue = submissions.filter((submission) =>
      ["submitted", "under_review", "revision_requested"].includes(
        submission.status,
      ),
    )
    return await Promise.all(
      queue
        .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
        .map((submission) => submissionOverview(ctx, submission, now)),
    )
  },
})

export const listEscalations = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["submissions.escalate"])
    const now = nowMs()
    const submissions = await ctx.db.query("submissions").collect()
    const queue = submissions.filter((submission) => {
      const age = submission.submittedAt
        ? (now - submission.submittedAt) / HOUR_MS
        : 0
      return (
        submission.escalatedAt !== undefined ||
        age > DEFAULT_SLA_HOURS ||
        submission.status === "under_review" ||
        submission.status === "revision_requested"
      )
    })
    return await Promise.all(
      queue
        .sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0))
        .map((submission) => submissionOverview(ctx, submission, now)),
    )
  },
})

export const getSubmission = query({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const submission = await scopedSubmission(ctx, viewer, args.submissionId)
    if (!submission) return null
    const now = nowMs()
    const overview = await submissionOverview(ctx, submission, now)
    const history = await ctx.db
      .query("assessmentEvents")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submission._id))
      .order("asc")
      .collect()
    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "assessment").eq("subjectId", overview.assessmentId ?? ""),
      )
      .collect()
    return {
      ...overview,
      history: history.map((event) => ({
        id: event._id,
        kind: event.kind,
        actorId: event.actorId,
        reason: event.reason ?? null,
        previousState: event.previousState ?? null,
        nextState: event.nextState ?? null,
        scoreBefore: event.scoreBefore ?? null,
        scoreAfter: event.scoreAfter ?? null,
        createdAt: event.createdAt,
      })),
      disputes: disputes.map((dispute) => ({
        id: dispute._id,
        status: dispute.status,
        reason: dispute.reason,
        resolution: dispute.resolution ?? null,
        openedBy: dispute.openedBy,
        createdAt: dispute.createdAt,
        resolvedAt: dispute.resolvedAt ?? null,
      })),
    }
  },
})

export const createDraft = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    taskTitle: v.string(),
    evidenceText: v.optional(v.string()),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["learn", "submissions.submit"])
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    if (enrollment.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Tugas hanya dapat dibuat untuk pendaftaran sendiri.",
      })
    }
    if (enrollment.status !== "active") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Pendaftaran harus aktif sebelum membuat tugas.",
      })
    }
    if (!enrollment.cohortId) {
      throw new ConvexError({
        code: "COHORT_REQUIRED",
        message: "Tugas memerlukan kohort yang aktif.",
      })
    }
    if (!args.taskTitle.trim()) {
      throw new ConvexError({
        code: "INVALID_TASK",
        message: "Judul tugas wajib diisi.",
      })
    }
    const timestamp = nowMs()
    let code = randomCode("TGS", 4).toUpperCase()
    let existing = await ctx.db
      .query("submissions")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique()
    while (existing) {
      code = randomCode("TGS", 4).toUpperCase()
      existing = await ctx.db
        .query("submissions")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
    }
    const submissionId = await ctx.db.insert("submissions", {
      code,
      studentId: enrollment.studentId,
      enrollmentId: enrollment._id,
      cohortId: enrollment.cohortId,
      pathId: enrollment.pathId,
      taskTitle: args.taskTitle.trim(),
      status: "draft",
      dueAt: args.dueAt ?? enrollment.deadlineAt ?? timestamp + 7 * DAY_MS,
      evidenceText: args.evidenceText,
      assetIds: [],
      revisionCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    return { submissionId }
  },
})

export const saveDraft = mutation({
  args: {
    submissionId: v.id("submissions"),
    evidenceText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || submission.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    if (!["draft", "revision_requested"].includes(submission.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Draf hanya dapat disimpan sebelum dikirim.",
      })
    }
    await ctx.db.patch(submission._id, {
      evidenceText: args.evidenceText,
      updatedAt: nowMs(),
    })
    return null
  },
})

export const addAsset = mutation({
  args: {
    submissionId: v.id("submissions"),
    storageId: v.id("_storage"),
    kind: v.union(
      v.literal("image"),
      v.literal("audio"),
      v.literal("video"),
      v.literal("file"),
    ),
    filename: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || submission.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    if (!["draft", "revision_requested"].includes(submission.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Bukti hanya dapat ditambah pada draf atau revisi.",
      })
    }
    const limits = await learningSettings(ctx)
    if (submission.assetIds.length >= limits.assetLimit) {
      throw new ConvexError({
        code: "ASSET_LIMIT",
        message: `Batas bukti per tugas adalah ${limits.assetLimit} berkas.`,
      })
    }
    if (!Number.isFinite(args.size) || args.size <= 0) {
      throw new ConvexError({
        code: "INVALID_ASSET",
        message: "Ukuran berkas tidak sah.",
      })
    }
    if (args.size > limits.maxAssetBytes) {
      throw new ConvexError({
        code: "ASSET_TOO_LARGE",
        message: "Ukuran berkas melebihi batas.",
      })
    }
    if (!args.filename.trim()) {
      throw new ConvexError({
        code: "INVALID_ASSET",
        message: "Nama berkas wajib diisi.",
      })
    }
    assertMimeAllowed(args.kind, args.mimeType)

    const timestamp = nowMs()
    const assetId = await ctx.db.insert("submissionAssets", {
      submissionId: submission._id,
      storageId: args.storageId,
      kind: args.kind,
      filename: args.filename.trim(),
      mimeType: args.mimeType,
      size: args.size,
      createdAt: timestamp,
    })
    await ctx.db.patch(submission._id, {
      assetIds: [...submission.assetIds, assetId],
      updatedAt: timestamp,
    })
    return { assetId }
  },
})

export const removeAsset = mutation({
  args: {
    submissionId: v.id("submissions"),
    assetId: v.id("submissionAssets"),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || submission.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    if (!["draft", "revision_requested"].includes(submission.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Bukti hanya dapat dihapus pada draf atau revisi.",
      })
    }
    if (!submission.assetIds.includes(args.assetId)) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bukti tidak ditemukan pada tugas ini.",
      })
    }
    await ctx.db.delete(args.assetId)
    await ctx.db.patch(submission._id, {
      assetIds: submission.assetIds.filter((id) => id !== args.assetId),
      updatedAt: nowMs(),
    })
    return null
  },
})

export const submit = mutation({
  args: { submissionId: v.id("submissions") },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    const submission = await ctx.db.get(args.submissionId)
    if (!submission || submission.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    if (!["draft", "revision_requested"].includes(submission.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Tugas ini tidak dapat dikirim ulang.",
      })
    }
    const enrollment = await ctx.db.get(submission.enrollmentId)
    if (!enrollment || enrollment.status !== "active") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Pendaftaran harus aktif sebelum mengirim tugas.",
      })
    }
    const hasText = Boolean(submission.evidenceText?.trim())
    if (!hasText && submission.assetIds.length === 0) {
      throw new ConvexError({
        code: "EVIDENCE_REQUIRED",
        message: "Sertakan catatan atau berkas bukti sebelum mengirim.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(submission._id, {
      status: "submitted",
      submittedAt: timestamp,
      revisionCount:
        submission.status === "revision_requested"
          ? submission.revisionCount + 1
          : submission.revisionCount,
      updatedAt: timestamp,
    })
    await ctx.db.patch(submission.enrollmentId, {
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    })
    return { status: "submitted" as const }
  },
})

export const grade = mutation({
  args: {
    submissionId: v.id("submissions"),
    decision: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("revision"),
    ),
    rubric: v.array(
      v.object({
        criterion: v.string(),
        weight: v.number(),
        score: v.optional(v.number()),
        comment: v.optional(v.string()),
      }),
    ),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["assess", "submissions.grade"])
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    assertScope(viewer, "assess", submission.pathId)
    assertNoSelfDealing(viewer, "menilai", submission.studentId)
    const cohort = await ctx.db.get(submission.cohortId)
    if (cohort?.teacherId !== viewer.userId && !viewer.entitlements.operate) {
      throw new ConvexError({
        code: "OUT_OF_SCOPE",
        message: "Tugas ini bukan bagian dari kohort yang kamu ampu.",
      })
    }
    if (!["submitted", "under_review", "revision_requested"].includes(submission.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Tugas ini tidak dapat dinilai pada status sekarang.",
      })
    }
    if (args.decision === "revision" && !args.feedback?.trim()) {
      throw new ConvexError({
        code: "NOTE_REQUIRED",
        message: "Permintaan revisi memerlukan catatan.",
      })
    }
    const { rubric, score } = validateRubric(args.rubric)
    const timestamp = nowMs()
    const existing = await ctx.db
      .query("assessments")
      .withIndex("by_submissionId", (q) => q.eq("submissionId", submission._id))
      .order("desc")
      .first()
    if (existing?.status === "completed") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Penilaian sudah selesai. Gunakan override dengan alasan.",
      })
    }

    const nextAssessmentStatus =
      args.decision === "revision" ? "in_review" : "completed"
    let assessmentId: Id<"assessments">
    if (existing) {
      assessmentId = existing._id
      await ctx.db.patch(existing._id, {
        assessorId: viewer.userId as Id<"users">,
        status: nextAssessmentStatus,
        rubric,
        score,
        feedback: args.feedback,
        assessedAt: args.decision === "revision" ? undefined : timestamp,
        updatedAt: timestamp,
      })
    } else {
      assessmentId = await ctx.db.insert("assessments", {
        submissionId: submission._id,
        assessorId: viewer.userId as Id<"users">,
        status: nextAssessmentStatus,
        rubric,
        score,
        feedback: args.feedback,
        assessedAt: args.decision === "revision" ? undefined : timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    await ctx.db.insert("assessmentEvents", {
      assessmentId,
      submissionId: submission._id,
      kind: args.decision === "revision" ? "revision" : "grade",
      actorId: viewer.userId,
      reason: args.feedback,
      previousState: existing?.status ?? "queued",
      nextState: nextAssessmentStatus,
      scoreBefore: existing?.score,
      scoreAfter: score,
      createdAt: timestamp,
    })

    const submissionStatus =
      args.decision === "approve"
        ? "approved"
        : args.decision === "reject"
          ? "rejected"
          : "revision_requested"
    await ctx.db.patch(submission._id, {
      status: submissionStatus,
      updatedAt: timestamp,
    })
    await ctx.db.patch(submission.enrollmentId, {
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    })

    let certificateId: Id<"certificates"> | null = null
    if (args.decision === "approve") {
      certificateId = await issueCertificateForAssessment(ctx, assessmentId)
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "assessments.grade",
      entityType: "assessments",
      entityId: assessmentId,
      reason: args.decision,
      before: {
        submissionStatus: submission.status,
        score: existing?.score,
      },
      after: {
        submissionStatus,
        score,
        certificateId: certificateId ?? undefined,
      },
    })

    return { assessmentId, score, status: submissionStatus, certificateId }
  },
})

export const override = mutation({
  args: {
    assessmentId: v.id("assessments"),
    rubric: v.array(
      v.object({
        criterion: v.string(),
        weight: v.number(),
        score: v.optional(v.number()),
        comment: v.optional(v.string()),
      }),
    ),
    feedback: v.optional(v.string()),
    reason: v.string(),
    secondReviewerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["assess", "submissions.grade"])
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Penilaian tidak ditemukan.",
      })
    }
    const submission = await ctx.db.get(assessment.submissionId)
    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    assertScope(viewer, "assess", submission.pathId)
    assertNoSelfDealing(viewer, "menimpa nilai", submission.studentId)
    const cohort = await ctx.db.get(submission.cohortId)
    if (cohort?.teacherId !== viewer.userId && !viewer.entitlements.operate) {
      throw new ConvexError({
        code: "OUT_OF_SCOPE",
        message: "Penilaian ini bukan bagian dari kohort yang kamu ampu.",
      })
    }
    if (args.reason.trim().length < 8) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Override nilai memerlukan alasan minimal 8 karakter.",
      })
    }
    const { rubric, score } = validateRubric(args.rubric)
    const previousScore = assessment.score ?? 0
    const highImpact = Math.abs(score - previousScore) >= 10
    if (highImpact) {
      if (!args.secondReviewerId) {
        throw new ConvexError({
          code: "SECOND_REVIEWER_REQUIRED",
          message: "Perubahan nilai besar memerlukan peninjau kedua.",
        })
      }
      if (args.secondReviewerId === viewer.userId) {
        throw new ConvexError({
          code: "SELF_DEALING",
          message: "Peninjau kedua harus akun lain.",
        })
      }
      const reviewer = await ctx.db.get(args.secondReviewerId)
      if (!reviewer) {
        throw new ConvexError({
          code: "INVALID_REVIEWER",
          message: "Peninjau kedua tidak ditemukan.",
        })
      }
    }
    const timestamp = nowMs()
    await ctx.db.patch(assessment._id, {
      rubric,
      score,
      feedback: args.feedback ?? assessment.feedback,
      overrideReason: args.reason,
      secondReviewerId: args.secondReviewerId,
      status: "completed",
      assessedAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.insert("assessmentEvents", {
      assessmentId: assessment._id,
      submissionId: submission._id,
      kind: "override",
      actorId: viewer.userId,
      reason: args.reason,
      previousState: assessment.status,
      nextState: "completed",
      scoreBefore: assessment.score,
      scoreAfter: score,
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "assessments.override",
      entityType: "assessments",
      entityId: assessment._id,
      reason: args.reason,
      before: { score: assessment.score },
      after: { score, secondReviewerId: args.secondReviewerId },
      severity: "warning",
    })
    return { score }
  },
})

export const openDispute = mutation({
  args: { assessmentId: v.id("assessments"), reason: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["learn", "submissions.submit"])
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Penilaian tidak ditemukan.",
      })
    }
    const submission = await ctx.db.get(assessment.submissionId)
    if (!submission || submission.studentId !== viewer.userId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Penilaian tidak ditemukan.",
      })
    }
    if (!["completed", "resolved"].includes(assessment.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Sengketa hanya dapat dibuka setelah penilaian selesai.",
      })
    }
    if (args.reason.trim().length < 8) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Alasan sengketa minimal 8 karakter.",
      })
    }
    const existing = await ctx.db
      .query("disputes")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "assessment").eq("subjectId", assessment._id),
      )
      .collect()
    if (existing.some((dispute) => dispute.status !== "closed")) {
      throw new ConvexError({
        code: "DISPUTE_EXISTS",
        message: "Sengketa untuk penilaian ini masih berjalan.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(assessment._id, {
      status: "disputed",
      updatedAt: timestamp,
    })
    const disputeId = await ctx.db.insert("disputes", {
      subjectType: "assessment",
      subjectId: assessment._id,
      openedBy: viewer.userId as Id<"users">,
      status: "open",
      reason: args.reason,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.insert("assessmentEvents", {
      assessmentId: assessment._id,
      submissionId: assessment.submissionId,
      kind: "dispute",
      actorId: viewer.userId,
      reason: args.reason,
      previousState: assessment.status,
      nextState: "disputed",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "assessments.openDispute",
      entityType: "disputes",
      entityId: disputeId,
      reason: args.reason,
      severity: "warning",
    })
    return { disputeId }
  },
})

export const updateDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    status: v.union(
      v.literal("reviewing"),
      v.literal("resolved"),
      v.literal("closed"),
    ),
    resolution: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["submissions.escalate"])
    const dispute = await ctx.db.get(args.disputeId)
    if (!dispute) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sengketa tidak ditemukan.",
      })
    }
    const legal: Record<string, string[]> = {
      open: ["reviewing"],
      reviewing: ["resolved"],
      resolved: ["closed"],
      closed: [],
    }
    if (!(legal[dispute.status] ?? []).includes(args.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Perpindahan status sengketa tidak sah.",
      })
    }
    const resolution =
      args.status === "resolved"
        ? (args.resolution ?? args.reason)
        : args.resolution
    if (args.status === "resolved" && !resolution?.trim()) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Penyelesaian sengketa memerlukan alasan.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(dispute._id, {
      status: args.status,
      resolution,
      updatedAt: timestamp,
      resolvedAt: args.status === "resolved" ? timestamp : dispute.resolvedAt,
    })
    if (dispute.subjectType === "assessment") {
      const assessment = await ctx.db.get(dispute.subjectId as Id<"assessments">)
      if (assessment) {
        await ctx.db.patch(assessment._id, {
          status: args.status === "resolved" ? "resolved" : assessment.status,
          updatedAt: timestamp,
        })
        await ctx.db.insert("assessmentEvents", {
          assessmentId: assessment._id,
          submissionId: assessment.submissionId,
          kind: "resolve",
          actorId: viewer.userId,
          reason: resolution,
          previousState: dispute.status,
          nextState: args.status,
          createdAt: timestamp,
        })
      }
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "assessments.updateDispute",
      entityType: "disputes",
      entityId: dispute._id,
      reason: resolution ?? args.reason ?? "Status sengketa diperbarui",
      before: { status: dispute.status },
      after: { status: args.status },
      severity: "warning",
    })
    return null
  },
})

export const escalateSubmission = mutation({
  args: { submissionId: v.id("submissions"), reason: v.string() },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["submissions.escalate"])
    const submission = await ctx.db.get(args.submissionId)
    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tugas tidak ditemukan.",
      })
    }
    if (args.reason.trim().length < 8) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Eskalasi memerlukan alasan minimal 8 karakter.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(submission._id, {
      escalatedAt: timestamp,
      escalatedBy: viewer.userId,
      escalationReason: args.reason,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "assessments.escalate",
      entityType: "submissions",
      entityId: submission._id,
      reason: args.reason,
      severity: "warning",
    })
    return null
  },
})

export const listDisputes = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const disputes = await ctx.db.query("disputes").collect()
    const visible = viewer.entitlements.operate
      ? disputes
      : disputes.filter((dispute) => dispute.openedBy === viewer.userId)
    return visible
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((dispute) => ({
        id: dispute._id,
        subjectType: dispute.subjectType,
        subjectId: dispute.subjectId,
        status: dispute.status,
        reason: dispute.reason,
        resolution: dispute.resolution ?? null,
        openedBy: dispute.openedBy,
        createdAt: dispute.createdAt,
        updatedAt: dispute.updatedAt,
        resolvedAt: dispute.resolvedAt ?? null,
      }))
  },
})
