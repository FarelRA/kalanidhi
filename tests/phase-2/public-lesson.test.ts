import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { NOW, createPhase2Db, seedPhase2 } from "./fixtures"

const LONG_BODY =
  "Batik tulis memakai lilin panas sebagai perintang warna. Bagian kain yang dilapisi lilin tetap putih, sedangkan warna muncul di bagian lain. " +
  "Latihan pertama memakai sapu tangan katun supaya biaya kesalahan tetap rendah."

async function seedImage(
  t: ReturnType<typeof createPhase2Db>,
  alt: string,
): Promise<Id<"mediaAssets">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("mediaAssets", {
      kind: "image",
      externalUrl: `https://example.test/${alt.replace(/\s+/g, "-")}.jpg`,
      filename: "lesson.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      alt,
      status: "active",
      uploadedBy: "auth-admin",
      createdAt: NOW,
    }),
  )
}

async function issueCertificate(
  t: ReturnType<typeof createPhase2Db>,
  handles: Awaited<ReturnType<typeof seedPhase2>>,
) {
  return await t.run(async (ctx) => {
    const submissionId = await ctx.db.insert("submissions", {
      code: "TUG-PUBLIC",
      studentId: handles.studentId,
      enrollmentId: handles.enrollmentId,
      cohortId: handles.cohortId,
      pathId: handles.pathId,
      taskTitle: "Kain akhir",
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
      assessorId: handles.teacherId,
      status: "completed",
      rubric: [{ criterion: "Teknik", weight: 1, score: 90 }],
      score: 90,
      createdAt: NOW,
      updatedAt: NOW,
    })
    return await ctx.db.insert("certificates", {
      serial: "KN-PUBLIC-01",
      publicCode: "PUB-PUBLIC-01",
      studentId: handles.studentId,
      pathId: handles.pathId,
      teacherId: handles.teacherId,
      assessmentId,
      status: "issued",
      issuedAt: NOW,
      snapshot: {
        studentName: "Anisa Rahmawati",
        pathTitle: "Batik Tulis Soga",
        teacherName: "Bambang Hardjono",
        assessmentScore: 90,
        issuedAt: NOW,
      },
      createdAt: NOW,
      updatedAt: NOW,
    })
  })
}

describe("public lesson reader query", () => {
  it("[P2-LESSON-01] a public lesson returns its body and resolved media", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const assetId = await seedImage(t, "Kain mola bergaris pensil")

    await t.run(async (ctx) => {
      await ctx.db.patch(h.lessonOneId, {
        accessLevel: "public",
        body: LONG_BODY,
        mediaAssetIds: [assetId],
      })
    })

    const detail = await t.query(api.content.getPublicLesson, {
      pathSlug: h.pathId,
      lessonId: h.lessonOneId,
    })

    expect(detail?.status).toBe("unlocked")
    if (detail?.status !== "unlocked") throw new Error("expected unlocked")
    expect(detail.title).toBe("Mengenal canting")
    expect(detail.moduleTitle).toBe("Alat dan bahan")
    expect(detail.body).toBe(LONG_BODY)
    expect(detail.media[0]).toMatchObject({
      alt: "Kain mola bergaris pensil",
      kind: "image",
    })
    expect(detail.media[0]?.url).toContain("https://example.test/")
  })

  it("[P2-LESSON-02] enrolled lessons lock anonymous viewers and open for the enrolled student", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(h.lessonOneId, { body: LONG_BODY })
    })

    const anonymous = await t.query(api.content.getPublicLesson, {
      pathSlug: h.pathId,
      lessonId: h.lessonOneId,
    })
    expect(anonymous?.status).toBe("locked")
    if (anonymous?.status !== "locked") throw new Error("expected locked")
    expect(anonymous.reason).toBe("enrolled")
    expect(anonymous.teaser.length).toBeGreaterThan(0)
    expect(anonymous).not.toHaveProperty("body")

    const enrolled = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: h.lessonOneId,
      })
    expect(enrolled?.status).toBe("unlocked")
    if (enrolled?.status !== "unlocked") throw new Error("expected unlocked")
    expect(enrolled.body).toBe(LONG_BODY)

    const otherStudent = await t
      .withIdentity({ subject: "auth-student-other" })
      .query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: h.lessonOneId,
      })
    expect(otherStudent?.status).toBe("locked")
  })

  it("[P2-LESSON-03] certified lessons need an issued certificate, not just an enrollment", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    await t.run(async (ctx) => {
      await ctx.db.patch(h.lessonOneId, {
        accessLevel: "certified",
        body: LONG_BODY,
      })
    })

    const enrolledOnly = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: h.lessonOneId,
      })
    expect(enrolledOnly?.status).toBe("locked")
    if (enrolledOnly?.status !== "locked") throw new Error("expected locked")
    expect(enrolledOnly.reason).toBe("certified")

    await issueCertificate(t, h)

    const certified = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: h.lessonOneId,
      })
    expect(certified?.status).toBe("unlocked")
  })

  it("[P2-LESSON-04] the curriculum summary exposes the lesson id the reader needs", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const imageAssetId = await seedImage(t, "Jalur batik")
    await t.run(async (ctx) => {
      const path = await ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathId))
        .unique()
      if (path) await ctx.db.patch(path._id, { imageAssetId })
    })

    const path = await t.query(api.content.getPublicPath, { slug: h.pathId })
    const lesson = path?.curriculum
      .flatMap((module) => module.lessons)
      .find((item) => item.title === "Mengenal canting")

    expect(lesson?.id).toBe(h.lessonOneId)
  })

  it("[P2-LESSON-05] unpublished lessons and unknown ids resolve to null", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    await t.run(async (ctx) => {
      await ctx.db.patch(h.lessonOneId, { status: "draft" })
    })

    expect(
      await t.query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: h.lessonOneId,
      }),
    ).toBeNull()

    expect(
      await t.query(api.content.getPublicLesson, {
        pathSlug: h.pathId,
        lessonId: "not-a-real-id",
      }),
    ).toBeNull()
  })
})
