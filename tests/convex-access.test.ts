import { convexTest } from "convex-test"
import { describe, expect, it } from "vitest"

import schema from "../convex/schema"
import {
  assertNoSelfDealing,
  assertScope,
  requireCapability,
} from "../convex/access"
import { api, internal } from "../convex/_generated/api"
import type { Id } from "../convex/_generated/dataModel"

const NOW = 1_760_000_000_000

function testDb() {
  return convexTest(schema)
}

type TestDb = ReturnType<typeof testDb>

async function seedUser(
  t: TestDb,
  input: {
    authUserId: string
    email?: string
    roles?: ("student" | "teacher" | "admin")[]
    status?: "active" | "suspended" | "invited" | "deleted"
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      authUserId: input.authUserId,
      name: input.authUserId,
      email: input.email ?? `${input.authUserId}@example.test`,
      emailVerified: true,
      initials: "TU",
      region: "Yogyakarta",
      roles: input.roles ?? ["student"],
      status: input.status ?? "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    for (const role of input.roles ?? ["student"]) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role,
        action: "grant",
        actorId: "system",
        reason: "Test setup",
        createdAt: NOW,
      })
    }
    return userId
  })
}

async function seedTeacher(t: TestDb, userId: Id<"users">) {
  return await t.run(async (ctx) => {
    const teacherId = await ctx.db.insert("teachers", {
      order: 1,
      slug: `teacher-${userId}`,
      name: "Teacher",
      initials: "T",
      specialty: "Batik",
      region: "Yogyakarta",
      experience: "10 years",
      quote: "Practice",
      focus: "Soga",
      path: "Batik",
      community: "Giriloyo",
      image: "/images/teacher.jpg",
      verified: true,
      userId,
      pathIds: ["batik-tulis-soga"],
      status: "active",
    })
    const cohortId = await ctx.db.insert("cohorts", {
      code: `KOH-${userId}`,
      pathId: "batik-tulis-soga",
      teacherId: userId,
      title: "Kohort",
      startDate: NOW,
      endDate: NOW + 86_400_000,
      capacity: 12,
      timezone: "Asia/Jakarta",
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    return { teacherId, cohortId }
  })
}

async function seedCertificate(
  t: TestDb,
  input: {
    studentId: Id<"users">
    teacherId: Id<"users">
    pathId?: string
    status?: "issued" | "revoked" | "replaced"
  },
) {
  return await t.run(async (ctx) => {
    const moduleId = await ctx.db.insert("pathModules", {
      order: 1,
      pathId: input.pathId ?? "batik-tulis-soga",
      title: "Module",
      summary: "Summary",
      estimatedMinutes: 60,
      status: "published",
      createdAt: NOW,
    })
    const lessonId = await ctx.db.insert("lessons", {
      order: 1,
      moduleId,
      pathId: input.pathId ?? "batik-tulis-soga",
      title: "Lesson",
      kind: "text",
      body: "Body",
      mediaAssetIds: [],
      estimatedMinutes: 30,
      accessLevel: "enrolled",
      status: "published",
      createdAt: NOW,
    })
    const cohortId = await ctx.db.insert("cohorts", {
      code: "KOH-CERT",
      pathId: input.pathId ?? "batik-tulis-soga",
      teacherId: input.teacherId,
      title: "Cohort",
      startDate: NOW,
      endDate: NOW + 86_400_000,
      capacity: 12,
      timezone: "Asia/Jakarta",
      status: "completed",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const enrollmentId = await ctx.db.insert("enrollments", {
      studentId: input.studentId,
      pathId: input.pathId ?? "batik-tulis-soga",
      cohortId,
      status: "completed",
      enrolledAt: NOW,
      completedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const submissionId = await ctx.db.insert("submissions", {
      code: "TUG-CERT",
      studentId: input.studentId,
      enrollmentId,
      cohortId,
      pathId: input.pathId ?? "batik-tulis-soga",
      taskTitle: "Kain",
      status: "approved",
      submittedAt: NOW,
      dueAt: NOW,
      assetIds: [],
      revisionCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const assessmentId = await ctx.db.insert("assessments", {
      submissionId,
      assessorId: input.teacherId,
      status: "completed",
      rubric: [{ criterion: "Teknik", weight: 1, score: 90 }],
      score: 90,
      createdAt: NOW,
      updatedAt: NOW,
    })
    const certificateId = await ctx.db.insert("certificates", {
      serial: `KN-${input.studentId}`,
      publicCode: `PUB-${input.studentId}`,
      studentId: input.studentId,
      pathId: input.pathId ?? "batik-tulis-soga",
      teacherId: input.teacherId,
      assessmentId,
      status: input.status ?? "issued",
      issuedAt: NOW,
      snapshot: {
        studentName: "Student",
        pathTitle: "Batik Tulis Soga",
        teacherName: "Teacher",
        assessmentScore: 90,
        issuedAt: NOW,
      },
      createdAt: NOW,
      updatedAt: NOW,
    })
    await ctx.db.insert("certificateEvents", {
      certificateId,
      kind: "issue",
      actorId: input.teacherId,
      createdAt: NOW,
    })
    void lessonId
    return certificateId
  })
}

async function activateSeller(t: TestDb, userId: Id<"users">) {
  return await t.run(async (ctx) =>
    ctx.db.insert("sellerProfiles", {
      userId,
      displayName: "Seller",
      status: "active",
      onboardingChecklist: {
        payoutAccount: true,
        consent: true,
        firstWorkCard: true,
        taxDetails: false,
      },
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

describe("viewer resolution", () => {
  it("returns null without an identity and for an account without an app user", async () => {
    const t = testDb()
    expect(await t.query(api.access.getViewer, {})).toBeNull()

    const anonymous = t.withIdentity({ subject: "auth-missing" })
    expect(await anonymous.query(api.access.getViewer, {})).toBeNull()
  })

  it("resolves a student from an identity and an active enrollment", async () => {
    const t = testDb()
    const studentId = await seedUser(t, { authUserId: "auth-student" })
    await t.run(async (ctx) => {
      await ctx.db.insert("enrollments", {
        studentId,
        pathId: "pranatacara",
        status: "active",
        enrolledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
    })

    const viewer = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.access.getViewer, {})

    expect(viewer?.roles).toEqual(["student"])
    expect(viewer?.entitlements.learn).toBe(true)
    expect(viewer?.capabilities).toContain("learn")
    expect(viewer?.capabilities).not.toContain("teach")
  })

  it("resolves a teacher with path-scoped teaching and assessment", async () => {
    const t = testDb()
    const teacherUserId = await seedUser(t, {
      authUserId: "auth-teacher",
      roles: ["teacher"],
    })
    await seedTeacher(t, teacherUserId)

    const viewer = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.access.getViewer, {})

    expect(viewer?.teachScopes).toEqual(["batik-tulis-soga"])
    expect(viewer?.assessScopes).toEqual(["batik-tulis-soga"])
    expect(viewer?.capabilities).toContain("teach")
    expect(viewer?.capabilities).toContain("submissions.grade")
  })

  it("resolves a multi-role teacher-student with both entitlements", async () => {
    const t = testDb()
    const userId = await seedUser(t, {
      authUserId: "auth-both",
      roles: ["teacher", "student"],
    })
    await seedTeacher(t, userId)
    await t.run(async (ctx) => {
      await ctx.db.insert("enrollments", {
        studentId: userId,
        pathId: "pranatacara",
        status: "active",
        enrolledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
    })

    const viewer = await t
      .withIdentity({ subject: "auth-both" })
      .query(api.access.getViewer, {})

    expect(viewer?.entitlements.learn).toBe(true)
    expect(viewer?.entitlements.teach).toBe(true)
    expect(viewer?.roleLabel).toBe("Pengajar · Peserta")
  })
})

describe("seller scope", () => {
  it("derives a certificate scope and removes it on revocation", async () => {
    const t = testDb()
    const teacherId = await seedUser(t, {
      authUserId: "auth-teacher-seller",
      roles: ["teacher"],
    })
    const studentId = await seedUser(t, { authUserId: "auth-seller" })
    const certificateId = await seedCertificate(t, {
      studentId,
      teacherId,
      status: "issued",
    })
    await activateSeller(t, studentId)

    const seller = await t
      .withIdentity({ subject: "auth-seller" })
      .query(api.access.getViewer, {})
    expect(seller?.sellScopes).toEqual(["batik-tulis-soga"])
    expect(seller?.capabilities).toContain("sell")

    await t.run(async (ctx) => {
      await ctx.db.patch(certificateId, {
        status: "revoked",
        revokedAt: NOW,
        revokeReason: "Test",
        updatedAt: NOW,
      })
      const certificate = await ctx.db.get(certificateId)
      if (certificate) {
        await ctx.db.insert("certificateEvents", {
          certificateId,
          kind: "revoke",
          actorId: teacherId,
          reason: "Test",
          createdAt: NOW,
        })
      }
    })

    const revoked = await t
      .withIdentity({ subject: "auth-seller" })
      .query(api.access.getViewer, {})
    expect(revoked?.sellScopes).toEqual([])
    expect(revoked?.capabilities).not.toContain("sell")
  })

  it("derives seller scope from an active teacher profile path", async () => {
    const t = testDb()
    const teacherId = await seedUser(t, {
      authUserId: "auth-teacher-profile",
      roles: ["teacher"],
    })
    await seedTeacher(t, teacherId)
    await activateSeller(t, teacherId)

    const viewer = await t
      .withIdentity({ subject: "auth-teacher-profile" })
      .query(api.access.getViewer, {})
    expect(viewer?.sellScopes).toEqual(["batik-tulis-soga"])
    expect(viewer?.capabilities).toContain("sell")
  })
})

describe("capability and scope guards", () => {
  it("allows a student to learn but not to grade", async () => {
    const t = testDb()
    await seedUser(t, { authUserId: "auth-guard-student" })
    const viewer = await t
      .withIdentity({ subject: "auth-guard-student" })
      .query(api.access.getViewer, {})

    expect(requireCapability(viewer, "learn").userId).toBe(viewer?.userId)
    expect(() => requireCapability(viewer, "submissions.grade")).toThrow()
  })

  it("blocks a suspended account from every capability", async () => {
    const t = testDb()
    await seedUser(t, {
      authUserId: "auth-suspended",
      status: "suspended",
    })
    const viewer = await t
      .withIdentity({ subject: "auth-suspended" })
      .query(api.access.getViewer, {})

    expect(viewer?.status).toBe("suspended")
    expect(() => requireCapability(viewer, "learn")).toThrow()
    expect(() => requireCapability(viewer, "buy")).toThrow()
  })

  it("rejects an out-of-scope path for teaching and selling", async () => {
    const t = testDb()
    const teacherId = await seedUser(t, {
      authUserId: "auth-scope",
      roles: ["teacher"],
    })
    await seedTeacher(t, teacherId)
    await activateSeller(t, teacherId)
    const viewer = await t
      .withIdentity({ subject: "auth-scope" })
      .query(api.access.getViewer, {})

    expect(assertScope(viewer, "teach", "batik-tulis-soga").userId).toBe(
      viewer?.userId,
    )
    expect(() => assertScope(viewer, "teach", "pranatacara")).toThrow()
    expect(() => assertScope(viewer, "sell", "pranatacara")).toThrow()
  })

  it("blocks self-dealing for grading and financial approval", async () => {
    const t = testDb()
    const teacherId = await seedUser(t, {
      authUserId: "auth-self",
      roles: ["teacher"],
    })
    await seedTeacher(t, teacherId)
    const viewer = await t
      .withIdentity({ subject: "auth-self" })
      .query(api.access.getViewer, {})

    expect(() =>
      assertNoSelfDealing(viewer, "grade", teacherId),
    ).toThrow()
    expect(() =>
      assertNoSelfDealing(viewer, "approve_refund", teacherId),
    ).toThrow()
    expect(
      assertNoSelfDealing(viewer, "grade", "u-someone-else").userId,
    ).toBe(viewer?.userId)
  })
})

describe("users mutations", () => {
  it("bootstraps the first admin once and records the grant", async () => {
    const t = testDb()
    const userId = await t.mutation(internal.users.bootstrapAdmin, {
      authUserId: "auth-first-admin",
      email: "admin@example.test",
      name: "Nadia Kusuma",
    })

    const user = await t.run(async (ctx) => ctx.db.get(userId))
    expect(user?.roles).toEqual(["admin"])
    expect(user?.status).toBe("active")

    const assignments = await t.run(async (ctx) =>
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    )
    expect(assignments).toHaveLength(1)
    expect(assignments[0]?.action).toBe("grant")

    await expect(
      t.mutation(internal.users.bootstrapAdmin, {
        authUserId: "auth-second-admin",
        email: "second@example.test",
        name: "Second",
      }),
    ).rejects.toThrow()
  })

  it("appends role grants and revocations and audits the change", async () => {
    const t = testDb()
    const adminId = await seedUser(t, {
      authUserId: "auth-admin",
      roles: ["admin"],
    })
    const targetId = await seedUser(t, { authUserId: "auth-target" })

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.users.setRoles,
      {
        userId: targetId,
        roles: ["student", "teacher"],
        reason: "Verified teacher dossier",
      },
    )

    const assignments = await t.run(async (ctx) =>
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", targetId))
        .collect(),
    )
    expect(assignments.map((item) => `${item.action}:${item.role}`)).toEqual([
      "grant:student",
      "grant:teacher",
    ])

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.users.setRoles,
      {
        userId: targetId,
        roles: ["student"],
        reason: "Teacher profile suspended",
      },
    )

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", targetId))
        .collect(),
    )
    expect(after).toHaveLength(3)
    expect(after.at(-1)?.action).toBe("revoke")
    expect(after.at(-1)?.role).toBe("teacher")

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "users").eq("entityId", targetId),
        )
        .collect(),
    )
    expect(audit.length).toBeGreaterThanOrEqual(2)
    expect(audit.every((entry) => entry.action === "users.setRoles")).toBe(true)
    expect(adminId).toBeTruthy()
  })

  it("prevents removing the last admin", async () => {
    const t = testDb()
    const adminId = await seedUser(t, {
      authUserId: "auth-last-admin",
      roles: ["admin"],
    })
    await expect(
      t.withIdentity({ subject: "auth-last-admin" }).mutation(
        api.users.setRoles,
        {
          userId: adminId,
          roles: ["student"],
          reason: "Test",
        },
      ),
    ).rejects.toThrow()
  })

  it("suspends an account, revokes its sessions, and audits the action", async () => {
    const t = testDb()
    await seedUser(t, {
      authUserId: "auth-suspend-admin",
      roles: ["admin"],
    })
    const targetId = await seedUser(t, { authUserId: "auth-suspend-target" })
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: targetId,
        authSessionId: "session-1",
        deviceName: "Browser",
        userAgent: "vitest",
        createdAt: NOW,
        lastSeenAt: NOW,
        expiresAt: NOW + 86_400_000,
      })
    })

    const result = await t
      .withIdentity({ subject: "auth-suspend-admin" })
      .mutation(api.users.suspend, {
        userId: targetId,
        reason: "Policy violation",
      })
    expect(result.revokedSessions).toBe(1)

    const target = await t.run(async (ctx) => ctx.db.get(targetId))
    expect(target?.status).toBe("suspended")
    const sessions = await t.run(async (ctx) =>
      ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", targetId))
        .collect(),
    )
    expect(sessions[0]?.revokedAt).toBeTruthy()
    expect(sessions[0]?.revokedReason).toBe("Policy violation")

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "users.suspend"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
  })

  it("refuses self-suspension", async () => {
    const t = testDb()
    const adminId = await seedUser(t, {
      authUserId: "auth-self-suspend",
      roles: ["admin"],
    })
    await expect(
      t.withIdentity({ subject: "auth-self-suspend" }).mutation(
        api.users.suspend,
        { userId: adminId, reason: "Test" },
      ),
    ).rejects.toThrow()
  })

  it("creates an invitation and accepts it as the signed-in account", async () => {
    const t = testDb()
    await seedUser(t, {
      authUserId: "auth-invite-admin",
      roles: ["admin"],
    })
    const teacherTarget = await seedUser(t, {
      authUserId: "auth-invited-teacher",
      email: "teacher@example.test",
    })

    const invitation = await t
      .withIdentity({ subject: "auth-invite-admin" })
      .mutation(api.users.invite, {
        email: "teacher@example.test",
        roles: ["teacher"],
        reason: "Verified practitioner",
      })
    expect(invitation.token).toBeTruthy()

    const viewer = await t
      .withIdentity({ subject: "auth-invited-teacher" })
      .mutation(api.users.acceptInvite, { token: invitation.token })
    expect(viewer.roles).toContain("teacher")

    const assignments = await t.run(async (ctx) =>
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) =>
          q.eq("userId", teacherTarget),
        )
        .collect(),
    )
    expect(assignments.some((item) => item.role === "teacher")).toBe(true)
  })

  it("keeps admin accounts out of grading, submission, and selling", async () => {
    const t = testDb()
    await seedUser(t, {
      authUserId: "auth-separation",
      roles: ["admin", "teacher", "student"],
    })
    const viewer = await t
      .withIdentity({ subject: "auth-separation" })
      .query(api.access.getViewer, {})

    expect(() => requireCapability(viewer, "submissions.grade")).toThrow()
    expect(() => requireCapability(viewer, "submissions.submit")).toThrow()
    expect(() => requireCapability(viewer, "sell")).toThrow()
  })
})
