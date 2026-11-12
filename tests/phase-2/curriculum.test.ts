import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { NOW, createPhase2Db, seedPhase2 } from "./fixtures"

describe("learning / curriculum authoring", () => {
  it("[P2-CUR-01] a teacher can create, publish, and read a module and lesson", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const createdModule = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.createModule, {
        pathId: h.pathId,
        title: "Modul baru",
        summary: "Ringkasan modul baru",
        estimatedMinutes: 45,
      })

    const createdLesson = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.createLesson, {
        moduleId: createdModule.moduleId,
        title: "Pelajaran baru",
        kind: "text",
        body: "Isi pelajaran",
        estimatedMinutes: 20,
        accessLevel: "enrolled",
      })

    const draft = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    const draftModule = draft?.modules.find(
      (module) => module.id === createdModule.moduleId,
    )
    expect(draftModule?.status).toBe("draft")
    expect(draftModule?.lessons[0]?.status).toBe("draft")

    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.publishModule, {
        moduleId: createdModule.moduleId,
      })
    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.publishLesson, {
        lessonId: createdLesson.lessonId,
      })

    const curriculum = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    const publishedModule = curriculum?.modules.find(
      (module) => module.id === createdModule.moduleId,
    )
    expect(publishedModule?.status).toBe("published")
    expect(publishedModule?.lessons[0]?.status).toBe("published")
    expect(publishedModule?.lessons[0]?.title).toBe("Pelajaran baru")

    const detail = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.enrollmentDetail, {
        enrollmentId: h.enrollmentId,
      })
    const lesson = detail?.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === createdLesson.lessonId)
    expect(lesson?.title).toBe("Pelajaran baru")
    expect(lesson?.estimatedMinutes).toBe(20)
  })

  it("[P2-CUR-02] only the owning teacher or an operator can author the curriculum", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    await expect(
      t.withIdentity({ subject: "auth-teacher-other" }).mutation(
        api.learning.createModule,
        {
          pathId: h.pathId,
          title: "Modul asing",
          summary: "",
          estimatedMinutes: 10,
        },
      ),
    ).rejects.toThrow()

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.learning.createModule,
        {
          pathId: h.pathId,
          title: "Modul peserta",
          summary: "",
          estimatedMinutes: 10,
        },
      ),
    ).rejects.toThrow()

    const otherView = await t
      .withIdentity({ subject: "auth-teacher-other" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    expect(otherView).toBeNull()

    const adminView = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    expect(adminView?.path.slug).toBe(h.pathId)

    const adminModule = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.learning.createModule, {
        pathId: h.pathId,
        title: "Modul pengelola",
        summary: "",
        estimatedMinutes: 10,
      })
    expect(adminModule.moduleId).toBeTruthy()
  })

  it("[P2-CUR-03] reorder requires the complete list and delete respects lesson rules", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const before = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    const moduleIds = before?.modules.map((module) => module.id) ?? []
    expect(moduleIds.length).toBe(2)

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.learning.reorderModules,
        { pathId: h.pathId, moduleIds: [moduleIds[0]] },
      ),
    ).rejects.toThrow()

    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.reorderModules, {
        pathId: h.pathId,
        moduleIds: [...moduleIds].reverse(),
      })
    const reordered = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    expect(reordered?.modules.map((module) => module.id)).toEqual(
      [...moduleIds].reverse(),
    )
    expect(reordered?.modules.map((module) => module.order)).toEqual([1, 2])

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.learning.deleteModule,
        { moduleId: h.moduleId },
      ),
    ).rejects.toThrow()

    const emptyModule = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.createModule, {
        pathId: h.pathId,
        title: "Modul kosong",
        summary: "",
        estimatedMinutes: 5,
      })
    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.deleteModule, {
        moduleId: emptyModule.moduleId,
      })
    const afterDelete = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    expect(
      afterDelete?.modules.some(
        (module) => module.id === emptyModule.moduleId,
      ),
    ).toBe(false)

    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.learning.recordProgress,
      {
        enrollmentId: h.enrollmentId,
        lessonId: h.lessonOneId,
        state: "completed",
      },
    )
    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.deleteLesson, { lessonId: h.lessonOneId })
    const progress = await t.run(async (ctx) =>
      ctx.db
        .query("lessonProgress")
        .withIndex("by_enrollment", (q) =>
          q.eq("enrollmentId", h.enrollmentId),
        )
        .collect(),
    )
    expect(progress).toHaveLength(0)
  })

  it("[P2-CUR-04] publishing and unpublishing keep the stored path module count in sync", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const pathBefore = await t.run(async (ctx) =>
      ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathId))
        .unique(),
    )
    expect(pathBefore?.modules).toBe(2)

    const created = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.createModule, {
        pathId: h.pathId,
        title: "Modul hitung",
        summary: "",
        estimatedMinutes: 15,
      })

    const stillTwo = await t.run(async (ctx) =>
      ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathId))
        .unique(),
    )
    expect(stillTwo?.modules).toBe(2)

    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.publishModule, { moduleId: created.moduleId })
    const three = await t.run(async (ctx) =>
      ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathId))
        .unique(),
    )
    expect(three?.modules).toBe(3)

    await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.unpublishModule, { moduleId: created.moduleId })
    const backToTwo = await t.run(async (ctx) =>
      ctx.db
        .query("paths")
        .withIndex("by_slug", (q) => q.eq("slug", h.pathId))
        .unique(),
    )
    expect(backToTwo?.modules).toBe(2)
  })

  it("[P2-CUR-05] lesson media must reference an active media asset", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)

    const assetId = await t.run(async (ctx) =>
      ctx.db.insert("mediaAssets", {
        kind: "audio",
        filename: "latihan.mp3",
        mimeType: "audio/mpeg",
        size: 1024,
        alt: "Latihan audio",
        status: "active",
        uploadedBy: "auth-admin",
        createdAt: NOW,
      }),
    )

    const created = await t
      .withIdentity({ subject: "auth-teacher" })
      .mutation(api.learning.createLesson, {
        moduleId: h.moduleId,
        title: "Pelajaran audio",
        kind: "audio",
        body: "Dengarkan",
        estimatedMinutes: 10,
        accessLevel: "enrolled",
        mediaAssetIds: [assetId],
      })

    const curriculum = await t
      .withIdentity({ subject: "auth-teacher" })
      .query(api.learning.getCurriculum, { pathId: h.pathId })
    const lesson = curriculum?.modules
      .flatMap((module) => module.lessons)
      .find((item) => item.id === created.lessonId)
    expect(lesson?.media[0]?.filename).toBe("latihan.mp3")

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.learning.createLesson,
        {
          moduleId: h.moduleId,
          title: "Pelajaran rusak",
          kind: "audio",
          body: "",
          estimatedMinutes: 10,
          accessLevel: "enrolled",
          mediaAssetIds: [h.lessonOneId as never],
        },
      ),
    ).rejects.toThrow()
  })
})
