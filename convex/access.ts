import { ConvexError } from "convex/values"

import type { Capability } from "../lib/access/capabilities"
import { deriveViewer } from "../lib/access/policy"
import type {
  Viewer,
  ViewerCertificate,
  ViewerEnrollment,
  ViewerSellerProfile,
  ViewerTeacherProfile,
} from "../lib/access/viewer"
import type { Doc } from "./_generated/dataModel"
import { query, type QueryCtx } from "./_generated/server"

type DatabaseCtx = Pick<QueryCtx, "db">

function teacherProfileFromDoc(doc: Doc<"teachers">): ViewerTeacherProfile {
  return {
    id: doc._id,
    status: doc.status ?? (doc.verified ? "active" : "review"),
    pathIds: doc.pathIds ?? [],
  }
}

function sellerProfileFromDoc(
  doc: Doc<"sellerProfiles">,
): ViewerSellerProfile {
  return { id: doc._id, status: doc.status }
}

function certificateFromDoc(doc: Doc<"certificates">): ViewerCertificate {
  return {
    id: doc._id,
    pathId: doc.pathId,
    publicCode: doc.publicCode,
    status: doc.status,
    issuedAt: doc.issuedAt,
  }
}

function enrollmentFromDoc(doc: Doc<"enrollments">): ViewerEnrollment {
  return {
    id: doc._id,
    pathId: doc.pathId,
    cohortId: doc.cohortId ?? null,
    status: doc.status,
  }
}

/** Resolves the viewer contract for an application user document. */
export async function viewerForUser(
  ctx: DatabaseCtx,
  user: Doc<"users">,
): Promise<Viewer> {
  const [teacherDocs, sellerDocs, certificateDocs, enrollmentDocs, cohortDocs] =
    await Promise.all([
      ctx.db
        .query("teachers")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("sellerProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("certificates")
        .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
        .collect(),
      ctx.db
        .query("enrollments")
        .withIndex("by_studentId", (q) => q.eq("studentId", user._id))
        .collect(),
      ctx.db
        .query("cohorts")
        .withIndex("by_teacherId", (q) => q.eq("teacherId", user._id))
        .collect(),
    ])

  const teacherDoc =
    teacherDocs.find((doc) => doc.status === "active") ??
    teacherDocs.find((doc) => doc.status !== "suspended") ??
    teacherDocs[0]

  const sellerDoc =
    sellerDocs.find((doc) => doc.status === "active") ??
    sellerDocs.find((doc) => doc.status === "pending") ??
    sellerDocs[0]

  const cohortPathIds = cohortDocs
    .filter((doc) =>
      ["enrolling", "active", "completed"].includes(doc.status),
    )
    .map((doc) => doc.pathId)

  return deriveViewer({
    userId: user._id,
    authUserId: user.authUserId,
    name: user.name,
    email: user.email,
    initials: user.initials,
    region: user.region,
    image: user.image,
    roles: user.roles,
    status: user.status,
    teacherProfile: teacherDoc ? teacherProfileFromDoc(teacherDoc) : null,
    sellerProfile: sellerDoc ? sellerProfileFromDoc(sellerDoc) : null,
    certificates: certificateDocs.map(certificateFromDoc),
    enrollments: enrollmentDocs.map(enrollmentFromDoc),
    cohortPathIds,
  })
}

/** Current viewer, or null when there is no application account yet. */
export const getViewer = query({
  args: {},
  handler: async (ctx): Promise<Viewer | null> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", identity.subject))
      .unique()

    if (!user) return null
    return await viewerForUser(ctx, user)
  },
})

export type AccessErrorCode =
  | "UNAUTHENTICATED"
  | "SUSPENDED"
  | "FORBIDDEN"
  | "OUT_OF_SCOPE"
  | "SELF_DEALING"

function accessError(code: AccessErrorCode, message: string): never {
  throw new ConvexError({ code, message })
}

export function requireCapability(
  viewer: Viewer | null,
  capability: Capability,
): Viewer {
  if (!viewer) accessError("UNAUTHENTICATED", "Masuk diperlukan.")
  if (viewer.status !== "active")
    accessError("SUSPENDED", "Akun ini sedang ditangguhkan.")
  if (!viewer.capabilities.includes(capability)) {
    accessError(
      "FORBIDDEN",
      `Kemampuan ${capability} tidak dimiliki akun ini.`,
    )
  }
  return viewer
}

export type ScopeKind = "sell" | "teach" | "assess"

/** Enforces a path scope derived by the server, never by the client. */
export function assertScope(
  viewer: Viewer | null,
  kind: ScopeKind,
  pathId: string,
): Viewer {
  const activeViewer = requireCapability(
    viewer,
    kind === "sell" ? "sell" : kind === "teach" ? "teach" : "assess",
  )

  if (kind === "sell" && !activeViewer.entitlements.sellActive) {
    accessError("FORBIDDEN", "Profil penjual belum aktif.")
  }

  const scopes =
    kind === "sell"
      ? activeViewer.sellScopes
      : kind === "teach"
        ? activeViewer.teachScopes
        : activeViewer.assessScopes

  if (!scopes.includes(pathId)) {
    accessError(
      "OUT_OF_SCOPE",
      `Jalur ${pathId} berada di luar cakupan ${kind}.`,
    )
  }

  return activeViewer
}

/** Prevents grading own work, buying from self, or approving own money. */
export function assertNoSelfDealing(
  viewer: Viewer | null,
  action: string,
  counterpartyUserId: string,
): Viewer {
  if (!viewer) accessError("UNAUTHENTICATED", "Masuk diperlukan.")
  if (viewer.status !== "active")
    accessError("SUSPENDED", "Akun ini sedang ditangguhkan.")
  if (viewer.userId === counterpartyUserId) {
    accessError(
      "SELF_DEALING",
      `Tindakan ${action} tidak boleh dilakukan terhadap diri sendiri.`,
    )
  }
  return viewer
}
