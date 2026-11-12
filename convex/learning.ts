import { ConvexError, v } from "convex/values"

import type { Viewer } from "../lib/access/viewer"
import { assertScope } from "./access"
import { certificateOverview } from "./certificates"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx } from "./_generated/server"
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

type CurriculumEditor = {
  viewer: Viewer
  path: PathDoc
}

/**
 * Curriculum authoring is limited to the teacher who owns the path or an
 * operator holding `content.publish`/`operate`. The path scope is always
 * derived on the server from the viewer contract.
 */
async function requireCurriculumEditor(
  ctx: ResolverCtx,
  pathId: string,
): Promise<CurriculumEditor> {
  const viewer = requireActiveViewer(await resolveViewer(ctx))
  const path = await pathBySlug(ctx, pathId)
  if (!path) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Jalur tidak ditemukan.",
    })
  }
  if (
    viewer.entitlements.operate ||
    viewer.capabilities.includes("content.publish")
  ) {
    requireAnyCapability(viewer, ["operate", "content.publish"])
    return { viewer, path }
  }
  if (viewer.entitlements.teach) {
    assertScope(viewer, "teach", path.slug)
    return { viewer, path }
  }
  throw new ConvexError({
    code: "FORBIDDEN",
    message: "Kurikulum hanya dapat diubah pengajar jalur atau pengelola.",
  })
}

async function moduleForEditor(
  ctx: ResolverCtx,
  moduleId: Id<"pathModules">,
): Promise<{ module: Doc<"pathModules"> } & CurriculumEditor> {
  const pathModule = await ctx.db.get(moduleId)
  if (!pathModule) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Modul tidak ditemukan.",
    })
  }
  const editor = await requireCurriculumEditor(ctx, pathModule.pathId)
  return { module: pathModule, ...editor }
}

async function lessonForEditor(
  ctx: ResolverCtx,
  lessonId: Id<"lessons">,
): Promise<{
  lesson: Doc<"lessons">
  module: Doc<"pathModules">
} & CurriculumEditor> {
  const lesson = await ctx.db.get(lessonId)
  if (!lesson) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Pelajaran tidak ditemukan.",
    })
  }
  const pathModule = await ctx.db.get(lesson.moduleId)
  if (!pathModule) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Modul pelajaran tidak ditemukan.",
    })
  }
  const editor = await requireCurriculumEditor(ctx, pathModule.pathId)
  return { lesson, module: pathModule, ...editor }
}

function requireCurriculumTitle(value: string, label: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    throw new ConvexError({
      code: "INVALID_TITLE",
      message: `${label} wajib diisi minimal 2 karakter.`,
    })
  }
  return trimmed
}

function requireEstimatedMinutes(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 100_000) {
    throw new ConvexError({
      code: "INVALID_DURATION",
      message: "Estimasi menit harus bilangan bulat antara 0 dan 100.000.",
    })
  }
  return value
}

function requireOrder(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new ConvexError({
      code: "INVALID_ORDER",
      message: "Urutan harus bilangan bulat positif.",
    })
  }
  return value
}

async function validateMediaAssets(
  ctx: ResolverCtx,
  ids: Id<"mediaAssets">[] | undefined,
): Promise<Id<"mediaAssets">[]> {
  if (!ids || ids.length === 0) return []
  const unique = Array.from(new Set(ids))
  for (const id of unique) {
    const asset = await ctx.db.get(id)
    if (!asset || asset.status !== "active") {
      throw new ConvexError({
        code: "INVALID_MEDIA",
        message: "Aset media tidak ditemukan atau sudah diarsipkan.",
      })
    }
  }
  return unique
}

async function mediaView(
  ctx: ResolverCtx,
  asset: Doc<"mediaAssets">,
): Promise<{
  id: Id<"mediaAssets">
  kind: Doc<"mediaAssets">["kind"]
  filename: string
  mimeType: string
  alt: string
  caption: string | null
  url: string | null
}> {
  const url = asset.storageId
    ? await ctx.storage.getUrl(asset.storageId)
    : (asset.externalUrl ?? null)
  return {
    id: asset._id,
    kind: asset.kind,
    filename: asset.filename,
    mimeType: asset.mimeType,
    alt: asset.alt,
    caption: asset.caption ?? null,
    url,
  }
}

/** Keeps the stored `paths.modules` count aligned with published modules. */
async function syncPathModuleCount(
  ctx: MutationCtx,
  pathId: string,
): Promise<number> {
  const modules = await ctx.db
    .query("pathModules")
    .withIndex("by_path_order", (q) => q.eq("pathId", pathId))
    .collect()
  const published = modules.filter(
    (pathModule) => pathModule.status === "published",
  ).length
  const path = await pathBySlug(ctx, pathId)
  if (path && path.modules !== published) {
    await ctx.db.patch(path._id, { modules: published })
  }
  return published
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

    const mediaIds = Array.from(
      new Set(lessons.flatMap((lesson) => lesson.mediaAssetIds)),
    )
    const mediaDocs = await Promise.all(
      mediaIds.map((id) => ctx.db.get(id)),
    )
    const mediaById = new Map<string, Awaited<ReturnType<typeof mediaView>>>()
    for (const asset of mediaDocs) {
      if (asset) mediaById.set(asset._id, await mediaView(ctx, asset))
    }

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
          order: pathModule.order,
          status: pathModule.status,
          estimatedMinutes: pathModule.estimatedMinutes,
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
              body: lesson.body,
              order: lesson.order,
              status: lesson.status,
              accessLevel: lesson.accessLevel,
              estimatedMinutes: lesson.estimatedMinutes,
              media: lesson.mediaAssetIds
                .map((id) => mediaById.get(id))
                .filter(
                  (
                    asset,
                  ): asset is Awaited<ReturnType<typeof mediaView>> =>
                    asset !== undefined,
                ),
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

/**
 * Curriculum authoring read model. Only the path's teacher or an operator can
 * read it; students keep using `enrollmentDetail`.
 */
export const getCurriculum = query({
  args: { pathId: v.string() },
  handler: async (ctx, args) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    const path = await pathBySlug(ctx, args.pathId)
    if (!path) return null
    const allowed =
      viewer.entitlements.operate ||
      viewer.capabilities.includes("content.publish") ||
      (viewer.entitlements.teach && viewer.teachScopes.includes(path.slug))
    if (!allowed) return null

    const modules = await ctx.db
      .query("pathModules")
      .withIndex("by_path_order", (q) => q.eq("pathId", path.slug))
      .collect()
    const lessons = (
      await Promise.all(
        modules.map((pathModule) =>
          ctx.db
            .query("lessons")
            .withIndex("by_module_order", (q) =>
              q.eq("moduleId", pathModule._id),
            )
            .collect(),
        ),
      )
    ).flat()

    const mediaIds = Array.from(
      new Set(lessons.flatMap((lesson) => lesson.mediaAssetIds)),
    )
    const mediaDocs = await Promise.all(
      mediaIds.map((id) => ctx.db.get(id)),
    )
    const mediaById = new Map<string, Awaited<ReturnType<typeof mediaView>>>()
    for (const asset of mediaDocs) {
      if (asset) mediaById.set(asset._id, await mediaView(ctx, asset))
    }

    const orderedModules = modules
      .sort((a, b) => a.order - b.order)
      .map((pathModule) => {
        const moduleLessons = lessons
          .filter((lesson) => lesson.moduleId === pathModule._id)
          .sort((a, b) => a.order - b.order)
        return {
          id: pathModule._id,
          title: pathModule.title,
          summary: pathModule.summary,
          estimatedMinutes: pathModule.estimatedMinutes,
          order: pathModule.order,
          status: pathModule.status,
          lessonCount: moduleLessons.length,
          publishedLessonCount: moduleLessons.filter(
            (lesson) => lesson.status === "published",
          ).length,
          totalMinutes: moduleLessons.reduce(
            (total, lesson) => total + lesson.estimatedMinutes,
            0,
          ),
          lessons: moduleLessons.map((lesson) => ({
            id: lesson._id,
            title: lesson.title,
            kind: lesson.kind,
            body: lesson.body,
            estimatedMinutes: lesson.estimatedMinutes,
            accessLevel: lesson.accessLevel,
            order: lesson.order,
            status: lesson.status,
            mediaAssetIds: lesson.mediaAssetIds,
            media: lesson.mediaAssetIds
              .map((id) => mediaById.get(id))
              .filter(
                (
                  asset,
                ): asset is Awaited<ReturnType<typeof mediaView>> =>
                  asset !== undefined,
              ),
          })),
        }
      })

    const publishedModules = orderedModules.filter(
      (pathModule) => pathModule.status === "published",
    )
    const publishedLessons = orderedModules
      .filter((pathModule) => pathModule.status === "published")
      .flatMap((pathModule) =>
        pathModule.lessons.filter((lesson) => lesson.status === "published"),
      )

    return {
      path: {
        id: path.slug,
        slug: path.slug,
        title: path.title,
        status: path.status ?? "planned",
        modules: path.modules,
        lessons: publishedLessons.length,
        tasks: path.tasks,
        weeks: path.weeks,
      },
      modules: orderedModules,
      counts: {
        modules: orderedModules.length,
        publishedModules: publishedModules.length,
        lessons: orderedModules.reduce(
          (total, pathModule) => total + pathModule.lessons.length,
          0,
        ),
        publishedLessons: publishedLessons.length,
        estimatedMinutes: orderedModules.reduce(
          (total, pathModule) => total + pathModule.estimatedMinutes,
          0,
        ),
      },
    }
  },
})

/** Active media assets a teacher can attach to a lesson. */
export const listCurriculumMedia = query({
  args: {},
  handler: async (ctx) => {
    const viewer = requireActiveViewer(await resolveViewer(ctx))
    requireAnyCapability(viewer, ["teach", "operate", "content.publish"])
    const assets = await ctx.db
      .query("mediaAssets")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200)
    return await Promise.all(
      assets
        .filter((asset) => asset.status === "active")
        .map((asset) => mediaView(ctx, asset)),
    )
  },
})

export const createModule = mutation({
  args: {
    pathId: v.string(),
    title: v.string(),
    summary: v.string(),
    estimatedMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    const { viewer, path } = await requireCurriculumEditor(ctx, args.pathId)
    const title = requireCurriculumTitle(args.title, "Judul modul")
    const estimatedMinutes = requireEstimatedMinutes(args.estimatedMinutes)
    const existing = await ctx.db
      .query("pathModules")
      .withIndex("by_path_order", (q) => q.eq("pathId", path.slug))
      .collect()
    const order =
      existing.reduce((max, pathModule) => Math.max(max, pathModule.order), 0) +
      1
    const timestamp = nowMs()
    const moduleId = await ctx.db.insert("pathModules", {
      order,
      pathId: path.slug,
      title,
      summary: args.summary.trim(),
      estimatedMinutes,
      status: "draft",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.createModule",
      entityType: "pathModules",
      entityId: moduleId,
      reason: "Modul kurikulum dibuat",
      after: { pathId: path.slug, title, order, status: "draft" },
    })
    return { moduleId }
  },
})

export const updateModule = mutation({
  args: {
    moduleId: v.id("pathModules"),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    const patch: Partial<Doc<"pathModules">> = {}
    if (args.title !== undefined) {
      patch.title = requireCurriculumTitle(args.title, "Judul modul")
    }
    if (args.summary !== undefined) patch.summary = args.summary.trim()
    if (args.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = requireEstimatedMinutes(args.estimatedMinutes)
    }
    if (args.order !== undefined) patch.order = requireOrder(args.order)
    if (Object.keys(patch).length === 0) return null

    await ctx.db.patch(module._id, patch)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.updateModule",
      entityType: "pathModules",
      entityId: module._id,
      reason: "Modul kurikulum diperbarui",
      before: {
        title: module.title,
        summary: module.summary,
        estimatedMinutes: module.estimatedMinutes,
        order: module.order,
      },
      after: patch,
    })
    return null
  },
})

export const publishModule = mutation({
  args: { moduleId: v.id("pathModules") },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    if (module.status === "published") return { status: "published" as const }
    await ctx.db.patch(module._id, { status: "published" })
    const modules = await syncPathModuleCount(ctx, module.pathId)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.publishModule",
      entityType: "pathModules",
      entityId: module._id,
      reason: "Modul diterbitkan",
      before: { status: module.status },
      after: { status: "published", pathModules: modules },
    })
    return { status: "published" as const }
  },
})

export const unpublishModule = mutation({
  args: { moduleId: v.id("pathModules") },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    if (module.status === "draft") return { status: "draft" as const }
    await ctx.db.patch(module._id, { status: "draft" })
    const modules = await syncPathModuleCount(ctx, module.pathId)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.unpublishModule",
      entityType: "pathModules",
      entityId: module._id,
      reason: "Modul ditarik ke draf",
      before: { status: module.status },
      after: { status: "draft", pathModules: modules },
    })
    return { status: "draft" as const }
  },
})

export const deleteModule = mutation({
  args: { moduleId: v.id("pathModules") },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_module_order", (q) => q.eq("moduleId", module._id))
      .collect()
    if (lessons.length > 0) {
      throw new ConvexError({
        code: "MODULE_NOT_EMPTY",
        message:
          "Modul masih memiliki pelajaran. Hapus atau pindahkan pelajaran terlebih dahulu.",
      })
    }
    await ctx.db.delete(module._id)
    const modules = await syncPathModuleCount(ctx, module.pathId)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.deleteModule",
      entityType: "pathModules",
      entityId: module._id,
      reason: "Modul kurikulum dihapus",
      before: {
        pathId: module.pathId,
        title: module.title,
        status: module.status,
      },
      after: { pathModules: modules },
    })
    return null
  },
})

export const createLesson = mutation({
  args: {
    moduleId: v.id("pathModules"),
    title: v.string(),
    kind: v.union(
      v.literal("text"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("file"),
      v.literal("practice"),
    ),
    body: v.string(),
    estimatedMinutes: v.number(),
    accessLevel: v.union(
      v.literal("public"),
      v.literal("enrolled"),
      v.literal("certified"),
    ),
    mediaAssetIds: v.optional(v.array(v.id("mediaAssets"))),
  },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    const title = requireCurriculumTitle(args.title, "Judul pelajaran")
    const estimatedMinutes = requireEstimatedMinutes(args.estimatedMinutes)
    const mediaAssetIds = await validateMediaAssets(ctx, args.mediaAssetIds)
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_module_order", (q) => q.eq("moduleId", module._id))
      .collect()
    const order =
      existing.reduce((max, lesson) => Math.max(max, lesson.order), 0) + 1
    const timestamp = nowMs()
    const lessonId = await ctx.db.insert("lessons", {
      order,
      moduleId: module._id,
      pathId: module.pathId,
      title,
      kind: args.kind,
      body: args.body.trim(),
      mediaAssetIds,
      estimatedMinutes,
      accessLevel: args.accessLevel,
      status: "draft",
      createdAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.createLesson",
      entityType: "lessons",
      entityId: lessonId,
      reason: "Pelajaran kurikulum dibuat",
      after: {
        moduleId: module._id,
        pathId: module.pathId,
        title,
        kind: args.kind,
        order,
        status: "draft",
      },
    })
    return { lessonId }
  },
})

export const updateLesson = mutation({
  args: {
    lessonId: v.id("lessons"),
    title: v.optional(v.string()),
    kind: v.optional(
      v.union(
        v.literal("text"),
        v.literal("video"),
        v.literal("audio"),
        v.literal("file"),
        v.literal("practice"),
      ),
    ),
    body: v.optional(v.string()),
    estimatedMinutes: v.optional(v.number()),
    accessLevel: v.optional(
      v.union(
        v.literal("public"),
        v.literal("enrolled"),
        v.literal("certified"),
      ),
    ),
    mediaAssetIds: v.optional(v.array(v.id("mediaAssets"))),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { viewer, lesson } = await lessonForEditor(ctx, args.lessonId)
    const patch: Partial<Doc<"lessons">> = {}
    if (args.title !== undefined) {
      patch.title = requireCurriculumTitle(args.title, "Judul pelajaran")
    }
    if (args.kind !== undefined) patch.kind = args.kind
    if (args.body !== undefined) patch.body = args.body.trim()
    if (args.estimatedMinutes !== undefined) {
      patch.estimatedMinutes = requireEstimatedMinutes(args.estimatedMinutes)
    }
    if (args.accessLevel !== undefined) patch.accessLevel = args.accessLevel
    if (args.mediaAssetIds !== undefined) {
      patch.mediaAssetIds = await validateMediaAssets(ctx, args.mediaAssetIds)
    }
    if (args.order !== undefined) patch.order = requireOrder(args.order)
    if (Object.keys(patch).length === 0) return null

    await ctx.db.patch(lesson._id, patch)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.updateLesson",
      entityType: "lessons",
      entityId: lesson._id,
      reason: "Pelajaran kurikulum diperbarui",
      before: {
        title: lesson.title,
        kind: lesson.kind,
        estimatedMinutes: lesson.estimatedMinutes,
        accessLevel: lesson.accessLevel,
        order: lesson.order,
        mediaAssetIds: lesson.mediaAssetIds,
      },
      after: patch,
    })
    return null
  },
})

export const publishLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const { viewer, lesson } = await lessonForEditor(ctx, args.lessonId)
    if (lesson.status === "published") return { status: "published" as const }
    await ctx.db.patch(lesson._id, { status: "published" })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.publishLesson",
      entityType: "lessons",
      entityId: lesson._id,
      reason: "Pelajaran diterbitkan",
      before: { status: lesson.status },
      after: { status: "published" },
    })
    return { status: "published" as const }
  },
})

export const unpublishLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const { viewer, lesson } = await lessonForEditor(ctx, args.lessonId)
    if (lesson.status === "draft") return { status: "draft" as const }
    await ctx.db.patch(lesson._id, { status: "draft" })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.unpublishLesson",
      entityType: "lessons",
      entityId: lesson._id,
      reason: "Pelajaran ditarik ke draf",
      before: { status: lesson.status },
      after: { status: "draft" },
    })
    return { status: "draft" as const }
  },
})

export const deleteLesson = mutation({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, args) => {
    const { viewer, lesson } = await lessonForEditor(ctx, args.lessonId)
    const allProgress = await ctx.db.query("lessonProgress").collect()
    for (const item of allProgress) {
      if (item.lessonId === lesson._id) await ctx.db.delete(item._id)
    }
    await ctx.db.delete(lesson._id)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.deleteLesson",
      entityType: "lessons",
      entityId: lesson._id,
      reason: "Pelajaran kurikulum dihapus",
      before: {
        moduleId: lesson.moduleId,
        pathId: lesson.pathId,
        title: lesson.title,
        status: lesson.status,
      },
    })
    return null
  },
})

export const reorderModules = mutation({
  args: {
    pathId: v.string(),
    moduleIds: v.array(v.id("pathModules")),
  },
  handler: async (ctx, args) => {
    const { viewer, path } = await requireCurriculumEditor(ctx, args.pathId)
    const modules = await ctx.db
      .query("pathModules")
      .withIndex("by_path_order", (q) => q.eq("pathId", path.slug))
      .collect()
    const known = new Set(modules.map((pathModule) => pathModule._id))
    const unique = new Set(args.moduleIds)
    if (
      args.moduleIds.length !== modules.length ||
      unique.size !== args.moduleIds.length ||
      args.moduleIds.some((id) => !known.has(id))
    ) {
      throw new ConvexError({
        code: "INVALID_ORDER",
        message: "Daftar urutan modul harus memuat semua modul jalur ini.",
      })
    }
    for (const [index, moduleId] of args.moduleIds.entries()) {
      await ctx.db.patch(moduleId, { order: index + 1 })
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.reorderModules",
      entityType: "paths",
      entityId: path.slug,
      reason: "Urutan modul diperbarui",
      after: { moduleIds: args.moduleIds },
    })
    return null
  },
})

export const reorderLessons = mutation({
  args: {
    moduleId: v.id("pathModules"),
    lessonIds: v.array(v.id("lessons")),
  },
  handler: async (ctx, args) => {
    const { viewer, module } = await moduleForEditor(ctx, args.moduleId)
    const lessons = await ctx.db
      .query("lessons")
      .withIndex("by_module_order", (q) => q.eq("moduleId", module._id))
      .collect()
    const known = new Set(lessons.map((lesson) => lesson._id))
    const unique = new Set(args.lessonIds)
    if (
      args.lessonIds.length !== lessons.length ||
      unique.size !== args.lessonIds.length ||
      args.lessonIds.some((id) => !known.has(id))
    ) {
      throw new ConvexError({
        code: "INVALID_ORDER",
        message: "Daftar urutan pelajaran harus memuat semua pelajaran modul ini.",
      })
    }
    for (const [index, lessonId] of args.lessonIds.entries()) {
      await ctx.db.patch(lessonId, { order: index + 1 })
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "learning.reorderLessons",
      entityType: "pathModules",
      entityId: module._id,
      reason: "Urutan pelajaran diperbarui",
      after: { lessonIds: args.lessonIds },
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
