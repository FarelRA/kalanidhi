import type { Id } from "../../convex/_generated/dataModel"
import type { ContentDocument } from "../../lib/content/types"
import {
  catalogFieldsSeed,
  faqsSeed,
  pathsSeed,
  siteSeed,
  teachersSeed,
  testimonialsSeed,
  worksSeed,
} from "../../convex/seedData"
import { seedAccount, type TestDb } from "../helpers/convex"

export const NOW = 1_760_000_000_000
export const FIXTURE_IMAGE = "https://storage.example.test/seed.jpg"

/** Deterministic, schema-valid content document built from the shipped copy. */
export function contentFixture(): ContentDocument {
  return {
    ...structuredClone(siteSeed),
    hero: {
      ...structuredClone(siteSeed.hero),
      plate: {
        ...structuredClone(siteSeed.hero.plate),
        image: FIXTURE_IMAGE,
      },
    },
    metadata: {
      ...structuredClone(siteSeed.metadata),
      image: {
        ...structuredClone(siteSeed.metadata.image),
        url: FIXTURE_IMAGE,
      },
    },
    featured: {
      pathSlugs: pathsSeed.map((path) => path.slug),
      teacherSlugs: teachersSeed.map((teacher) => teacher.slug),
      workSlugs: worksSeed.map((work) => work.slug),
      testimonialIds: [],
      catalogFieldKeys: catalogFieldsSeed.map((field) => field.name),
      faqKeys: [],
      heroWorkSlug: worksSeed.length > 0 ? worksSeed[0].slug : null,
    },
  }
}

function teacherIndexFor(name: string): number {
  const index = teachersSeed.findIndex((teacher) => teacher.name === name)
  return index >= 0 ? index : 0
}

export async function seedContent(t: TestDb): Promise<void> {
  const data = contentFixture()

  const teacherUsers: Id<"users">[] = []
  for (const teacher of teachersSeed) {
    teacherUsers.push(
      await seedStudent(t, `auth-teacher-${teacher.slug}`, teacher.name),
    )
  }
  const makerUsers: Id<"users">[] = []
  for (const work of worksSeed) {
    makerUsers.push(await seedStudent(t, `auth-maker-${work.slug}`, work.maker))
  }

  await t.run(async (ctx) => {
    const imageAssetId = await ctx.db.insert("mediaAssets", {
      kind: "image",
      externalUrl: FIXTURE_IMAGE,
      filename: "seed.jpg",
      mimeType: "image/jpeg",
      size: 10,
      alt: "Gambar uji",
      status: "active",
      uploadedBy: "system",
      createdAt: NOW,
    })

    for (const [index, field] of catalogFieldsSeed.entries()) {
      await ctx.db.insert("catalogFields", { order: index, ...field })
    }

    for (const [index, path] of pathsSeed.entries()) {
      const { imageFile, ...rest } = path
      void imageFile
      const teacher = teacherUsers[teacherIndexFor(rest.teacher)]
      await ctx.db.insert("paths", {
        ...rest,
        order: index,
        status: rest.comingSoon ? "planned" : "open",
        teacherId: teacher,
        createdAt: NOW,
        imageAssetId,
      })
      const moduleId = await ctx.db.insert("pathModules", {
        order: 1,
        pathId: path.slug,
        title: `Modul ${path.title}`,
        summary: "Modul uji",
        estimatedMinutes: 60,
        status: "published",
        createdAt: NOW,
      })
      await ctx.db.insert("lessons", {
        order: 1,
        moduleId,
        pathId: path.slug,
        title: `Pelajaran ${path.title}`,
        kind: "text",
        body: "Materi uji",
        mediaAssetIds: [imageAssetId],
        estimatedMinutes: 30,
        accessLevel: "public",
        status: "published",
        createdAt: NOW,
      })
    }

    for (const [index, teacher] of teachersSeed.entries()) {
      const { imageFile, ...rest } = teacher
      void imageFile
      await ctx.db.insert("teachers", {
        ...rest,
        order: index,
        userId: teacherUsers[index],
        status: "active",
        published: true,
        verificationStatus: "verified",
        verifiedAt: NOW,
        imageAssetId,
      })
    }

    const cohortByPath = new Map<string, Id<"cohorts">>()
    for (const path of pathsSeed) {
      const cohortId = await ctx.db.insert("cohorts", {
        code: `COH-${path.slug}`,
        pathId: path.slug,
        teacherId: teacherUsers[teacherIndexFor(path.teacher)],
        title: `Angkatan ${path.title}`,
        startDate: NOW,
        endDate: NOW + 30 * 86_400_000,
        capacity: 12,
        timezone: "Asia/Jakarta",
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      })
      cohortByPath.set(path.slug, cohortId)
    }

    const workIds: Id<"works">[] = []
    for (const [index, work] of worksSeed.entries()) {
      const { imageFile, ...rest } = work
      void imageFile
      const workId = await ctx.db.insert("works", {
        ...rest,
        order: index,
        status: "published",
        makerId: makerUsers[index],
        pathId: pathsSeed[index % pathsSeed.length].slug,
        imageAssetId,
        createdAt: NOW,
      })
      workIds.push(workId)
    }

    const testimonialIds: string[] = []
    for (const [index, testimonial] of testimonialsSeed.entries()) {
      const id = await ctx.db.insert("testimonials", {
        order: index,
        ...testimonial,
      })
      testimonialIds.push(id)
    }

    const faqIds: string[] = []
    for (const [index, faq] of faqsSeed.entries()) {
      const id = await ctx.db.insert("faqs", { order: index, ...faq })
      faqIds.push(id)
    }

    const certificateIds: Id<"certificates">[] = []
    for (const [index, work] of worksSeed.entries()) {
      const path = pathsSeed[index % pathsSeed.length]
      const teacher = teacherUsers[teacherIndexFor(path.teacher)]
      const maker = makerUsers[index]
      const cohortId = cohortByPath.get(path.slug)
      if (!cohortId) continue

      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: maker,
        pathId: path.slug,
        cohortId,
        status: "completed",
        enrolledAt: NOW,
        completedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const submissionId = await ctx.db.insert("submissions", {
        code: `TUG-UJI-${index + 1}`,
        studentId: maker,
        enrollmentId,
        cohortId,
        pathId: path.slug,
        taskTitle: "Tugas uji",
        status: "approved",
        dueAt: NOW,
        assetIds: [],
        revisionCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const assessmentId = await ctx.db.insert("assessments", {
        submissionId,
        assessorId: teacher,
        status: "completed",
        rubric: [],
        score: 90,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const certificateId = await ctx.db.insert("certificates", {
        serial: `KN-UJI-${index + 1}`,
        publicCode: `PUB-UJI-${index + 1}`,
        studentId: maker,
        pathId: path.slug,
        teacherId: teacher,
        assessmentId,
        status: "issued",
        issuedAt: NOW,
        snapshot: {
          studentName: work.maker,
          pathTitle: path.title,
          teacherName: path.teacher,
          assessmentScore: 90,
          issuedAt: NOW,
        },
        createdAt: NOW,
        updatedAt: NOW,
      })
      certificateIds.push(certificateId)
      await ctx.db.patch(workIds[index], { certificateId })
      await ctx.db.insert("workCards", {
        workId: workIds[index],
        certificateId,
        makerId: maker,
        serial: work.workCard,
        title: work.title,
        technique: work.technique,
        materials: "Bahan uji",
        provenance: work.region,
        permission: "Izin uji",
        accessLevel: "public",
        status: "published",
        createdAt: NOW,
        updatedAt: NOW,
      })
    }

    const featured = {
      ...data.featured,
      testimonialIds,
      faqKeys: faqIds,
    }
    await ctx.db.insert("siteContent", {
      key: "site",
      value: {
        ...data,
        hero: {
          ...data.hero,
          plate: {
            alt: data.hero.plate.alt,
            caption: data.hero.plate.caption,
            note: data.hero.plate.note,
            imageAssetId,
          },
        },
        metadata: {
          ...data.metadata,
          image: {
            width: data.metadata.image.width,
            height: data.metadata.image.height,
            alt: data.metadata.image.alt,
            imageAssetId,
          },
        },
        featured,
      },
      updatedAt: NOW,
    })
  })
}

export async function seedAdmin(
  t: TestDb,
  authUserId = "auth-admin",
  name = "Nadia Kusuma",
): Promise<Id<"users">> {
  return await seedAccount(t, {
    authUserId,
    name,
    email: `${authUserId}@example.test`,
    roles: ["admin"],
  })
}

export async function seedStudent(
  t: TestDb,
  authUserId = "auth-student",
  name = "Anisa Rahmawati",
): Promise<Id<"users">> {
  return await seedAccount(t, {
    authUserId,
    name,
    email: `${authUserId}@example.test`,
    roles: ["student"],
  })
}

export async function seedLead(
  t: TestDb,
  overrides: Partial<{
    intent: "student" | "institution" | "consultation" | "notify"
    name: string
    email: string
    status: "new" | "contacted" | "qualified" | "converted" | "lost" | "closed" | "spam"
  }> = {},
): Promise<Id<"leads">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("leads", {
      intent: overrides.intent ?? "student",
      name: overrides.name ?? "Wahyu Pratama",
      email: overrides.email ?? "wahyu@example.test",
      whatsapp: "+62 800 1234",
      consent: true,
      status: overrides.status ?? "new",
      source: "landing",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export function errorCode(error: unknown): string | null {
  const value = error as { data?: { code?: string }; message?: string }
  if (value?.data?.code) return value.data.code
  const match = value?.message?.match(/code[^a-z]+([A-Z_]+)/i)
  return match?.[1] ?? null
}

export function clone<T>(value: T): T {
  return structuredClone(value)
}
