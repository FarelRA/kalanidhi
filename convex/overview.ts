import type { Viewer } from "../lib/access/viewer"
import type {
  OverviewCohort,
  OverviewEarnings,
  OverviewEnrollment,
  OverviewOrder,
  OverviewSession,
  OverviewWork,
  SellerOverview,
  StudentOverview,
  TeacherOverview,
  ViewerOverview,
  ViewerOverviewRole,
} from "../lib/workspace/overview-types"
import type { Doc, Id } from "./_generated/dataModel"
import { query, type QueryCtx } from "./_generated/server"
import { nowMs, requireWorkspaceViewer } from "./domainAccess"

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1_000
const MAX_SESSIONS = 3
const DUE_PAYOUT_STATUSES = new Set(["pending", "held", "approved"])

type DbCtx = Pick<QueryCtx, "db">

function jakartaMonthStart(timestamp: number): number {
  const shifted = new Date(timestamp + JAKARTA_OFFSET_MS)
  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) -
    JAKARTA_OFFSET_MS
  )
}

function userIdOf(viewer: Viewer): Id<"users"> {
  return viewer.userId as Id<"users">
}

/** Title lookup for the small path catalogue, cached per request. */
async function pathTitles(
  ctx: DbCtx,
  pathIds: string[],
): Promise<Map<string, string>> {
  const unique = Array.from(new Set(pathIds.filter(Boolean)))
  const titles = new Map<string, string>()
  await Promise.all(
    unique.map(async (pathId) => {
      const path = await ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", pathId))
        .unique()
      titles.set(pathId, path?.title ?? pathId)
    }),
  )
  return titles
}

async function cohortSummaries(
  ctx: DbCtx,
  cohortIds: Id<"cohorts">[],
): Promise<Map<string, { code: string; title: string; pathId: string }>> {
  const unique = Array.from(new Set(cohortIds))
  const map = new Map<
    string,
    { code: string; title: string; pathId: string }
  >()
  await Promise.all(
    unique.map(async (cohortId) => {
      const cohort = await ctx.db.get(cohortId)
      if (cohort) {
        map.set(cohortId, {
          code: cohort.code,
          title: cohort.title,
          pathId: cohort.pathId,
        })
      }
    }),
  )
  return map
}

async function unreadMessages(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<number> {
  const memberships = await ctx.db
    .query("conversationMembers")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(100)

  let total = 0
  for (const membership of memberships) {
    if (membership.leftAt) continue
    const since = membership.lastReadAt ?? membership.joinedAt
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation_createdAt", (q) =>
        q.eq("conversationId", membership.conversationId).gt("createdAt", since),
      )
      .order("desc")
      .take(100)
    total += rows.filter(
      (row) =>
        row.senderId !== userId &&
        row.kind !== "system" &&
        row.deletedAt === undefined,
    ).length
  }
  return total
}

async function openTickets(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<number> {
  const tickets = await ctx.db
    .query("supportTickets")
    .withIndex("by_requesterId", (q) => q.eq("requesterId", userId))
    .take(100)
  return tickets.filter((ticket) =>
    ["open", "pending"].includes(ticket.status),
  ).length
}

async function upcomingSessions(
  ctx: DbCtx,
  cohortIds: Set<string> | null,
  now: number,
): Promise<OverviewSession[]> {
  const rows = await ctx.db
    .query("cohortSessions")
    .withIndex("by_startsAt", (q) => q.gte("startsAt", now))
    .take(80)

  const selected = rows
    .filter(
      (session) =>
        session.status === "scheduled" &&
        (cohortIds === null || cohortIds.has(session.cohortId)),
    )
    .sort((a, b) => a.startsAt - b.startsAt)
    .slice(0, MAX_SESSIONS)

  const cohorts = await cohortSummaries(
    ctx,
    selected.map((session) => session.cohortId),
  )
  const titles = await pathTitles(
    ctx,
    Array.from(cohorts.values()).map((cohort) => cohort.pathId),
  )

  return selected.map((session) => {
    const cohort = cohorts.get(session.cohortId)
    return {
      id: session._id,
      cohortId: session.cohortId,
      title: session.title,
      kind: session.kind,
      cohortCode: cohort?.code ?? "Tanpa kohort",
      cohortTitle: cohort?.title ?? "Kohort belum diisi",
      pathTitle: cohort ? (titles.get(cohort.pathId) ?? cohort.pathId) : "",
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      status: session.status,
    }
  })
}

type PathLessons = {
  lessons: Doc<"lessons">[]
}

async function publishedLessons(
  ctx: DbCtx,
  pathId: string,
): Promise<PathLessons> {
  const modules = await ctx.db
    .query("pathModules")
    .withIndex("by_path_order", (q) => q.eq("pathId", pathId))
    .take(50)
  const publishedModules = modules.filter(
    (pathModule) => pathModule.status === "published",
  )
  const byModule = await Promise.all(
    publishedModules.map((pathModule) =>
      ctx.db
        .query("lessons")
        .withIndex("by_module_order", (q) => q.eq("moduleId", pathModule._id))
        .take(100),
    ),
  )
  return {
    lessons: byModule
      .flat()
      .filter((lesson) => lesson.status === "published"),
  }
}

async function studentEnrollments(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<Doc<"enrollments">[]> {
  const rows = await ctx.db
    .query("enrollments")
    .withIndex("by_studentId", (q) => q.eq("studentId", userId))
    .take(50)
  return rows
    .filter(
      (enrollment) =>
        enrollment.status === "active" || enrollment.status === "completed",
    )
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "active" ? -1 : 1
      return b.enrolledAt - a.enrolledAt
    })
}

async function enrollmentOverview(
  ctx: DbCtx,
  enrollment: Doc<"enrollments">,
  lessonCache: Map<string, PathLessons>,
): Promise<OverviewEnrollment> {
  let pathLessons = lessonCache.get(enrollment.pathId)
  if (!pathLessons) {
    pathLessons = await publishedLessons(ctx, enrollment.pathId)
    lessonCache.set(enrollment.pathId, pathLessons)
  }

  const progressRows = await ctx.db
    .query("lessonProgress")
    .withIndex("by_enrollment", (q) => q.eq("enrollmentId", enrollment._id))
    .take(500)
  const completedIds = new Set(
    progressRows
      .filter((row) => row.state === "completed")
      .map((row) => row.lessonId),
  )
  const totalLessons = pathLessons.lessons.length
  const completedLessons = pathLessons.lessons.filter((lesson) =>
    completedIds.has(lesson._id),
  ).length
  const certificate = enrollment.certificateId
    ? await ctx.db.get(enrollment.certificateId)
    : null
  const nextLessonTitle =
    certificate?.status === "revoked"
      ? "Sertifikat dicabut"
      : (pathLessons.lessons.find((lesson) => !completedIds.has(lesson._id))
          ?.title ?? null)

  const [cohort, pathTitle] = await Promise.all([
    enrollment.cohortId ? ctx.db.get(enrollment.cohortId) : null,
    pathTitles(ctx, [enrollment.pathId]),
  ])

  return {
    id: enrollment._id,
    pathId: enrollment.pathId,
    pathTitle: pathTitle.get(enrollment.pathId) ?? enrollment.pathId,
    cohortCode: cohort?.code ?? null,
    cohortTitle: cohort?.title ?? null,
    status: enrollment.status as "active" | "completed",
    progress:
      totalLessons > 0
        ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
        : 0,
    completedLessons,
    totalLessons,
    nextLesson: nextLessonTitle,
    enrolledAt: enrollment.enrolledAt,
    completedAt: enrollment.completedAt ?? null,
    deadlineAt: enrollment.deadlineAt ?? null,
  }
}

async function orderTitle(
  ctx: DbCtx,
  order: Doc<"orders">,
): Promise<string> {
  const item = await ctx.db
    .query("orderItems")
    .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
    .take(1)
  if (item[0]) return item[0].title
  if (order.workId) {
    const work = await ctx.db.get(order.workId)
    if (work) return work.title
  }
  if (order.pathId) {
    const titles = await pathTitles(ctx, [order.pathId])
    return titles.get(order.pathId) ?? "Pesanan kelas"
  }
  return "Pesanan"
}

async function studentSection(
  ctx: DbCtx,
  viewer: Viewer,
): Promise<StudentOverview> {
  const userId = userIdOf(viewer)
  const lessonCache = new Map<string, PathLessons>()
  const enrollmentRows = await studentEnrollments(ctx, userId)
  const enrollments = await Promise.all(
    enrollmentRows.map((enrollment) =>
      enrollmentOverview(ctx, enrollment, lessonCache),
    ),
  )

  const submissions = await ctx.db
    .query("submissions")
    .withIndex("by_studentId", (q) => q.eq("studentId", userId))
    .take(300)
  const pendingSubmissions = submissions.filter((submission) =>
    ["draft", "revision_requested"].includes(submission.status),
  ).length
  const awaitingAssessment = submissions.filter((submission) =>
    ["submitted", "under_review"].includes(submission.status),
  ).length

  const certificates = await ctx.db
    .query("certificates")
    .withIndex("by_studentId", (q) => q.eq("studentId", userId))
    .take(50)
  // Revoked certificates still belong to the learner's credential history.
  // Replaced rows are superseded by the replacement certificate.
  const activeCertificates = certificates
    .filter((certificate) => certificate.status !== "replaced")
    .sort((a, b) => b.issuedAt - a.issuedAt)
  const certificateTitles = await pathTitles(
    ctx,
    activeCertificates.map((certificate) => certificate.pathId),
  )
  const latestCertificate = activeCertificates[0]
    ? {
        id: activeCertificates[0]._id,
        publicCode: activeCertificates[0].publicCode,
        pathTitle:
          certificateTitles.get(activeCertificates[0].pathId) ??
          activeCertificates[0].pathId,
        issuedAt: activeCertificates[0].issuedAt,
        status: activeCertificates[0].status,
        statusLabel:
          activeCertificates[0].status === "revoked"
            ? "Sertifikat dicabut"
            : "Sertifikat terbit",
      }
    : null

  const orderRows = await ctx.db
    .query("orders")
    .withIndex("by_buyerUserId", (q) => q.eq("buyerUserId", userId))
    .take(30)
  const recentOrderRows = orderRows
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3)
  const recentOrders: OverviewOrder[] = await Promise.all(
    recentOrderRows.map(async (order) => ({
      id: order._id,
      code: order.code,
      title: await orderTitle(ctx, order),
      amount: order.baseAmount,
      status: order.status,
      createdAt: order.createdAt,
    })),
  )

  return {
    enrollments,
    pendingSubmissions,
    awaitingAssessment,
    issuedCertificates: activeCertificates.length,
    latestCertificate,
    recentOrders,
  }
}

async function earningsFor(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<OverviewEarnings> {
  const payouts = await ctx.db
    .query("payouts")
    .withIndex("by_teacherId", (q) => q.eq("teacherId", userId))
    .take(300)
  let paid = 0
  let due = 0
  for (const payout of payouts) {
    if (payout.status === "paid") {
      paid += payout.paidAmount ?? payout.teacherShare
    } else if (DUE_PAYOUT_STATUSES.has(payout.status)) {
      due += payout.teacherShare
    }
  }
  return { paid, due }
}

async function worksFor(
  ctx: DbCtx,
  userId: Id<"users">,
): Promise<{ works: OverviewWork[]; workOrders: number }> {
  const rows = await ctx.db
    .query("works")
    .withIndex("by_makerId", (q) => q.eq("makerId", userId))
    .take(30)

  const works: OverviewWork[] = []
  let workOrders = 0
  for (const work of rows) {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_workId", (q) => q.eq("workId", work._id))
      .take(200)
    const counted = orders.filter(
      (order) => order.status !== "draft" && order.status !== "cancelled",
    ).length
    workOrders += counted
    works.push({
      id: work._id,
      title: work.title,
      status: work.status ?? "draft",
      price: work.price,
      orderCount: counted,
    })
  }

  return {
    works: works.sort((a, b) => b.orderCount - a.orderCount),
    workOrders,
  }
}

async function teacherSection(
  ctx: DbCtx,
  viewer: Viewer,
  now: number,
): Promise<TeacherOverview> {
  const userId = userIdOf(viewer)
  const cohortRows = await ctx.db
    .query("cohorts")
    .withIndex("by_teacherId", (q) => q.eq("teacherId", userId))
    .take(30)
  const titles = await pathTitles(
    ctx,
    cohortRows.map((cohort) => cohort.pathId),
  )

  const cohorts: OverviewCohort[] = []
  let awaitingAssessment = 0
  for (const cohort of cohortRows) {
    const enrollments = await ctx.db
      .query("enrollments")
      .withIndex("by_cohortId", (q) => q.eq("cohortId", cohort._id))
      .take(200)
    const studentCount = enrollments.filter((enrollment) =>
      ["active", "completed"].includes(enrollment.status),
    ).length

    const submitted = await ctx.db
      .query("submissions")
      .withIndex("by_cohort_status", (q) =>
        q.eq("cohortId", cohort._id).eq("status", "submitted"),
      )
      .take(200)
    const underReview = await ctx.db
      .query("submissions")
      .withIndex("by_cohort_status", (q) =>
        q.eq("cohortId", cohort._id).eq("status", "under_review"),
      )
      .take(200)
    const revisionRequested = await ctx.db
      .query("submissions")
      .withIndex("by_cohort_status", (q) =>
        q.eq("cohortId", cohort._id).eq("status", "revision_requested"),
      )
      .take(200)
    awaitingAssessment +=
      submitted.length + underReview.length + revisionRequested.length

    const nextSession = await ctx.db
      .query("cohortSessions")
      .withIndex("by_cohort_startsAt", (q) =>
        q.eq("cohortId", cohort._id).gte("startsAt", now),
      )
      .take(1)

    cohorts.push({
      id: cohort._id,
      code: cohort.code,
      title: cohort.title,
      pathTitle: titles.get(cohort.pathId) ?? cohort.pathId,
      status: cohort.status,
      studentCount,
      nextSessionAt: nextSession[0]?.startsAt ?? null,
    })
  }

  const monthStart = jakartaMonthStart(now)
  const assessments = await ctx.db
    .query("assessments")
    .withIndex("by_assessorId", (q) => q.eq("assessorId", userId))
    .take(300)
  const completedAssessmentsThisMonth = assessments.filter(
    (assessment) =>
      ["completed", "resolved"].includes(assessment.status) &&
      assessment.assessedAt !== undefined &&
      assessment.assessedAt >= monthStart,
  ).length

  const [earnings, authored] = await Promise.all([
    earningsFor(ctx, userId),
    worksFor(ctx, userId),
  ])

  return {
    cohorts: cohorts.sort((a, b) => {
      if (a.nextSessionAt === null) return 1
      if (b.nextSessionAt === null) return -1
      return a.nextSessionAt - b.nextSessionAt
    }),
    awaitingAssessment,
    completedAssessmentsThisMonth,
    earnings,
    works: authored.works,
  }
}

async function sellerSection(
  ctx: DbCtx,
  viewer: Viewer,
): Promise<SellerOverview> {
  const userId = userIdOf(viewer)
  const [authored, earnings] = await Promise.all([
    worksFor(ctx, userId),
    earningsFor(ctx, userId),
  ])
  return {
    works: authored.works,
    workOrders: authored.workOrders,
    earnings,
  }
}

function roleFor(
  viewer: Viewer,
  hasEnrollments: boolean,
): ViewerOverviewRole {
  if (viewer.entitlements.operate) return "operator"
  if (viewer.entitlements.teach) return "teacher"
  // A seller who also studies keeps the student overview; the seller section
  // stays available on the same payload.
  if (viewer.sellerProfile && !hasEnrollments) return "seller"
  return "student"
}

/**
 * Role-aware summary for the authenticated workspace viewer. Every count comes
 * from the viewer's own rows or from cohorts they teach or attend; nothing is
 * taken from a client argument.
 */
export const viewerOverview = query({
  args: {},
  handler: async (ctx): Promise<ViewerOverview> => {
    const viewer = await requireWorkspaceViewer(ctx)
    const now = nowMs()
    const userId = userIdOf(viewer)
    const enrollmentRows = await studentEnrollments(ctx, userId)
    const role = roleFor(viewer, enrollmentRows.length > 0)
    const enrolledCohortIds = new Set(
      enrollmentRows
        .map((enrollment) => enrollment.cohortId)
        .filter((cohortId): cohortId is Id<"cohorts"> => Boolean(cohortId)),
    )

    let sessionScope: Set<string> | null = enrolledCohortIds
    if (role === "operator") {
      sessionScope = null
    } else if (role === "teacher" || viewer.entitlements.teach) {
      const taught = await ctx.db
        .query("cohorts")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", userId))
        .take(30)
      sessionScope = new Set([
        ...Array.from(enrolledCohortIds),
        ...taught.map((cohort) => cohort._id),
      ])
    }

    const [unread, tickets, sessions] = await Promise.all([
      unreadMessages(ctx, userId),
      openTickets(ctx, userId),
      upcomingSessions(ctx, sessionScope, now),
    ])

    return {
      role,
      roleLabel: viewer.roleLabel,
      viewerName: viewer.name,
      generatedAt: now,
      region: viewer.region,
      unreadMessages: unread,
      openTickets: tickets,
      upcomingSessions: sessions,
      student:
        role === "student" ? await studentSection(ctx, viewer) : null,
      teacher:
        role === "teacher" ? await teacherSection(ctx, viewer, now) : null,
      seller: viewer.sellerProfile
        ? await sellerSection(ctx, viewer)
        : null,
    }
  },
})
