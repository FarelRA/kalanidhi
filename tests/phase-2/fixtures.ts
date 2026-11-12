import { convexTest } from "convex-test"

import { api } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import type { Id } from "../../convex/_generated/dataModel"

export const NOW = 1_760_000_000_000
export const DAY = 86_400_000

export type TestDb = ReturnType<typeof createPhase2Db>

export function createPhase2Db() {
  return convexTest(schema)
}

type SeedInput = {
  role?: "student" | "teacher" | "admin"
  email?: string
}

export async function seedUser(
  t: TestDb,
  authUserId: string,
  input: SeedInput = {},
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const roles = [input.role ?? "student"]
    const userId = await ctx.db.insert("users", {
      authUserId,
      name: authUserId.replaceAll("-", " "),
      email: input.email ?? `${authUserId}@example.test`,
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: authUserId.slice(0, 2).toUpperCase(),
      region: "Yogyakarta",
      roles,
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    for (const role of roles) {
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

export type Phase2Handles = Awaited<ReturnType<typeof seedPhase2>>

export async function seedPhase2(t: TestDb) {
  return await t.run(async (ctx) => {
    const adminId = await ctx.db.insert("users", {
      authUserId: "auth-admin",
      name: "Nadia Kusuma",
      email: "admin@example.test",
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "NK",
      region: "Yogyakarta",
      roles: ["admin"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const teacherId = await ctx.db.insert("users", {
      authUserId: "auth-teacher",
      name: "Bambang Hardjono",
      email: "bambang@example.test",
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "BH",
      region: "Giriloyo",
      roles: ["teacher"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const teacherOtherId = await ctx.db.insert("users", {
      authUserId: "auth-teacher-other",
      name: "Widagdo Saputra",
      email: "widagdo@example.test",
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "WS",
      region: "Surakarta",
      roles: ["teacher"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const studentId = await ctx.db.insert("users", {
      authUserId: "auth-student",
      name: "Anisa Rahmawati",
      email: "anisa@example.test",
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "AR",
      region: "Yogyakarta",
      roles: ["student"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const studentOtherId = await ctx.db.insert("users", {
      authUserId: "auth-student-other",
      name: "Dimas Yoga Pratama",
      email: "dimas@example.test",
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "DY",
      region: "Surakarta",
      roles: ["student"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })

    await ctx.db.insert("roleAssignments", {
      userId: adminId,
      role: "admin",
      action: "grant",
      actorId: "system",
      reason: "Test setup",
      createdAt: NOW,
    })
    for (const userId of [teacherId, teacherOtherId]) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role: "teacher",
        action: "grant",
        actorId: "system",
        reason: "Test setup",
        createdAt: NOW,
      })
    }
    for (const userId of [studentId, studentOtherId]) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role: "student",
        action: "grant",
        actorId: "system",
        reason: "Test setup",
        createdAt: NOW,
      })
    }

    await ctx.db.insert("teachers", {
      order: 1,
      slug: "bambang-hardjono",
      name: "Bambang Hardjono",
      initials: "BH",
      specialty: "Batik tulis",
      region: "Giriloyo",
      experience: "38 tahun",
      quote: "Canting stabil.",
      focus: "Batik tulis soga",
      path: "Batik Tulis Soga",
      community: "Sanggar Soga Giriloyo",
      verified: true,
      userId: teacherId,
      pathIds: ["batik-tulis-soga"],
      status: "active",
    })
    await ctx.db.insert("teachers", {
      order: 2,
      slug: "widagdo-saputra",
      name: "Widagdo Saputra",
      initials: "WS",
      specialty: "Pranatacara",
      region: "Surakarta",
      experience: "30 tahun",
      quote: "Napas acara.",
      focus: "Pembawa acara",
      path: "Pranatacara",
      community: "Sanggar Wicara",
      verified: true,
      userId: teacherOtherId,
      pathIds: ["pranatacara-jawa"],
      status: "active",
    })

    await ctx.db.insert("paths", {
      order: 1,
      slug: "batik-tulis-soga",
      code: "Jalur 01",
      title: "Batik Tulis Soga",
      subtitle: "Dari canting pertama",
      teacher: "Bambang Hardjono",
      teacherRole: "Pengajar batik",
      region: "Giriloyo",
      level: "Pemula",
      modules: 2,
      weeks: 2,
      tasks: 1,
      price: 1_450_000,
      tags: [],
      outcome: "Kain",
      includes: [],
      status: "open",
      createdAt: NOW,
    })
    await ctx.db.insert("paths", {
      order: 2,
      slug: "pranatacara-jawa",
      code: "Jalur 02",
      title: "Seni Pembawa Acara Tradisi Jawa",
      subtitle: "Tata wicara",
      teacher: "Widagdo Saputra",
      teacherRole: "Pembina",
      region: "Surakarta",
      level: "Terbuka",
      modules: 1,
      weeks: 2,
      tasks: 1,
      price: 980_000,
      tags: [],
      outcome: "Rekaman",
      includes: [],
      status: "open",
      createdAt: NOW,
    })

    const moduleId = await ctx.db.insert("pathModules", {
      order: 1,
      pathId: "batik-tulis-soga",
      title: "Alat dan bahan",
      summary: "Canting dan malam",
      estimatedMinutes: 60,
      status: "published",
      createdAt: NOW,
    })
    const moduleTwoId = await ctx.db.insert("pathModules", {
      order: 2,
      pathId: "batik-tulis-soga",
      title: "Pewarnaan",
      summary: "Soga",
      estimatedMinutes: 90,
      status: "published",
      createdAt: NOW,
    })
    const lessonOneId = await ctx.db.insert("lessons", {
      order: 1,
      moduleId,
      pathId: "batik-tulis-soga",
      title: "Mengenal canting",
      kind: "text",
      body: "Bahan",
      mediaAssetIds: [],
      estimatedMinutes: 30,
      accessLevel: "enrolled",
      status: "published",
      createdAt: NOW,
    })
    const lessonTwoId = await ctx.db.insert("lessons", {
      order: 1,
      moduleId: moduleTwoId,
      pathId: "batik-tulis-soga",
      title: "Pewarnaan soga",
      kind: "practice",
      body: "Praktik",
      mediaAssetIds: [],
      estimatedMinutes: 60,
      accessLevel: "enrolled",
      status: "published",
      createdAt: NOW,
    })
    const pranataModuleId = await ctx.db.insert("pathModules", {
      order: 1,
      pathId: "pranatacara-jawa",
      title: "Tata wicara",
      summary: "Dasar",
      estimatedMinutes: 60,
      status: "published",
      createdAt: NOW,
    })
    const pranataLessonId = await ctx.db.insert("lessons", {
      order: 1,
      moduleId: pranataModuleId,
      pathId: "pranatacara-jawa",
      title: "Napas kalimat",
      kind: "text",
      body: "Latihan",
      mediaAssetIds: [],
      estimatedMinutes: 30,
      accessLevel: "enrolled",
      status: "published",
      createdAt: NOW,
    })

    const cohortId = await ctx.db.insert("cohorts", {
      code: "BTG-06",
      pathId: "batik-tulis-soga",
      teacherId,
      title: "Batik Tulis Soga · BTG-06",
      startDate: NOW - 30 * DAY,
      endDate: NOW + 30 * DAY,
      capacity: 5,
      timezone: "Asia/Jakarta",
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    const cohortOtherId = await ctx.db.insert("cohorts", {
      code: "PRC-03",
      pathId: "pranatacara-jawa",
      teacherId: teacherOtherId,
      title: "Pranatacara · PRC-03",
      startDate: NOW - 20 * DAY,
      endDate: NOW + 20 * DAY,
      capacity: 5,
      timezone: "Asia/Jakarta",
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    })

    const enrollmentId = await ctx.db.insert("enrollments", {
      studentId,
      pathId: "batik-tulis-soga",
      cohortId,
      status: "active",
      enrolledAt: NOW - 30 * DAY,
      lastActivityAt: NOW,
      createdAt: NOW - 30 * DAY,
      updatedAt: NOW,
    })
    const enrollmentOtherId = await ctx.db.insert("enrollments", {
      studentId: studentOtherId,
      pathId: "pranatacara-jawa",
      cohortId: cohortOtherId,
      status: "active",
      enrolledAt: NOW - 20 * DAY,
      lastActivityAt: NOW,
      createdAt: NOW - 20 * DAY,
      updatedAt: NOW,
    })

    const sessionId = await ctx.db.insert("cohortSessions", {
      cohortId,
      title: "Pewarnaan soga",
      kind: "session",
      startsAt: NOW + DAY,
      endsAt: NOW + DAY + 90 * 60_000,
      timezone: "Asia/Jakarta",
      status: "scheduled",
      createdAt: NOW,
    })
    const sessionOtherId = await ctx.db.insert("cohortSessions", {
      cohortId: cohortOtherId,
      title: "Praktik tata wicara",
      kind: "session",
      startsAt: NOW + 2 * DAY,
      endsAt: NOW + 2 * DAY + 120 * 60_000,
      timezone: "Asia/Jakarta",
      status: "scheduled",
      createdAt: NOW,
    })

    await ctx.db.insert("sellerProfiles", {
      userId: studentId,
      displayName: "Anisa Rahmawati",
      status: "active",
      onboardingChecklist: {
        payoutAccount: true,
        consent: true,
        firstWorkCard: false,
        taxDetails: false,
      },
      createdAt: NOW,
      updatedAt: NOW,
    })

    await ctx.db.insert("settings", {
      key: "learning",
      value: {
        submissionAssetLimit: 2,
        maxAssetBytes: 1024,
      },
      updatedAt: NOW,
    })

    return {
      adminId,
      teacherId,
      teacherOtherId,
      studentId,
      studentOtherId,
      pathId: "batik-tulis-soga",
      pathOtherId: "pranatacara-jawa",
      moduleId,
      moduleTwoId,
      lessonOneId,
      lessonTwoId,
      pranataModuleId,
      pranataLessonId,
      cohortId,
      cohortOtherId,
      enrollmentId,
      enrollmentOtherId,
      sessionId,
      sessionOtherId,
    }
  })
}

export async function submitAndGrade(
  t: TestDb,
  handles: Phase2Handles,
  input: {
    studentAuth: string
    studentId: Id<"users">
    enrollmentId: Id<"enrollments">
    teacherAuth: string
    decision?: "approve" | "reject" | "revision"
    score?: number
    taskTitle?: string
  },
) {
  const created = await t
    .withIdentity({ subject: input.studentAuth })
    .mutation(api.assessments.createDraft, {
      enrollmentId: input.enrollmentId,
      taskTitle: input.taskTitle ?? "Tugas akhir",
      evidenceText: "Catatan proses dan bukti foto.",
    })
  await t
    .withIdentity({ subject: input.studentAuth })
    .mutation(api.assessments.submit, { submissionId: created.submissionId })

  const score = input.score ?? 88
  const rubric = [
    { criterion: "Ketepatan proses", weight: 40, score },
    { criterion: "Kualitas garis canting", weight: 30, score },
    { criterion: "Catatan proses", weight: 30, score },
  ]
  const result = await t
    .withIdentity({ subject: input.teacherAuth })
    .mutation(api.assessments.grade, {
      submissionId: created.submissionId,
      decision: input.decision ?? "approve",
      rubric,
      feedback: "Proses tercatat rapi.",
    })
  void handles
  return { submissionId: created.submissionId, result }
}

export async function seedWorkForCertificate(
  t: TestDb,
  input: {
    certificateId: Id<"certificates">
    makerId: Id<"users">
    slug?: string
  },
) {
  return await t.run(async (ctx) => {
    const workId = await ctx.db.insert("works", {
      order: 1,
      slug: input.slug ?? "kain-soga",
      title: "Kain Soga",
      category: "batik",
      kind: "product",
      maker: "Anisa Rahmawati",
      makerRole: "Lulusan",
      teacher: "Bambang Hardjono",
      region: "Yogyakarta",
      price: 1_450_000,
      unit: "Kain",
      technique: "Tulis",
      techniqueNote: "Canting",
      workCard: "KN-8821",
      description: "Kain",
      makerId: input.makerId,
      pathId: "batik-tulis-soga",
      certificateId: input.certificateId,
      status: "published",
      createdAt: NOW,
    })
    const workCardId = await ctx.db.insert("workCards", {
      workId,
      certificateId: input.certificateId,
      makerId: input.makerId,
      serial: "KN-8821",
      title: "Kain Soga",
      technique: "Tulis",
      materials: "Primis",
      provenance: "Giriloyo",
      permission: "Tercatat",
      accessLevel: "public",
      status: "published",
      createdAt: NOW,
      updatedAt: NOW,
    })
    return { workId, workCardId }
  })
}
