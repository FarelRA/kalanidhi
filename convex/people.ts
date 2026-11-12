import { ConvexError, v } from "convex/values"

import type {
  PersonAuthLogView,
  PersonDetail,
  PersonRecordView,
  PersonRoleAssignmentView,
  PersonSessionView,
  PersonSummary,
} from "../lib/admin/types"
import type { WorkspaceRole } from "../lib/access/capabilities"
import { viewerForUser } from "./access"
import { now, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server"

const tabValidator = v.union(
  v.literal("users"),
  v.literal("teachers"),
  v.literal("team"),
)

const accountStatus = v.union(
  v.literal("active"),
  v.literal("suspended"),
  v.literal("invited"),
  v.literal("deleted"),
)

function roleLabel(roles: WorkspaceRole[]): string {
  if (roles.includes("admin")) return "Pengelola"
  const parts: string[] = []
  if (roles.includes("teacher")) parts.push("Pengajar")
  if (roles.includes("student")) parts.push("Peserta")
  return parts.length > 0 ? parts.join(" · ") : "Tanpa peran"
}

type PersonContext = {
  users: Doc<"users">[]
  teachers: Doc<"teachers">[]
  sellerProfiles: Doc<"sellerProfiles">[]
  sessions: Doc<"sessions">[]
  certificates: Doc<"certificates">[]
}

async function loadContext(ctx: QueryCtx | MutationCtx): Promise<PersonContext> {
  const [users, teachers, sellerProfiles, sessions, certificates] =
    await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("teachers").collect(),
      ctx.db.query("sellerProfiles").collect(),
      ctx.db.query("sessions").collect(),
      ctx.db.query("certificates").collect(),
    ])
  return { users, teachers, sellerProfiles, sessions, certificates }
}

function teacherFor(
  context: PersonContext,
  userId: string,
): Doc<"teachers"> | null {
  return (
    context.teachers.find((teacher) => teacher.userId === userId) ?? null
  )
}

function toSummary(
  context: PersonContext,
  user: Doc<"users">,
): PersonSummary {
  const teacher = teacherFor(context, user._id)
  const seller = context.sellerProfiles.find((item) => item.userId === user._id)
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    initials: user.initials,
    region: user.region,
    roles: user.roles,
    roleLabel: roleLabel(user.roles),
    status: user.status,
    teacherStatus: teacher
      ? (teacher.status ?? (teacher.verified ? "active" : "review"))
      : null,
    teacherPublished: teacher?.published ?? teacher?.verified ?? false,
    teacherVerified: teacher?.verified ?? false,
    specialty: teacher?.specialty ?? null,
    sellerStatus: seller?.status ?? null,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt ?? null,
    certificates: context.certificates.filter(
      (certificate) =>
        certificate.studentId === user._id && certificate.status === "issued",
    ).length,
    sessions: context.sessions.filter(
      (session) => session.userId === user._id && !session.revokedAt,
    ).length,
  }
}

function matchesQuery(summary: PersonSummary, q?: string): boolean {
  if (!q?.trim()) return true
  const needle = q.trim().toLowerCase()
  return `${summary.name} ${summary.email} ${summary.region} ${summary.roleLabel} ${summary.specialty ?? ""} ${summary.status}`
    .toLowerCase()
    .includes(needle)
}

export const list = query({
  args: {
    tab: v.optional(tabValidator),
    q: v.optional(v.string()),
    role: v.optional(v.union(v.literal("student"), v.literal("teacher"), v.literal("admin"))),
    status: v.optional(accountStatus),
    region: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PersonSummary[]> => {
    await requireAdmin(ctx, "people.read")
    const context = await loadContext(ctx)
    const tab = args.tab ?? "users"

    return context.users
      .filter((user) => {
        if (tab === "team") return user.roles.includes("admin")
        if (tab === "teachers") {
          return (
            user.roles.includes("teacher") ||
            Boolean(teacherFor(context, user._id))
          )
        }
        return true
      })
      .filter((user) => !args.role || user.roles.includes(args.role))
      .filter((user) => !args.status || user.status === args.status)
      .filter(
        (user) =>
          !args.region ||
          user.region.toLowerCase().includes(args.region.toLowerCase()),
      )
      .map((user) => toSummary(context, user))
      .filter((summary) => matchesQuery(summary, args.q))
      .sort((a, b) => a.name.localeCompare(b.name))
  },
})

function recordView(
  id: string,
  title: string,
  status: string,
): PersonRecordView {
  return { id, title, status }
}

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<PersonDetail | null> => {
    await requireAdmin(ctx, "people.read")
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    const viewer = await viewerForUser(ctx, user)
    const [
      teacherDocs,
      sellerProfiles,
      enrollments,
      certificates,
      works,
      sessions,
      authLogs,
      assignments,
      paths,
      buyerOrders,
      sellerOrders,
    ] = await Promise.all([
      ctx.db
        .query("teachers")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("sellerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", args.userId))
        .collect(),
      ctx.db
        .query("certificates")
        .withIndex("by_studentId", (q) => q.eq("studentId", args.userId))
        .collect(),
      ctx.db
        .query("works")
        .withIndex("by_makerId", (q) => q.eq("makerId", args.userId))
        .collect(),
      ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("authLogs")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db.query("paths").collect(),
      ctx.db
        .query("orders")
        .withIndex("by_buyerUserId", (q) => q.eq("buyerUserId", args.userId))
        .collect(),
      ctx.db
        .query("orders")
        .withIndex("by_sellerId", (q) => q.eq("sellerId", args.userId))
        .collect(),
    ])

    const pathTitle = new Map(
      paths.map((path) => [path.slug, path.title] as const),
    )
    const teacher = teacherDocs[0] ?? null
    const seller = sellerProfiles[0] ?? null

    const sessionViews: PersonSessionView[] = sessions
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt)
      .map((session) => ({
        id: session._id,
        deviceName: session.deviceName,
        createdAt: session.createdAt,
        lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt ?? null,
        revokedReason: session.revokedReason ?? null,
      }))

    const authLogViews: PersonAuthLogView[] = authLogs
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 40)
      .map((log) => ({
        id: log._id,
        kind: log.kind,
        requestId: log.requestId ?? null,
        createdAt: log.createdAt,
      }))

    const assignmentViews: PersonRoleAssignmentView[] = assignments
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((assignment) => ({
        id: assignment._id,
        role: assignment.role,
        action: assignment.action,
        actorId: assignment.actorId,
        reason: assignment.reason,
        createdAt: assignment.createdAt,
      }))

    const orders = new Map(
      [...buyerOrders, ...sellerOrders].map((order) => [order._id, order]),
    )

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        initials: user.initials,
        region: user.region,
        status: user.status,
        roles: user.roles,
        roleLabel: viewer.roleLabel,
        capabilities: viewer.capabilities,
        entitlements: viewer.entitlements,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt ?? null,
        suspendedReason: user.suspendedReason ?? null,
        suspendedAt: user.suspendedAt ?? null,
      },
      teacher: teacher
        ? {
            id: teacher._id,
            slug: teacher.slug,
            name: teacher.name,
            specialty: teacher.specialty,
            region: teacher.region,
            experience: teacher.experience,
            community: teacher.community,
            focus: teacher.focus,
            quote: teacher.quote,
            pathIds: teacher.pathIds ?? [],
            status:
              teacher.status ?? (teacher.verified ? "active" : "review"),
            published: teacher.published ?? teacher.verified,
            verified: teacher.verified,
            verificationStatus: teacher.verificationStatus ?? null,
            verifiedAt: teacher.verifiedAt ?? null,
          }
        : null,
      seller: seller
        ? {
            id: seller._id,
            displayName: seller.displayName,
            status: seller.status,
            onboardingChecklist: seller.onboardingChecklist,
          }
        : null,
      enrollments: enrollments.map((enrollment) =>
        recordView(
          enrollment._id,
          pathTitle.get(enrollment.pathId) ?? enrollment.pathId,
          enrollment.status,
        ),
      ),
      certificates: certificates.map((certificate) =>
        recordView(
          certificate._id,
          pathTitle.get(certificate.pathId) ?? certificate.pathId,
          certificate.status,
        ),
      ),
      works: works.map((work) =>
        recordView(work._id, work.title, work.status ?? "published"),
      ),
      orders: Array.from(orders.values()).map((order) =>
        recordView(order.code, order.buyerName, order.status),
      ),
      sessions: sessionViews,
      authLogs: authLogViews,
      roleAssignments: assignmentViews,
    }
  },
})

export const reactivate = mutation({
  args: { userId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Akun tidak ada." })
    }
    if (user.status === "active") return null

    const timestamp = now()
    await ctx.db.patch(user._id, {
      status: "active",
      suspendedReason: undefined,
      suspendedAt: undefined,
      updatedAt: timestamp,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "people.reactivate",
      entityType: "users",
      entityId: user._id,
      reason,
      before: { status: user.status },
      after: { status: "active" },
    })
    return null
  },
})

export const revokeSessions = mutation({
  args: { userId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    const timestamp = now()
    let revoked = 0
    for (const session of sessions) {
      if (session.revokedAt) continue
      await ctx.db.patch(session._id, {
        revokedAt: timestamp,
        revokedBy: viewer.userId,
        revokedReason: reason,
      })
      revoked += 1
    }
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "people.revokeSessions",
      entityType: "users",
      entityId: args.userId,
      reason,
      after: { revoked },
    })
    return { revoked }
  },
})

const decisionValidator = v.union(
  v.literal("verify"),
  v.literal("reject"),
  v.literal("suspend"),
)

export const verifyTeacher = mutation({
  args: {
    teacherId: v.id("teachers"),
    decision: decisionValidator,
    reason: v.string(),
    pathIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const teacher = await ctx.db.get(args.teacherId)
    if (!teacher) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Profil pengajar tidak ada." })
    }

    const timestamp = now()
    if (args.decision === "verify") {
      await ctx.db.patch(teacher._id, {
        status: "active",
        verified: true,
        verificationStatus: "verified",
        verifiedBy: viewer.userId,
        verifiedAt: timestamp,
        published: true,
        publishedAt: teacher.publishedAt ?? timestamp,
        pathIds: args.pathIds ?? teacher.pathIds,
        applicationNote: reason,
      })
      if (teacher.userId) {
        const account = await ctx.db.get(teacher.userId)
        if (account && !account.roles.includes("teacher")) {
          await ctx.db.patch(account._id, {
            roles: [...account.roles, "teacher"],
            updatedAt: timestamp,
          })
          await ctx.db.insert("roleAssignments", {
            userId: account._id,
            role: "teacher",
            action: "grant",
            actorId: viewer.userId,
            reason: "Peran pengajar mengikuti verifikasi dossier.",
            createdAt: timestamp,
          })
        }
      }
    } else if (args.decision === "reject") {
      await ctx.db.patch(teacher._id, {
        status: "review",
        verified: false,
        verificationStatus: "rejected",
        published: false,
        applicationNote: reason,
      })
    } else {
      await ctx.db.patch(teacher._id, {
        status: "suspended",
        verified: false,
        verificationStatus: "suspended",
        published: false,
        applicationNote: reason,
      })
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action:
        args.decision === "verify"
          ? "people.verifyTeacher"
          : args.decision === "reject"
            ? "people.rejectTeacher"
            : "people.suspendTeacher",
      entityType: "teachers",
      entityId: teacher._id,
      reason,
      before: {
        status: teacher.status ?? null,
        verified: teacher.verified,
        published: teacher.published ?? null,
      },
      after: {
        status:
          args.decision === "verify"
            ? "active"
            : args.decision === "reject"
              ? "review"
              : "suspended",
        verified: args.decision === "verify",
      },
    })

    return { teacherId: teacher._id, decision: args.decision }
  },
})

export const setTeacherPublication = mutation({
  args: {
    teacherId: v.id("teachers"),
    published: v.boolean(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const teacher = await ctx.db.get(args.teacherId)
    if (!teacher) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Profil pengajar tidak ada." })
    }
    if (args.published && (!teacher.verified || teacher.status !== "active")) {
      throw new ConvexError({
        code: "TEACHER_NOT_VERIFIED",
        message: "Profil hanya bisa tampil setelah terverifikasi dan aktif.",
      })
    }

    const timestamp = now()
    await ctx.db.patch(teacher._id, {
      published: args.published,
      publishedAt: args.published ? (teacher.publishedAt ?? timestamp) : teacher.publishedAt,
    })
    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: args.published
        ? "people.publishTeacher"
        : "people.unpublishTeacher",
      entityType: "teachers",
      entityId: teacher._id,
      reason,
      before: { published: teacher.published ?? teacher.verified },
      after: { published: args.published },
    })
    return null
  },
})

function slugifyTeacher(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
  return initials || "KN"
}

/**
 * Links a real account to a teacher dossier. Verification stays a separate
 * decision; this only creates the dossier an operator can review.
 */
export const createTeacherProfile = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    specialty: v.string(),
    region: v.string(),
    experience: v.string(),
    quote: v.string(),
    focus: v.string(),
    community: v.string(),
    pathIds: v.array(v.string()),
    image: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Akun tidak ditemukan." })
    }
    if (user.roles.includes("admin")) {
      throw new ConvexError({
        code: "ADMIN_ROLE_EXCLUDED",
        message: "Pengelola tidak dapat memiliki profil pengajar atau penjual.",
      })
    }
    const existing = await ctx.db
      .query("teachers")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    if (existing.length > 0) {
      throw new ConvexError({
        code: "TEACHER_EXISTS",
        message: "Akun ini sudah memiliki profil pengajar.",
      })
    }

    const paths = await ctx.db.query("paths").collect()
    const knownPaths = new Set(paths.map((path) => path.slug))
    const pathIds = Array.from(new Set(args.pathIds.map((id) => id.trim())))
    if (pathIds.length === 0 || pathIds.some((id) => !knownPaths.has(id))) {
      throw new ConvexError({
        code: "INVALID_PATH",
        message: "Pilih setidaknya satu jalur yang valid.",
      })
    }

    const name = (args.name?.trim() || user.name).slice(0, 120)
    const baseSlug = slugifyTeacher(name)
    let slug = baseSlug
    let suffix = 2
    while (
      await ctx.db
        .query("teachers")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${suffix}`
      suffix += 1
    }

    const teachers = await ctx.db.query("teachers").collect()
    const teacherId = await ctx.db.insert("teachers", {
      order: Math.max(0, ...teachers.map((teacher) => teacher.order)) + 1,
      slug,
      name,
      initials: initialsOf(name),
      specialty: args.specialty.trim(),
      region: args.region.trim(),
      experience: args.experience.trim(),
      quote: args.quote.trim(),
      focus: args.focus.trim(),
      path: paths.find((path) => path.slug === pathIds[0])?.title ?? pathIds[0],
      community: args.community.trim(),
      image: args.image?.trim() || "/images/teacher-sudarsono.jpg",
      verified: false,
      userId: user._id,
      pathIds,
      status: "review",
      verificationStatus: "submitted",
      published: false,
    })

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "people.createTeacherProfile",
      entityType: "teachers",
      entityId: teacherId,
      reason,
      after: { userId: user._id, pathIds },
    })

    return teacherId
  },
})

/**
 * Activates the earned, path-scoped seller entitlement. The checklist is a
 * gate: an incomplete dossier cannot be activated, and the resulting seller
 * scope still comes from an active teacher dossier or an issued certificate.
 */
export const activateSeller = mutation({
  args: {
    userId: v.id("users"),
    displayName: v.optional(v.string()),
    checklist: v.object({
      payoutAccount: v.boolean(),
      consent: v.boolean(),
      firstWorkCard: v.boolean(),
      taxDetails: v.boolean(),
    }),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "people.manage")
    const reason = requireReason(args.reason)
    const user = await ctx.db.get(args.userId)
    if (!user) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Akun tidak ditemukan." })
    }
    if (user.status !== "active") {
      throw new ConvexError({
        code: "ACCOUNT_INACTIVE",
        message: "Akun harus aktif sebelum profil penjual diaktifkan.",
      })
    }
    if (user.roles.includes("admin")) {
      throw new ConvexError({
        code: "ADMIN_ROLE_EXCLUDED",
        message: "Pengelola tidak dapat memiliki profil penjual.",
      })
    }
    const checklist = args.checklist
    if (
      !checklist.payoutAccount ||
      !checklist.consent ||
      !checklist.firstWorkCard ||
      !checklist.taxDetails
    ) {
      throw new ConvexError({
        code: "CHECKLIST_INCOMPLETE",
        message:
          "Rekening pencairan, persetujuan, Kartu Karya pertama, dan data pajak wajib lengkap.",
      })
    }

    const entitlements = await viewerForUser(ctx, user)
    if (entitlements.sellScopes.length === 0) {
      throw new ConvexError({
        code: "SELLER_SCOPE_EMPTY",
        message:
          "Aktifkan dossier pengajar atau terbitkan sertifikat sebelum mengaktifkan penjual.",
      })
    }

    const existing = await ctx.db
      .query("sellerProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect()
    const timestamp = now()
    const displayName = (args.displayName?.trim() || user.name).slice(0, 120)

    let sellerProfileId
    if (existing[0]) {
      sellerProfileId = existing[0]._id
      await ctx.db.patch(sellerProfileId, {
        displayName,
        status: "active",
        onboardingChecklist: checklist,
        activatedAt: existing[0].activatedAt ?? timestamp,
        suspendedReason: undefined,
        updatedAt: timestamp,
      })
    } else {
      sellerProfileId = await ctx.db.insert("sellerProfiles", {
        userId: args.userId,
        displayName,
        status: "active",
        onboardingChecklist: checklist,
        activatedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
    }

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "people.activateSeller",
      entityType: "sellerProfiles",
      entityId: sellerProfileId,
      reason,
      before: existing[0]
        ? { status: existing[0].status, displayName: existing[0].displayName }
        : undefined,
      after: { status: "active", displayName, checklist },
    })

    return { sellerProfileId, status: "active" as const }
  },
})
