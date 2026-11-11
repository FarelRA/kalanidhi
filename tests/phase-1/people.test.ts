import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { createTestDb } from "../helpers/convex"
import { NOW, seedAdmin, seedStudent } from "./fixtures"

async function seedTeacherDossier(
  t: ReturnType<typeof createTestDb>,
  userId: Id<"users">,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("teachers", {
      order: 1,
      slug: "bambang-hardjono",
      name: "Bambang Hardjono",
      initials: "BH",
      specialty: "Pengajar batik halus",
      region: "Giriloyo, Yogyakarta",
      experience: "38 tahun membatik",
      quote: "Canting yang stabil.",
      focus: "Batik tulis",
      path: "Batik Tulis Soga",
      community: "Sanggar Soga Giriloyo",
      image: "/images/teacher-hardjono.jpg",
      verified: false,
      userId,
      pathIds: ["batik-tulis-soga"],
      status: "review",
      verificationStatus: "submitted",
      published: false,
    }),
  )
}

describe("people / accounts", () => {
  it("[P1-ACC-01] lists users, teachers, and team with filters", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const teacherId = await seedStudent(t, "auth-teacher", "Bambang Hardjono")
    await t.run(async (ctx) => {
      await ctx.db.patch(teacherId, { roles: ["teacher"] })
    })
    await seedTeacherDossier(t, teacherId)
    await seedStudent(t, "auth-student")

    const identity = t.withIdentity({ subject: "auth-admin" })
    const everyone = await identity.query(api.people.list, {})
    expect(everyone.length).toBeGreaterThanOrEqual(3)

    const teachers = await identity.query(api.people.list, { tab: "teachers" })
    expect(teachers.some((person) => person.id === teacherId)).toBe(true)

    const team = await identity.query(api.people.list, { tab: "team" })
    expect(team.every((person) => person.roles.includes("admin"))).toBe(true)

    const searched = await identity.query(api.people.list, { q: "bambang" })
    expect(searched).toHaveLength(1)
  })

  it("[P1-ACC-02] account detail shows roles, entitlement scope, dossier, sessions, and history without auth tokens", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const teacherId = await seedStudent(t, "auth-teacher", "Bambang Hardjono")
    await seedTeacherDossier(t, teacherId)
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: teacherId,
        authSessionId: "secret-session-id",
        deviceName: "Ponsel",
        userAgent: "vitest",
        ipHash: "hashed",
        createdAt: NOW,
        lastSeenAt: NOW,
        expiresAt: NOW + 86_400_000,
      })
      await ctx.db.insert("authLogs", {
        userId: teacherId,
        authUserId: "auth-teacher",
        kind: "sign_in",
        ipHash: "hashed",
        userAgent: "vitest",
        requestId: "req-1",
        createdAt: NOW,
      })
    })

    const detail = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.people.get, { userId: teacherId })

    expect(detail?.teacher?.verificationStatus).toBe("submitted")
    expect(detail?.sessions).toHaveLength(1)
    expect(detail?.authLogs).toHaveLength(1)

    const serialised = JSON.stringify(detail)
    expect(serialised).not.toContain("secret-session-id")
    expect(serialised).not.toContain('"authSessionId"')
    expect(serialised).not.toContain('"authUserId"')
    expect(serialised).not.toContain("ipHash")
    expect(serialised).not.toContain("userAgent")
  })

  it("[P1-TCH-01] teacher verification publishes the profile and writes an audit row", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const teacherId = await seedStudent(t, "auth-teacher", "Bambang Hardjono")
    const dossierId = await seedTeacherDossier(t, teacherId)

    await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.people.verifyTeacher, {
        teacherId: dossierId,
        decision: "verify",
        reason: "Dossier lengkap dan izin tercatat",
        pathIds: ["batik-tulis-soga"],
      })

    const teacher = await t.run(async (ctx) => ctx.db.get(dossierId))
    expect(teacher?.status).toBe("active")
    expect(teacher?.verified).toBe(true)
    expect(teacher?.published).toBe(true)
    expect(teacher?.verificationStatus).toBe("verified")

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "teachers").eq("entityId", dossierId),
        )
        .collect(),
    )
    expect(audit.map((row) => row.action)).toContain("people.verifyTeacher")
  })

  it("[P1-TCH-02] rejecting or suspending a teacher unpublishes the profile", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const teacherId = await seedStudent(t, "auth-teacher", "Sri Sriningsih")
    const dossierId = await seedTeacherDossier(t, teacherId)
    const identity = t.withIdentity({ subject: "auth-admin" })

    await identity.mutation(api.people.verifyTeacher, {
      teacherId: dossierId,
      decision: "verify",
      reason: "Awalnya lolos",
    })
    await identity.mutation(api.people.verifyTeacher, {
      teacherId: dossierId,
      decision: "suspend",
      reason: "Dokumen izin dicabut",
    })

    let teacher = await t.run(async (ctx) => ctx.db.get(dossierId))
    expect(teacher?.status).toBe("suspended")
    expect(teacher?.published).toBe(false)

    await identity.mutation(api.people.verifyTeacher, {
      teacherId: dossierId,
      decision: "reject",
      reason: "Perlu revisi dossier",
    })
    teacher = await t.run(async (ctx) => ctx.db.get(dossierId))
    expect(teacher?.status).toBe("review")
    expect(teacher?.verificationStatus).toBe("rejected")
  })

  it("[P1-TCH-03] publishing requires an active verified profile", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const teacherId = await seedStudent(t, "auth-teacher", "Bambang Hardjono")
    const dossierId = await seedTeacherDossier(t, teacherId)
    const identity = t.withIdentity({ subject: "auth-admin" })

    await expect(
      identity.mutation(api.people.setTeacherPublication, {
        teacherId: dossierId,
        published: true,
        reason: "Coba tampil",
      }),
    ).rejects.toThrow()

    await identity.mutation(api.people.verifyTeacher, {
      teacherId: dossierId,
      decision: "verify",
      reason: "Lolos verifikasi",
    })
    await identity.mutation(api.people.setTeacherPublication, {
      teacherId: dossierId,
      published: false,
      reason: "Sembunyikan sementara",
    })
    const teacher = await t.run(async (ctx) => ctx.db.get(dossierId))
    expect(teacher?.published).toBe(false)
  })
})

describe("people / account actions", () => {
  it("[P1-ACC-03] role changes stay append-only and audited", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.users.setRoles, {
      userId: target,
      roles: ["student", "teacher"],
      reason: "Dossier pengajar disetujui",
    })

    const assignments = await t.run(async (ctx) =>
      ctx.db
        .query("roleAssignments")
        .withIndex("by_userId", (q) => q.eq("userId", target))
        .collect(),
    )
    expect(assignments.map((row) => `${row.action}:${row.role}`)).toEqual([
      "grant:student",
      "grant:teacher",
    ])
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "users.setRoles"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
  })

  it("[P1-ACC-05] suspend revokes sessions and reactivate restores access", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: target,
        authSessionId: "session-target",
        deviceName: "Browser",
        userAgent: "vitest",
        createdAt: NOW,
        lastSeenAt: NOW,
        expiresAt: NOW + 86_400_000,
      })
    })

    const suspended = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.users.suspend, { userId: target, reason: "Pelanggaran" })
    expect(suspended.revokedSessions).toBe(1)

    await t
      .withIdentity({ subject: "auth-target" })
      .query(api.access.getViewer, {})
      .then((viewer) => expect(viewer?.status).toBe("suspended"))

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.people.reactivate, {
      userId: target,
      reason: "Banding diterima",
    })
    const user = await t.run(async (ctx) => ctx.db.get(target))
    expect(user?.status).toBe("active")

    const actions = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "people.reactivate"))
        .collect(),
    )
    expect(actions).toHaveLength(1)
  })

  it("[P1-ACC-07] session revocation is immediate in the application projection", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")
    await t.run(async (ctx) => {
      await ctx.db.insert("sessions", {
        userId: target,
        authSessionId: "session-one",
        deviceName: "Ponsel",
        userAgent: "vitest",
        createdAt: NOW,
        lastSeenAt: NOW,
        expiresAt: NOW + 86_400_000,
      })
    })

    const result = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.people.revokeSessions, {
        userId: target,
        reason: "Perangkat hilang",
      })
    expect(result.revoked).toBe(1)

    const sessions = await t.run(async (ctx) =>
      ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", target))
        .collect(),
    )
    expect(sessions[0]?.revokedReason).toBe("Perangkat hilang")
  })
})
