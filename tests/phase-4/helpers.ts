import { convexTest } from "convex-test"
import type { GenericId } from "convex/values"

import { api } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import type { Id } from "../../convex/_generated/dataModel"

export const NOW = 1_760_000_000_000

export function createDb() {
  return convexTest(schema)
}

export type Db = ReturnType<typeof createDb>

export async function seedUser(
  t: Db,
  input: {
    authUserId: string
    name?: string
    roles?: ("student" | "teacher" | "admin")[]
    status?: "active" | "suspended" | "invited" | "deleted"
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      authUserId: input.authUserId,
      name: input.name ?? input.authUserId,
      email: `${input.authUserId}@example.test`,
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: (input.name ?? input.authUserId).slice(0, 2).toUpperCase(),
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
        reason: "Phase 4 test setup",
        createdAt: NOW,
      })
    }
    return userId
  })
}

export async function seedTeacherProfile(
  t: Db,
  input: {
    userId: Id<"users">
    pathIds?: string[]
    status?: "review" | "active" | "suspended"
  },
): Promise<Id<"teachers">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("teachers", {
      order: 1,
      slug: `teacher-${input.userId}`,
      name: `Teacher ${input.userId}`,
      initials: "TG",
      specialty: "Batik",
      region: "Yogyakarta",
      experience: "10 years",
      quote: "Practice",
      focus: "Soga",
      path: "Batik",
      community: "Giriloyo",
      verified: true,
      userId: input.userId,
      pathIds: input.pathIds ?? ["batik-tulis-soga"],
      status: input.status ?? "active",
    }),
  )
}

export async function seedCohort(
  t: Db,
  input: {
    teacherId: Id<"users">
    code: string
    pathId?: string
    status?: "draft" | "enrolling" | "active" | "completed" | "cancelled"
  },
): Promise<Id<"cohorts">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("cohorts", {
      code: input.code,
      pathId: input.pathId ?? "batik-tulis-soga",
      teacherId: input.teacherId,
      title: `Kohort ${input.code}`,
      startDate: NOW,
      endDate: NOW + 86_400_000,
      capacity: 12,
      timezone: "Asia/Jakarta",
      status: input.status ?? "active",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export async function enroll(
  t: Db,
  input: {
    studentId: Id<"users">
    cohortId: Id<"cohorts">
    pathId?: string
    status?: "pending_payment" | "active" | "completed" | "withdrawn"
  },
): Promise<Id<"enrollments">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("enrollments", {
      studentId: input.studentId,
      pathId: input.pathId ?? "batik-tulis-soga",
      cohortId: input.cohortId,
      status: input.status ?? "active",
      enrolledAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export type World = Awaited<ReturnType<typeof seedWorld>>

export async function seedWorld(t: Db) {
  const teacherId = await seedUser(t, {
    authUserId: "auth-teacher",
    name: "Bambang Hardjono",
    roles: ["teacher"],
  })
  const otherTeacherId = await seedUser(t, {
    authUserId: "auth-teacher-other",
    name: "Sri Lestari",
    roles: ["teacher"],
  })
  const studentId = await seedUser(t, {
    authUserId: "auth-student",
    name: "Anisa Rahmawati",
    roles: ["student"],
  })
  const outsiderId = await seedUser(t, {
    authUserId: "auth-outsider",
    name: "Joko Purnomo",
    roles: ["student"],
  })
  const adminId = await seedUser(t, {
    authUserId: "auth-admin",
    name: "Nadia Kusuma",
    roles: ["admin"],
  })

  await seedTeacherProfile(t, { userId: teacherId })
  await seedTeacherProfile(t, {
    userId: otherTeacherId,
    pathIds: ["pranatacara"],
  })

  const cohortId = await seedCohort(t, {
    teacherId,
    code: "KOH-BTG-01",
  })
  const otherCohortId = await seedCohort(t, {
    teacherId: otherTeacherId,
    code: "KOH-PRN-01",
    pathId: "pranatacara",
  })
  await enroll(t, { studentId, cohortId })
  await enroll(t, {
    studentId: outsiderId,
    cohortId: otherCohortId,
    pathId: "pranatacara",
  })

  return {
    teacherId,
    otherTeacherId,
    studentId,
    outsiderId,
    adminId,
    cohortId,
    otherCohortId,
  }
}

export function as(t: Db, authUserId: string) {
  return t.withIdentity({ subject: authUserId })
}

export async function errorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise
    return null
  } catch (error) {
    const data = (error as { data?: { code?: string } }).data
    return data?.code ?? (error as Error).message
  }
}

export async function storeBlob(
  t: Db,
  contents: string | Uint8Array,
  type: string,
): Promise<GenericId<"_storage">> {
  return await t.run(async (ctx) => {
    const bytes =
      typeof contents === "string" ? new TextEncoder().encode(contents) : contents
    return await ctx.storage.store(
      new Blob([bytes as unknown as BlobPart], { type }),
    )
  })
}

export async function setSetting(
  t: Db,
  key: string,
  value: unknown,
): Promise<void> {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: NOW })
    } else {
      await ctx.db.insert("settings", {
        key,
        value,
        updatedAt: NOW,
      })
    }
  })
}

export async function readNotificationRows(t: Db) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("notificationOutbox")
      .withIndex("by_recipientId")
      .collect(),
  )
}

export async function auditActions(t: Db): Promise<string[]> {
  return await t.run(async (ctx) => {
    const rows = await ctx.db.query("auditLogs").collect()
    return rows.map((row) => row.action)
  })
}

export async function sendText(
  t: Db,
  authUserId: string,
  conversationId: Id<"conversations">,
  body: string,
): Promise<Id<"messages">> {
  return await as(t, authUserId).mutation(api.messaging.sendMessage, {
    conversationId,
    kind: "text",
    body,
  })
}
