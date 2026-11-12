import { ConvexError, v } from "convex/values"

import type { Viewer } from "../lib/access/viewer"
import { assertScope } from "./access"
import { certificateOverview } from "./certificates"
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

const DAY_MS = 86_400_000
const AT_RISK_DAYS = 14
const DEFAULT_TIMEZONE = "Asia/Jakarta"
const ACTIVE_ENROLLMENT_STATUSES = ["pending_payment", "active", "completed"] as const

type PathDoc = Doc<"paths">

type EnrollmentOverview = {
  id: Id<"enrollments">
  studentId: Id<"users">
  studentName: string
  initials: string
  cohortId: Id<"cohorts"> | null
  cohortCode: string | null
  pathId: string
  pathTitle: string
  progress: number
  lastActiveAt: number | null
  status: Doc<"enrollments">["status"]
  nextTask: string
  certificateId: Id<"certificates"> | null
  deadlineAt: number | null
  withdrawnAt: number | null
  withdrawReason: string | null
  completedAt: number | null
}

type CohortOverview = {
  id: Id<"cohorts">
  code: string
  title: string
  pathId: string
  pathTitle: string
  teacherId: Id<"users">
  teacherName: string
  startDate: number
  endDate: number
  capacity: number
  enrolled: number
  completed: number
  atRisk: number
  nextSessionAt: number | null
  status: Doc<"cohorts">["status"]
  timezone: string
  updatedAt: number
}

function isOpenPath(path: PathDoc): boolean {
  return path.status === "open"
}

type ResolverCtx = Parameters<typeof resolveViewer>[0]

async function pathBySlug(
  ctx: ResolverCtx,
  pathId: string,
): Promise<PathDoc | null> {
  return await ctx.db
    .query("paths")
    .withIndex("by_slug", (q) => q.eq("slug", pathId))
    .unique()
}

async function pathTitle(
  ctx: ResolverCtx,
  pathId: string,
): Promise<string> {
  const path = await pathBySlug(ctx, pathId)
  return path?.title ?? pathId
}

async function userName(
  ctx: ResolverCtx,
  userId: Id<"users"> | null | undefined,
): Promise<{ name: string; initials: string }> {
  if (!userId) return { name: "Belum ditetapkan", initials: "BD" }
  const user = await ctx.db.get(userId)
  return {
    name: user?.name ?? "Akun tidak ditemukan",
    initials: user?.initials ?? "BD",
  }
}

function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((completed / total) * 100))
}

function isAtRisk(enrollment: Doc<"enrollments">, now: number): boolean {
  if (enrollment.status !== "active") return false
  const last = enrollment.lastActivityAt ?? enrollment.enrolledAt
  return now - last > AT_RISK_DAYS * DAY_MS
}

async function enrollmentCounts(
  ctx: ResolverCtx,
  cohortId: Id<"cohorts">,
  now: number,
): Promise<{ enrolled: number; completed: number; atRisk: number }> {
  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_cohortId", (q) => q.eq("cohortId", cohortId))
    .collect()
  const visible = enrollments.filter((item) =>
    (ACTIVE_ENROLLMENT_STATUSES as readonly string[]).includes(item.status),
  )
  return {
    enrolled: visible.length,
    completed: visible.filter((item) => item.status === "completed").length,
    atRisk: visible.filter((item) => isAtRisk(item, now)).length,
  }
}

async function lessonTotals(
  ctx: ResolverCtx,
  pathId: string,
): Promise<{ total: number; lessonIds: Set<string> }> {
  const modules = await ctx.db
    .query("pathModules")
    .withIndex("by_path_order", (q) => q.eq("pathId", pathId))
    .collect()
  const publishedModules = modules.filter((pathModule) => pathModule.status === "published")
  const lessons = (
    await Promise.all(
      publishedModules.map((pathModule) =>
        ctx.db
          .query("lessons")
          .withIndex("by_module_order", (q) => q.eq("moduleId", pathModule._id))
          .collect(),
      ),
    )
  ).flat()
  const published = lessons.filter((lesson) => lesson.status === "published")
  return {
    total: published.length,
    lessonIds: new Set(published.map((lesson) => lesson._id)),
  }
}

async function completedLessonCount(
  ctx: ResolverCtx,
  enrollmentId: Id<"enrollments">,
  lessonIds?: Set<string>,
): Promise<number> {
  const progress = await ctx.db
    .query("lessonProgress")
    .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollmentId))
    .collect()
  return progress.filter(
    (item) =>
      item.state === "completed" &&
      (!lessonIds || lessonIds.has(item.lessonId)),
  ).length
}

async function enrollmentOverviews(
  ctx: ResolverCtx,
  enrollments: Doc<"enrollments">[],
  now: number,
): Promise<EnrollmentOverview[]> {
  const pathTitles = new Map<string, string>()
  const cohortCodes = new Map<string, string>()
  const users = new Map<string, { name: string; initials: string }>()

  const items = await Promise.all(
    enrollments.map(async (enrollment) => {
      if (!pathTitles.has(enrollment.pathId)) {
        pathTitles.set(enrollment.pathId, await pathTitle(ctx, enrollment.pathId))
      }
      if (enrollment.cohortId && !cohortCodes.has(enrollment.cohortId)) {
        const cohort = await ctx.db.get(enrollment.cohortId)
        if (cohort) cohortCodes.set(enrollment.cohortId, cohort.code)
      }
      if (!users.has(enrollment.studentId)) {
        users.set(enrollment.studentId, await userName(ctx, enrollment.studentId))
      }

      const { total, lessonIds } = await lessonTotals(ctx, enrollment.pathId)
      const completed = await completedLessonCount(
        ctx,
        enrollment._id,
        lessonIds,
      )
      const certificate = enrollment.certificateId
        ? await ctx.db.get(enrollment.certificateId)
        : null
      const user = users.get(enrollment.studentId) ?? {
        name: "Belum diisi",
        initials: "BD",
      }

      return {
        id: enrollment._id,
        studentId: enrollment.studentId,
        studentName: user.name,
        initials: user.initials,
        cohortId: enrollment.cohortId ?? null,
        cohortCode: enrollment.cohortId
          ? (cohortCodes.get(enrollment.cohortId) ?? null)
          : null,
        pathId: enrollment.pathId,
        pathTitle: pathTitles.get(enrollment.pathId) ?? enrollment.pathId,
        progress: progressPercent(completed, total),
        lastActiveAt: enrollment.lastActivityAt ?? enrollment.updatedAt,
        status: enrollment.status,
        nextTask:
          certificate?.status === "issued"
            ? "Sertifikat terbit"
            : total > 0 && completed >= total
              ? "Menunggu penilaian akhir"
              : completed > 0
                ? `Lanjut modul ${completed + 1}`
                : "Mulai modul pertama",
        certificateId: enrollment.certificateId ?? null,
        deadlineAt: enrollment.deadlineAt ?? null,
        withdrawnAt: enrollment.withdrawnAt ?? null,
        withdrawReason: enrollment.withdrawReason ?? null,
        completedAt: enrollment.completedAt ?? null,
      }
    }),
  )
  void now
  return items
}

async function cohortOverviews(
  ctx: ResolverCtx,
  cohorts: Doc<"cohorts">[],
  now: number,
): Promise<CohortOverview[]> {
  const teachers = new Map<string, { name: string }>()
  const titles = new Map<string, string>()
  const sessions = await ctx.db
    .query("cohortSessions")
    .withIndex("by_startsAt")
    .collect()

  return await Promise.all(
    cohorts.map(async (cohort) => {
      if (!teachers.has(cohort.teacherId)) {
        teachers.set(cohort.teacherId, await userName(ctx, cohort.teacherId))
      }
      if (!titles.has(cohort.pathId)) {
        titles.set(cohort.pathId, await pathTitle(ctx, cohort.pathId))
      }
      const counts = await enrollmentCounts(ctx, cohort._id, now)
      const nextSession = sessions
        .filter(
          (session) =>
            session.cohortId === cohort._id &&
            session.status === "scheduled" &&
            session.startsAt >= now,
        )
        .sort((a, b) => a.startsAt - b.startsAt)[0]

      return {
        id: cohort._id,
        code: cohort.code,
        title: cohort.title,
        pathId: cohort.pathId,
        pathTitle: titles.get(cohort.pathId) ?? cohort.pathId,
        teacherId: cohort.teacherId,
        teacherName: teachers.get(cohort.teacherId)?.name ?? "Belum diisi",
        startDate: cohort.startDate,
        endDate: cohort.endDate,
        capacity: cohort.capacity,
        enrolled: counts.enrolled,
        completed: counts.completed,
        atRisk: counts.atRisk,
        nextSessionAt: nextSession?.startsAt ?? null,
        status: cohort.status,
        timezone: cohort.timezone,
        updatedAt: cohort.updatedAt,
      }
    }),
  )
}

function scopeAllowsCohort(
  viewer: Viewer,
  cohort: Doc<"cohorts">,
  enrollmentByCohort: Set<string>,
): boolean {
  if (viewer.entitlements.operate) return true
  if (viewer.entitlements.teach && cohort.teacherId === viewer.userId) return true
  return enrollmentByCohort.has(cohort._id)
}

async function studentCohortIds(
  ctx: ResolverCtx,
  viewer: Viewer,
): Promise<Set<string>> {
  const enrollments = await ctx.db
    .query("enrollments")
    .withIndex("by_studentId", (q) => q.eq("studentId", viewer.userId as Id<"users">))
    .collect()
  return new Set(
    enrollments
      .filter((item) => item.cohortId !== undefined && item.status !== "withdrawn")
      .map((item) => item.cohortId as Id<"cohorts">),
  )
}

async function teacherCohortIds(
  ctx: ResolverCtx,
  viewer: Viewer,
): Promise<Set<string>> {
  const cohorts = await ctx.db
    .query("cohorts")
    .withIndex("by_teacherId", (q) => q.eq("teacherId", viewer.userId as Id<"users">))
    .collect()
  return new Set(cohorts.map((cohort) => cohort._id))
}

export const listPaths = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const [paths, cohorts, enrollments, modules, lessons, teachers] =
      await Promise.all([
        ctx.db.query("paths").withIndex("by_order").collect(),
        ctx.db.query("cohorts").collect(),
        ctx.db.query("enrollments").collect(),
        ctx.db.query("pathModules").collect(),
        ctx.db.query("lessons").collect(),
        ctx.db.query("teachers").collect(),
      ])

    const teacherByUserId = new Map(
      teachers
        .filter((teacher) => teacher.userId)
        .map((teacher) => [teacher.userId as string, teacher] as const),
    )

    const enrolledPathIds = new Set(
      viewer.enrollments
        .filter((item) => item.status !== "withdrawn")
        .map((item) => item.pathId),
    )
    const teacherPathIds = new Set(viewer.teachScopes)

    const visible = paths.filter((path) => {
      if (viewer.entitlements.operate) return true
      if (viewer.entitlements.teach && teacherPathIds.has(path.slug)) return true
      return enrolledPathIds.has(path.slug)
    })

    const publishedLessonsByPath = new Map<string, number>()
    const publishedModulesByPath = new Map<string, number>()
    for (const pathModule of modules) {
      if (pathModule.status !== "published") continue
      publishedModulesByPath.set(
        pathModule.pathId,
        (publishedModulesByPath.get(pathModule.pathId) ?? 0) + 1,
      )
    }
    const modulePath = new Map(modules.map((pathModule) => [pathModule._id, pathModule.pathId]))
    for (const lesson of lessons) {
      if (lesson.status !== "published") continue
      const pathId = lesson.pathId ?? modulePath.get(lesson.moduleId)
      if (!pathId) continue
      publishedLessonsByPath.set(
        pathId,
        (publishedLessonsByPath.get(pathId) ?? 0) + 1,
      )
    }

    return visible
      .map((path) => {
        const pathCohorts = cohorts.filter((cohort) => cohort.pathId === path.slug)
        const activeCohorts = pathCohorts.filter((cohort) =>
          ["enrolling", "active"].includes(cohort.status),
        )
        const relevantEnrollments = enrollments.filter(
          (enrollment) =>
            enrollment.pathId === path.slug &&
            (ACTIVE_ENROLLMENT_STATUSES as readonly string[]).includes(
              enrollment.status,
            ),
        )
        const completed = relevantEnrollments.filter(
          (enrollment) => enrollment.status === "completed",
        ).length
        const teacherProfile = path.teacherId
          ? teacherByUserId.get(path.teacherId)
          : undefined
        return {
          id: path.slug,
          slug: path.slug,
          code: path.code,
          title: path.title,
          subtitle: path.subtitle,
          teacherId: path.teacherId ?? null,
          teacherName: teacherProfile?.name ?? path.teacher,
          teacherRole: path.teacherRole,
          region: path.region,
          level: path.level,
          status: path.status as NonNullable<PathDoc["status"]>,
          price: path.price,
          priceLabel: path.priceLabel ?? null,
          tags: path.tags,
          outcome: path.outcome,
          includes: path.includes,
          modules:
            publishedModulesByPath.get(path.slug) ?? path.modules,
          lessons: publishedLessonsByPath.get(path.slug) ?? 0,
          weeks: path.weeks,
          tasks: path.tasks,
          students: relevantEnrollments.length,
          completion: progressPercent(completed, relevantEnrollments.length),
          activeCohorts: activeCohorts.length,
          atRisk: relevantEnrollments.filter((enrollment) =>
            isAtRisk(enrollment, now),
          ).length,
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title, "id"))
  },
})

export const listCohorts = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const cohorts = await ctx.db.query("cohorts").collect()
    const studentIds = await studentCohortIds(ctx, viewer)
    const visible = cohorts.filter((cohort) =>
      scopeAllowsCohort(viewer, cohort, studentIds),
    )
    return await cohortOverviews(ctx, visible, now)
  },
})

export const cohortDetail = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const cohort = await ctx.db.get(args.cohortId)
    if (!cohort) return null
    const allowed =
      viewer.entitlements.operate ||
      (viewer.entitlements.teach && cohort.teacherId === viewer.userId)
    if (!allowed) return null

    const [overview] = await cohortOverviews(ctx, [cohort], now)
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
      .collect()
    return {
      cohort: overview,
      roster: await enrollmentOverviews(ctx, enrollments, now),
    }
  },
})

export const listEnrollments = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    let enrollments: Doc<"enrollments">[]
    if (args.cohortId) {
      const cohort = await ctx.db.get(args.cohortId)
      if (!cohort) return []
      const studentIds = await studentCohortIds(ctx, viewer)
      if (!scopeAllowsCohort(viewer, cohort, studentIds)) return []
      enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_cohortId", (q) => q.eq("cohortId", args.cohortId))
        .collect()
    } else if (viewer.entitlements.operate) {
      enrollments = await ctx.db.query("enrollments").collect()
    } else if (viewer.entitlements.teach) {
      const cohortIds = await teacherCohortIds(ctx, viewer)
      enrollments = (
        await Promise.all(
          Array.from(cohortIds).map((cohortId) =>
            ctx.db
              .query("enrollments")
              .withIndex("by_cohortId", (q) => q.eq("cohortId", cohortId as Id<"cohorts">))
              .collect(),
          ),
        )
      ).flat()
    } else {
      enrollments = await ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", viewer.userId as Id<"users">))
        .collect()
    }
    return await enrollmentOverviews(ctx, enrollments, now)
  },
})

export const enrollmentDetail = query({
  args: { enrollmentId: v.id("enrollments") },
  handler: async (ctx, args) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) return null
    const cohort = enrollment.cohortId
      ? await ctx.db.get(enrollment.cohortId)
      : null
    const allowed =
      viewer.entitlements.operate ||
      enrollment.studentId === viewer.userId ||
      (viewer.entitlements.teach && cohort?.teacherId === viewer.userId)
    if (!allowed) return null

    const [overview] = await enrollmentOverviews(ctx, [enrollment], now)
    const modules = await ctx.db
      .query("pathModules")
      .withIndex("by_path_order", (q) => q.eq("pathId", enrollment.pathId))
      .collect()
    const progress = await ctx.db
      .query("lessonProgress")
      .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
      .collect()
    const progressByLesson = new Map(
      progress.map((item) => [item.lessonId, item]),
    )
    const lessons = (
      await Promise.all(
        modules
          .filter((pathModule) => pathModule.status === "published")
          .map((pathModule) =>
            ctx.db
              .query("lessons")
              .withIndex("by_module_order", (q) => q.eq("moduleId", pathModule._id))
              .collect(),
          ),
      )
    ).flat()

    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_student_status", (q) =>
        q.eq("studentId", enrollment.studentId),
      )
      .collect()
    const certificateDoc = enrollment.certificateId
      ? await ctx.db.get(enrollment.certificateId)
      : null

    return {
      enrollment: overview,
      modules: modules
        .filter((pathModule) => pathModule.status === "published")
        .sort((a, b) => a.order - b.order)
        .map((pathModule) => ({
          id: pathModule._id,
          title: pathModule.title,
          summary: pathModule.summary,
          lessons: lessons
            .filter(
              (lesson) =>
                lesson.moduleId === pathModule._id && lesson.status === "published",
            )
            .sort((a, b) => a.order - b.order)
            .map((lesson) => ({
              id: lesson._id,
              title: lesson.title,
              kind: lesson.kind,
              estimatedMinutes: lesson.estimatedMinutes,
              state: progressByLesson.get(lesson._id)?.state ?? "not_started",
              attendance: progressByLesson.get(lesson._id)?.attendance ?? null,
              completedAt: progressByLesson.get(lesson._id)?.completedAt ?? null,
            })),
        })),
      submissions: submissions
        .filter((submission) => submission.enrollmentId === enrollment._id)
        .map((submission) => ({
          id: submission._id,
          code: submission.code,
          taskTitle: submission.taskTitle,
          status: submission.status,
          submittedAt: submission.submittedAt ?? null,
          dueAt: submission.dueAt,
        })),
      certificate: certificateDoc ? await certificateOverview(ctx, certificateDoc) : null,
    }
  },
})

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const [cohorts, sessions, enrollments, teachers] = await Promise.all([
      ctx.db.query("cohorts").collect(),
      ctx.db.query("cohortSessions").withIndex("by_startsAt").collect(),
      ctx.db.query("enrollments").collect(),
      ctx.db.query("teachers").collect(),
    ])
    const enrolledCohortIds = new Set(
      enrollments
        .filter(
          (item) =>
            item.studentId === viewer.userId && item.status !== "withdrawn",
        )
        .map((item) => item.cohortId)
        .filter(Boolean) as string[],
    )
    const cohortById = new Map(cohorts.map((cohort) => [cohort._id, cohort]))
    const teacherNames = new Map(
      teachers.map((teacher) => [teacher.userId, teacher.name]),
    )
    const pathDocs = await ctx.db.query("paths").collect()
    const pathTitles = new Map(pathDocs.map((path) => [path.slug, path.title]))
    const counts = new Map<string, number>()
    for (const enrollment of enrollments) {
      if (!enrollment.cohortId) continue
      if (enrollment.status === "withdrawn") continue
      counts.set(
        enrollment.cohortId,
        (counts.get(enrollment.cohortId) ?? 0) + 1,
      )
    }

    const visible = sessions.filter((session) => {
      const cohort = cohortById.get(session.cohortId)
      if (!cohort) return false
      if (viewer.entitlements.operate) return true
      if (viewer.entitlements.teach && cohort.teacherId === viewer.userId) {
        return true
      }
      return enrolledCohortIds.has(session.cohortId)
    })

    return visible
      .map((session) => {
        const cohort = cohortById.get(session.cohortId)
        return {
          id: session._id,
          cohortId: session.cohortId,
          cohortCode: cohort?.code ?? "Belum diisi",
          pathTitle: cohort ? (pathTitles.get(cohort.pathId) ?? cohort.pathId) : "",
          teacherName: cohort
            ? (teacherNames.get(cohort.teacherId) ?? "Belum diisi")
            : "Belum diisi",
          title: session.title,
          kind: session.kind,
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          timezone: session.timezone,
          roomId: session.roomId ?? null,
          status: session.status,
          attendees: counts.get(session.cohortId) ?? 0,
          past: session.endsAt < now,
        }
      })
      .sort((a, b) => a.startsAt - b.startsAt)
  },
})

export const createCohort = mutation({
  args: {
    code: v.string(),
    pathId: v.string(),
    teacherId: v.optional(v.id("users")),
    title: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    capacity: v.number(),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const teacherId = (viewer.entitlements.operate
      ? args.teacherId
      : viewer.userId) as Id<"users"> | undefined
    if (!teacherId) {
      throw new ConvexError({
        code: "INVALID_TEACHER",
        message: "Pengelola harus memilih pengajar kohort.",
      })
    }
    if (!viewer.entitlements.operate && !viewer.entitlements.teach) {
      requireAnyCapability(viewer, ["teach", "operate"])
    }
    if (viewer.entitlements.teach && !viewer.entitlements.operate) {
      assertScope(viewer, "teach", args.pathId)
    }

    const path = await pathBySlug(ctx, args.pathId)
    if (!path || !isOpenPath(path)) {
      throw new ConvexError({
        code: "PATH_NOT_OPEN",
        message: "Jalur belum terbuka untuk kohort.",
      })
    }
    if (!args.code.trim() || !args.title.trim()) {
      throw new ConvexError({
        code: "INVALID_COHORT",
        message: "Kode dan judul kohort wajib diisi.",
      })
    }
    if (args.startDate >= args.endDate) {
      throw new ConvexError({
        code: "INVALID_SCHEDULE",
        message: "Tanggal selesai harus setelah tanggal mulai.",
      })
    }
    if (!Number.isInteger(args.capacity) || args.capacity < 1) {
      throw new ConvexError({
        code: "INVALID_CAPACITY",
        message: "Kapasitas kohort harus bilangan bulat positif.",
      })
    }

    const teacher = await ctx.db.get(teacherId)
    if (!teacher) {
      throw new ConvexError({
        code: "INVALID_TEACHER",
        message: "Pengajar tidak ditemukan.",
      })
    }
    const teacherProfile = await ctx.db
      .query("teachers")
      .withIndex("by_userId", (q) => q.eq("userId", teacherId))
      .collect()
    const activeProfile = teacherProfile.find(
      (profile) =>
        profile.status === "active" &&
        (profile.pathIds ?? []).includes(args.pathId),
    )
    if (!activeProfile) {
      throw new ConvexError({
        code: "TEACHER_OUT_OF_SCOPE",
        message: "Pengajar belum aktif untuk jalur ini.",
      })
    }

    const existing = await ctx.db
      .query("cohorts")
      .withIndex("by_pathId", (q) => q.eq("pathId", args.pathId))
      .collect()
    if (existing.some((cohort) => cohort.code === args.code.trim())) {
      throw new ConvexError({
        code: "DUPLICATE_COHORT",
        message: "Kode kohort sudah dipakai pada jalur ini.",
      })
    }

    const timestamp = nowMs()
    const cohortId = await ctx.db.insert("cohorts", {
      code: args.code.trim(),
      pathId: args.pathId,
      teacherId,
      title: args.title.trim(),
      startDate: args.startDate,
      endDate: args.endDate,
      capacity: args.capacity,
      timezone: args.timezone ?? DEFAULT_TIMEZONE,
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.createCohort",
      entityType: "cohorts",
      entityId: cohortId,
      reason: "Kohort dibuat",
      after: { code: args.code, pathId: args.pathId, capacity: args.capacity },
    })
    return { cohortId }
  },
})

export const updateCohortStatus = mutation({
  args: {
    cohortId: v.id("cohorts"),
    status: v.union(
      v.literal("draft"),
      v.literal("enrolling"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const cohort = await ctx.db.get(args.cohortId)
    if (!cohort) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Kohort tidak ditemukan." })
    }
    const allowed =
      viewer.entitlements.operate ||
      (viewer.entitlements.teach && cohort.teacherId === viewer.userId)
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Kohort ini di luar cakupan akun.",
      })
    }
    if (!viewer.entitlements.operate) {
      assertScope(viewer, "teach", cohort.pathId)
    }
    if (args.reason.trim().length < 4) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Alasan perubahan status wajib diisi.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(cohort._id, { status: args.status, updatedAt: timestamp })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.updateCohortStatus",
      entityType: "cohorts",
      entityId: cohort._id,
      reason: args.reason,
      before: { status: cohort.status },
      after: { status: args.status },
    })
    return null
  },
})

export const createEnrollment = mutation({
  args: {
    pathId: v.string(),
    cohortId: v.optional(v.id("cohorts")),
    studentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const studentId = (args.studentId ?? viewer.userId) as Id<"users">
    if (studentId !== viewer.userId) {
      requireAnyCapability(viewer, ["operate", "people.manage"])
    } else {
      requireAnyCapability(viewer, ["learn", "operate"])
    }

    const path = await pathBySlug(ctx, args.pathId)
    if (!path || !isOpenPath(path)) {
      throw new ConvexError({
        code: "PATH_NOT_OPEN",
        message: "Jalur ini belum membuka pendaftaran.",
      })
    }

    let cohort: Doc<"cohorts"> | null = null
    if (args.cohortId) {
      cohort = await ctx.db.get(args.cohortId)
      if (!cohort) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Kohort tidak ditemukan.",
        })
      }
      if (cohort.pathId !== args.pathId) {
        throw new ConvexError({
          code: "PATH_MISMATCH",
          message: "Kohort bukan bagian dari jalur ini.",
        })
      }
      if (!["enrolling", "active"].includes(cohort.status)) {
        throw new ConvexError({
          code: "COHORT_CLOSED",
          message: "Kohort tidak menerima pendaftaran.",
        })
      }
    }

    const existing = await ctx.db
      .query("enrollments")
      .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
      .collect()
    const duplicate = cohort
      ? existing.some(
          (item) =>
            item.cohortId === cohort?._id && item.status !== "withdrawn",
        )
      : existing.some(
          (item) =>
            item.pathId === args.pathId &&
            item.cohortId === undefined &&
            item.status !== "withdrawn",
        )
    if (duplicate) {
      throw new ConvexError({
        code: "DUPLICATE_ENROLLMENT",
        message: "Pendaftaran untuk kohort ini sudah ada.",
      })
    }

    if (cohort) {
      const counts = await enrollmentCounts(ctx, cohort._id, nowMs())
      if (counts.enrolled >= cohort.capacity) {
        throw new ConvexError({
          code: "COHORT_FULL",
          message: "Kursi kohort sudah penuh.",
        })
      }
    }

    const timestamp = nowMs()
    const enrollmentId = await ctx.db.insert("enrollments", {
      studentId,
      pathId: args.pathId,
      cohortId: cohort?._id,
      status: "pending_payment",
      enrolledAt: timestamp,
      lastActivityAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.createEnrollment",
      entityType: "enrollments",
      entityId: enrollmentId,
      reason: studentId === viewer.userId ? "Pendaftaran peserta" : "Pendaftaran oleh pengelola",
      after: { pathId: args.pathId, cohortId: cohort?._id, status: "pending_payment" },
    })
    return { enrollmentId }
  },
})

export const activateEnrollment = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["operate", "people.manage", "orders.read.all"])
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    if (enrollment.status !== "pending_payment") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Hanya pendaftaran menunggu pembayaran yang dapat diaktifkan.",
      })
    }
    if (enrollment.cohortId) {
      const cohort = await ctx.db.get(enrollment.cohortId)
      if (cohort) {
        const counts = await enrollmentCounts(ctx, cohort._id, nowMs())
        if (counts.enrolled >= cohort.capacity) {
          throw new ConvexError({
            code: "COHORT_FULL",
            message: "Kursi kohort sudah penuh.",
          })
        }
      }
    }
    const timestamp = nowMs()
    await ctx.db.patch(enrollment._id, {
      status: "active",
      enrolledAt: enrollment.enrolledAt,
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.activateEnrollment",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: args.reason ?? "Pembayaran terverifikasi",
      before: { status: enrollment.status },
      after: { status: "active" },
    })
    return { status: "active" as const }
  },
})

export const withdrawEnrollment = mutation({
  args: { enrollmentId: v.id("enrollments"), reason: v.string() },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    const allowed =
      viewer.entitlements.operate || enrollment.studentId === viewer.userId
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Pendaftaran ini di luar cakupan akun.",
      })
    }
    if (!["pending_payment", "active"].includes(enrollment.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Pendaftaran ini tidak dapat ditarik.",
      })
    }
    if (args.reason.trim().length < 4) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Alasan penarikan wajib diisi.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(enrollment._id, {
      status: "withdrawn",
      withdrawnAt: timestamp,
      withdrawReason: args.reason,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.withdrawEnrollment",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: args.reason,
      before: { status: enrollment.status },
      after: { status: "withdrawn" },
    })
    return { status: "withdrawn" as const }
  },
})

const COMPLETION_RULE = {
  requiresAllPublishedLessons: true,
  certificateCountsAsCompletion: true,
} as const

export const completeEnrollment = mutation({
  args: { enrollmentId: v.id("enrollments"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    const cohort = enrollment.cohortId
      ? await ctx.db.get(enrollment.cohortId)
      : null
    const allowed =
      viewer.entitlements.operate ||
      (viewer.entitlements.teach && cohort?.teacherId === viewer.userId)
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Pendaftaran ini di luar cakupan akun.",
      })
    }
    if (!viewer.entitlements.operate) {
      assertScope(viewer, "teach", enrollment.pathId)
    }
    if (enrollment.status !== "active") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Hanya pendaftaran aktif yang dapat diselesaikan.",
      })
    }

    const { total, lessonIds } = await lessonTotals(ctx, enrollment.pathId)
    const completed = await completedLessonCount(
      ctx,
      enrollment._id,
      lessonIds,
    )
    const certificate = enrollment.certificateId
      ? await ctx.db.get(enrollment.certificateId)
      : null
    const certificateValid = certificate?.status === "issued"
    const lessonsComplete =
      total === 0 || completed >= total
    if (
      COMPLETION_RULE.requiresAllPublishedLessons &&
      !lessonsComplete &&
      !(COMPLETION_RULE.certificateCountsAsCompletion && certificateValid)
    ) {
      throw new ConvexError({
        code: "INCOMPLETE",
        message: `Penyelesaian mengikuti aturan jalur: ${completed} dari ${total} pelajaran selesai.`,
      })
    }

    const timestamp = nowMs()
    await ctx.db.patch(enrollment._id, {
      status: "completed",
      completedAt: timestamp,
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.completeEnrollment",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: args.reason ?? "Aturan penyelesaian jalur terpenuhi",
      before: { status: enrollment.status },
      after: { status: "completed" },
    })
    return { status: "completed" as const }
  },
})

export const moveEnrollment = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    cohortId: v.id("cohorts"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["operate", "people.manage"])
    const enrollment = await ctx.db.get(args.enrollmentId)
    const cohort = await ctx.db.get(args.cohortId)
    if (!enrollment || !cohort) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran atau kohort tidak ditemukan.",
      })
    }
    if (cohort.pathId !== enrollment.pathId) {
      throw new ConvexError({
        code: "PATH_MISMATCH",
        message: "Kohort tujuan bukan bagian dari jalur ini.",
      })
    }
    if (enrollment.cohortId === cohort._id) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Pendaftaran sudah berada di kohort ini.",
      })
    }
    if (!["enrolling", "active"].includes(cohort.status)) {
      throw new ConvexError({
        code: "COHORT_CLOSED",
        message: "Kohort tujuan tidak menerima peserta.",
      })
    }
    if (args.reason.trim().length < 4) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Alasan pemindahan wajib diisi.",
      })
    }
    const counts = await enrollmentCounts(ctx, cohort._id, nowMs())
    if (counts.enrolled >= cohort.capacity) {
      throw new ConvexError({
        code: "COHORT_FULL",
        message: "Kohort tujuan sudah penuh.",
      })
    }
    const timestamp = nowMs()
    await ctx.db.patch(enrollment._id, {
      cohortId: cohort._id,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.moveEnrollment",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: args.reason,
      before: { cohortId: enrollment.cohortId },
      after: { cohortId: cohort._id },
    })
    return null
  },
})

export const extendDeadline = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    deadlineAt: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["operate", "people.manage"])
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    if (args.deadlineAt <= nowMs()) {
      throw new ConvexError({
        code: "INVALID_DEADLINE",
        message: "Tenggat baru harus di masa depan.",
      })
    }
    if (args.reason.trim().length < 4) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Alasan perpanjangan wajib diisi.",
      })
    }
    await ctx.db.patch(enrollment._id, {
      deadlineAt: args.deadlineAt,
      updatedAt: nowMs(),
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.extendDeadline",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: args.reason,
      before: { deadlineAt: enrollment.deadlineAt },
      after: { deadlineAt: args.deadlineAt },
    })
    return null
  },
})

export const recordProgress = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    lessonId: v.id("lessons"),
    state: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
    ),
  },
  handler: async (ctx, args) => {
    const viewer = await requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["learn", "operate"])
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    if (
      enrollment.studentId !== viewer.userId &&
      !viewer.entitlements.operate
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Progres hanya dapat dicatat oleh pemilik pendaftaran.",
      })
    }
    if (enrollment.status !== "active") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Progres hanya untuk pendaftaran aktif.",
      })
    }
    const lesson = await ctx.db.get(args.lessonId)
    if (!lesson || lesson.pathId !== enrollment.pathId) {
      throw new ConvexError({
        code: "INVALID_LESSON",
        message: "Pelajaran bukan bagian dari jalur ini.",
      })
    }
    if (lesson.status !== "published") {
      throw new ConvexError({
        code: "INVALID_LESSON",
        message: "Pelajaran belum terbit.",
      })
    }

    const timestamp = nowMs()
    const existing = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", enrollment.studentId).eq("lessonId", lesson._id),
      )
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        enrollmentId: enrollment._id,
        state: args.state,
        completedAt:
          args.state === "completed"
            ? (existing.completedAt ?? timestamp)
            : undefined,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("lessonProgress", {
        userId: enrollment.studentId,
        enrollmentId: enrollment._id,
        lessonId: lesson._id,
        state: args.state,
        completedAt: args.state === "completed" ? timestamp : undefined,
        updatedAt: timestamp,
      })
    }
    await ctx.db.patch(enrollment._id, {
      lastActivityAt: timestamp,
      updatedAt: timestamp,
    })
    return { state: args.state }
  },
})

export const recordAttendance = mutation({
  args: {
    enrollmentId: v.id("enrollments"),
    lessonId: v.id("lessons"),
    attendance: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("excused"),
    ),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const enrollment = await ctx.db.get(args.enrollmentId)
    if (!enrollment) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Pendaftaran tidak ditemukan.",
      })
    }
    const cohort = enrollment.cohortId
      ? await ctx.db.get(enrollment.cohortId)
      : null
    if (viewer.entitlements.operate) {
      // Admin can record attendance; no grading or submission rights are implied.
    } else if (viewer.entitlements.teach && cohort?.teacherId === viewer.userId) {
      assertScope(viewer, "teach", enrollment.pathId)
    } else {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Kehadiran hanya dapat dicatat pengajar kohort.",
      })
    }

    const lesson = await ctx.db.get(args.lessonId)
    if (!lesson || lesson.pathId !== enrollment.pathId) {
      throw new ConvexError({
        code: "INVALID_LESSON",
        message: "Pelajaran bukan bagian dari jalur ini.",
      })
    }
    const timestamp = nowMs()
    const existing = await ctx.db
      .query("lessonProgress")
      .withIndex("by_user_lesson", (q) =>
        q.eq("userId", enrollment.studentId).eq("lessonId", lesson._id),
      )
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, {
        attendance: args.attendance,
        updatedAt: timestamp,
      })
    } else {
      await ctx.db.insert("lessonProgress", {
        userId: enrollment.studentId,
        enrollmentId: enrollment._id,
        lessonId: lesson._id,
        state: "not_started",
        attendance: args.attendance,
        updatedAt: timestamp,
      })
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.recordAttendance",
      entityType: "enrollments",
      entityId: enrollment._id,
      reason: `Kehadiran ${args.attendance}`,
      after: { lessonId: lesson._id, attendance: args.attendance },
    })
    return { attendance: args.attendance }
  },
})

export const createSession = mutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
    kind: v.union(
      v.literal("session"),
      v.literal("office_hours"),
      v.literal("call"),
      v.literal("assessment"),
    ),
    startsAt: v.number(),
    endsAt: v.number(),
    roomId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const cohort = await ctx.db.get(args.cohortId)
    if (!cohort) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Kohort tidak ditemukan.",
      })
    }
    const allowed =
      viewer.entitlements.operate ||
      (viewer.entitlements.teach && cohort.teacherId === viewer.userId)
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Sesi hanya dapat dibuat pengajar kohort.",
      })
    }
    if (!viewer.entitlements.operate) {
      assertScope(viewer, "teach", cohort.pathId)
    }
    if (args.startsAt >= args.endsAt) {
      throw new ConvexError({
        code: "INVALID_SCHEDULE",
        message: "Waktu selesai harus setelah waktu mulai.",
      })
    }
    const timestamp = nowMs()
    const sessionId = await ctx.db.insert("cohortSessions", {
      cohortId: cohort._id,
      title: args.title.trim(),
      kind: args.kind,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      timezone: cohort.timezone,
      roomId: args.roomId,
      status: "scheduled",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.createSession",
      entityType: "cohortSessions",
      entityId: sessionId,
      reason: "Sesi kohort dibuat",
      after: { cohortId: cohort._id, startsAt: args.startsAt },
    })
    return { sessionId }
  },
})

export const updateSessionStatus = mutation({
  args: {
    sessionId: v.id("cohortSessions"),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended"),
      v.literal("cancelled"),
    ),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const session = await ctx.db.get(args.sessionId)
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sesi tidak ditemukan.",
      })
    }
    const cohort = await ctx.db.get(session.cohortId)
    const allowed =
      viewer.entitlements.operate ||
      (viewer.entitlements.teach && cohort?.teacherId === viewer.userId)
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Sesi ini di luar cakupan akun.",
      })
    }
    const legal: Record<string, string[]> = {
      scheduled: ["live", "ended", "cancelled"],
      live: ["ended", "cancelled"],
      ended: [],
      cancelled: [],
    }
    if (!(legal[session.status] ?? []).includes(args.status)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "Perpindahan status sesi tidak sah.",
      })
    }
    await ctx.db.patch(session._id, { status: args.status })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.updateSessionStatus",
      entityType: "cohortSessions",
      entityId: session._id,
      reason: args.reason ?? "Status sesi diperbarui",
      before: { status: session.status },
      after: { status: args.status },
    })
    return null
  },
})

/** Generates a cohort code for the admin UI. Collision-safe by construction. */
export const nextCohortCode = query({
  args: { pathId: v.string() },
  handler: async (ctx, args) => {
    await requireWorkspaceViewer(ctx)
    const existing = await ctx.db
      .query("cohorts")
      .withIndex("by_pathId", (q) => q.eq("pathId", args.pathId))
      .collect()
    const prefix = args.pathId
      .split("-")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 3)
    let candidate = randomCode(prefix || "KOH", 3).toUpperCase()
    while (existing.some((cohort) => cohort.code === candidate)) {
      candidate = randomCode(prefix || "KOH", 3).toUpperCase()
    }
    return { code: candidate }
  },
})
