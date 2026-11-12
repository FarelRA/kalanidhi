import { describe, expect, it } from "vitest"

import { api, internal } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import {
  contentFixture,
  errorCode,
  NOW,
  seedAdmin,
  seedContent,
  seedStudent,
} from "./fixtures"

async function adminDb() {
  const t = createTestDb()
  await seedAdmin(t, "auth-admin")
  return t
}

describe("content CMS / draft and publish", () => {
  it("[P1-CMS-20] saving a draft does not change the public site", async () => {
    const t = await adminDb()
    await seedContent(t)
    const before = await t.query(api.content.getSite, {})
    const value = contentFixture()
    value.hero.description = "Draf baru yang belum terbit."

    const result = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, {
        value,
        note: "Ubah deskripsi hero",
      })
    expect(result.version).toBe(1)

    const after = await t.query(api.content.getSite, {})
    expect(after?.hero.description).toBe(before?.hero.description)
    expect(after?.hero.description).not.toContain("Draf baru")
  })

  it("[P1-CMS-23] publish requires content.publish and switches the public page atomically", async () => {
    const t = await adminDb()
    await seedContent(t)
    const studentId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        authUserId: "auth-student",
        name: "Siswa",
        email: "siswa@example.test",
        emailVerified: true,
        phone: "6280000000000",
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: "SI",
        region: "Yogyakarta",
        roles: ["student"],
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      }),
    )
    void studentId
    const value = contentFixture()
    value.hero.description = "Deskripsi terbit baru."

    await expect(
      t.withIdentity({ subject: "auth-student" }).mutation(
        api.content.saveDraft,
        { value, note: "Tidak boleh" },
      ),
    ).rejects.toThrow()

    const saved = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, {
        value,
        note: "Siap terbit",
      })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.publish, {
      version: saved.version,
      note: "Terbitkan hero",
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.hero.description).toBe("Deskripsi terbit baru.")
    const revisions = await t.run(async (ctx) =>
      ctx.db.query("contentRevisions").collect(),
    )
    expect(revisions).toHaveLength(1)
    expect(revisions[0]?.status).toBe("published")
  })

  it("[P1-CMS-01] publish rejects invalid content and keeps the old page live", async () => {
    const t = await adminDb()
    await seedContent(t)
    const before = await t.query(api.content.getSite, {})
    const invalid = contentFixture()
    invalid.hero.title = [""]
    invalid.metadata.siteUrl = "javascript:alert(1)"

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value: invalid,
        note: "Draf rusak",
      }),
    ).rejects.toThrow()

    const after = await t.query(api.content.getSite, {})
    expect(after?.hero.title).toEqual(before?.hero.title)
  })

  it("[P1-CMS-29] a stale base version is rejected instead of last-write-wins", async () => {
    const t = await adminDb()
    await seedContent(t)
    const value = contentFixture()

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
      value,
      note: "Draf pertama",
    })

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value,
        note: "Draf dari tab lama",
        baseVersion: 99,
      }),
    ).rejects.toThrow(/draf|versi|berubah|stale/i)
  })

  it("[P1-CMS-27] rollback creates a new revision and restores the old value", async () => {
    const t = await adminDb()
    await seedContent(t)
    const first = contentFixture()
    first.hero.description = "Versi satu."
    const savedFirst = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value: first, note: "Versi satu" })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.publish, {
      version: savedFirst.version,
      note: "Terbit versi satu",
    })

    const second = contentFixture()
    second.hero.description = "Versi dua."
    const savedSecond = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value: second, note: "Versi dua" })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.publish, {
      version: savedSecond.version,
      note: "Terbit versi dua",
    })

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.rollback, {
      version: savedFirst.version,
      note: "Kembali ke versi satu",
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.hero.description).toBe("Versi satu.")
    const revisions = await t.run(async (ctx) =>
      ctx.db.query("contentRevisions").collect(),
    )
    expect(revisions).toHaveLength(3)
    expect(revisions.some((revision) => revision.status === "published" && revision.version === 3)).toBe(true)
  })

  it("[P1-CMS-21] a preview token is scoped to one revision and expires", async () => {
    const t = await adminDb()
    const value = contentFixture()
    const saved = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value, note: "Pratinjau" })
    const preview = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.createPreview, { version: saved.version })

    const payload = await t.query(api.content.getPreview, {
      token: preview.token,
    })
    expect(payload?.version).toBe(saved.version)

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("contentPreviews").collect()
      await ctx.db.patch(rows[0]._id, { expiresAt: NOW - 1 })
    })
    expect(
      await t.query(api.content.getPreview, { token: preview.token }),
    ).toBeNull()
  })

  it("[P1-CMS-30] the content lock blocks a second writer and expires cleanly", async () => {
    const t = await adminDb()
    await seedAdmin(t, "auth-admin-2", "Fajar Nugroho")

    const first = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.acquireLock, {})
    expect(first.acquired).toBe(true)

    const second = await t
      .withIdentity({ subject: "auth-admin-2" })
      .mutation(api.content.acquireLock, {})
    expect(second.acquired).toBe(false)
    expect(second.lock.holderName).toBe("Nadia Kusuma")

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.releaseLock, {})
    const third = await t
      .withIdentity({ subject: "auth-admin-2" })
      .mutation(api.content.acquireLock, {})
    expect(third.acquired).toBe(true)
  })

  it("[P1-CMS-25] scheduled publish waits for its due time and then runs once", async () => {
    const t = await adminDb()
    await seedContent(t)
    const before = await t.query(api.content.getSite, {})
    const value = contentFixture()
    value.hero.description = "Terbit terjadwal."
    const saved = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value, note: "Jadwalkan" })

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.publish, {
      version: saved.version,
      note: "Jadwalkan terbit",
      scheduledFor: Date.now() + 3_600_000,
    })
    expect((await t.query(api.content.getSite, {}))?.hero.description).toBe(
      before?.hero.description,
    )

    await t.run(async (ctx) => {
      const revision = await ctx.db
        .query("contentRevisions")
        .withIndex("by_key_version", (q) =>
          q.eq("key", "site").eq("version", saved.version),
        )
        .unique()
      if (revision) await ctx.db.patch(revision._id, { scheduledFor: Date.now() - 1 })
    })

    const result = await t.mutation(internal.content.runScheduledPublish, {})
    expect(result.published).toEqual([saved.version])
    expect((await t.query(api.content.getSite, {}))?.hero.description).toBe(
      "Terbit terjadwal.",
    )
    const again = await t.mutation(internal.content.runScheduledPublish, {})
    expect(again.published).toEqual([])
  })
})

describe("content CMS / entities and validation", () => {
  it("[P1-CMS-15] the draft schema rejects a broken entity and accepts the shipped copy", async () => {
    const t = await adminDb()
    const value = contentFixture()
    const broken = structuredClone(value)
    broken.paths[0].price = 12.5

    const error = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, {
        value: broken,
        note: "Harga pecahan",
      })
      .catch((caught: unknown) => caught)
    expect(errorCode(error)).toBe("CONTENT_INVALID")

    const saved = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value, note: "Konten lengkap" })
    expect(saved.version).toBe(1)
  })

  it("[P1-CMS-05] image alt text and safe URLs are enforced", async () => {
    const t = await adminDb()
    const value = contentFixture()
    value.hero.plate.alt = ""

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value,
        note: "Alt kosong",
      }),
    ).rejects.toThrow()

    const unsafe = contentFixture()
    unsafe.footer.columns[0].links[0].href = "javascript:alert(1)"
    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value: unsafe,
        note: "Tautan tidak aman",
      }),
    ).rejects.toThrow()
  })

  it("[P1-CMS-11] forbidden public labels are rejected", async () => {
    const t = await adminDb()
    const value = contentFixture()
    value.hero.description = "Ini contoh konten prototipe."

    const error = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, {
        value,
        note: "Label terlarang",
      })
      .catch((caught: unknown) => caught)
    expect(errorCode(error)).toBe("CONTENT_INVALID")
  })

  it("[P1-CMS-13] the base region must remain Yogyakarta and Jawa Tengah", async () => {
    const t = await adminDb()
    const value = contentFixture()
    value.metadata.areaServed = "Seluruh Indonesia"

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value,
        note: "Klaim nasional",
      }),
    ).rejects.toThrow()
  })

  it("[P1-CMS-12] certificate copy must name the platform certificate", async () => {
    const t = await adminDb()
    const value = contentFixture()
    value.footer.certificateNote = "Sertifikat pemerintah."

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(api.content.saveDraft, {
        value,
        note: "Catatan sertifikat salah",
      }),
    ).rejects.toThrow()
  })

  it("[P1-CMS-24] a stored invalid revision cannot be published", async () => {
    const t = await adminDb()
    await seedContent(t)
    const before = await t.query(api.content.getSite, {})
    const invalid = contentFixture()
    invalid.hero.title = [""]
    await t.run(async (ctx) => {
      await ctx.db.insert("contentRevisions", {
        key: "site",
        version: 50,
        value: invalid,
        status: "draft",
        authorId: "system",
        note: "Rusak",
        createdAt: NOW,
      })
    })

    const error = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.publish, { version: 50, note: "Coba terbit" })
      .catch((caught: unknown) => caught)
    expect(errorCode(error)).toBe("CONTENT_INVALID")
    expect((await t.query(api.content.getSite, {}))?.hero.title).toEqual(
      before?.hero.title,
    )
  })

  it("[P1-CMS-26] a failed scheduled publish returns the revision to draft and audits the failure", async () => {
    const t = await adminDb()
    const invalid = contentFixture()
    invalid.metadata.siteUrl = "javascript:alert(1)"
    await t.run(async (ctx) => {
      await ctx.db.insert("contentRevisions", {
        key: "site",
        version: 51,
        value: invalid,
        status: "scheduled",
        authorId: "system",
        note: "Jadwal rusak",
        scheduledFor: Date.now() - 1,
        createdAt: NOW,
      })
    })

    const result = await t.mutation(internal.content.runScheduledPublish, {})
    expect(result.failed).toEqual([51])

    const revision = await t.run(async (ctx) => {
      return await ctx.db
        .query("contentRevisions")
        .withIndex("by_key_version", (q) =>
          q.eq("key", "site").eq("version", 51),
        )
        .unique()
    })
    expect(revision?.status).toBe("draft")
    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) =>
          q.eq("action", "content.scheduledPublishFailed"),
        )
        .collect(),
    )
    expect(audit).toHaveLength(1)
    expect(audit[0]?.severity).toBe("error")
  })

  it("[P1-CMS-33] publishing an entity updates the public tables and hides unpublished teachers", async () => {
    const t = await adminDb()
    await seedContent(t)
    const value = contentFixture()
    value.teachers[0].quote = "Kutipan pengajar baru."
    value.works = value.works.filter((work) => work.slug !== "batik-soga-anyaman")
    const saved = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.content.saveDraft, { value, note: "Ubah entitas" })

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.content.publish, {
      version: saved.version,
      note: "Terbitkan entitas",
      confirmSensitive: true,
    })

    const site = await t.query(api.content.getSite, {})
    expect(site?.teachers[0]?.quote).toBe("Kutipan pengajar baru.")
    expect(site?.works.some((work) => work.slug === "batik-soga-anyaman")).toBe(false)

    await t.run(async (ctx) => {
      await ctx.db.insert("teachers", {
        order: 99,
        slug: "pengajar-draf",
        name: "Pengajar Draf",
        initials: "PD",
        specialty: "Tenun",
        region: "Jepara",
        experience: "5 tahun",
        quote: "Belum tampil.",
        focus: "Tenun",
        path: "Tenun",
        community: "Sanggar",
        verified: false,
        status: "review",
        published: false,
      })
    })
    const after = await t.query(api.content.getSite, {})
    expect(after?.teachers.some((teacher) => teacher.slug === "pengajar-draf")).toBe(false)
  })
})

describe("content CMS / linked path teacher", () => {
  it("[P1-CMS-34] a path linked by teacherId resolves the teacher profile", async () => {
    const t = await adminDb()
    await seedContent(t)
    const teacherId = await seedStudent(t, "auth-path-teacher", "Sri Wahyuni")

    await t.run(async (ctx) => {
      const teacher = await ctx.db
        .query("teachers")
        .withIndex("by_order")
        .first()
      if (teacher) {
        await ctx.db.patch(teacher._id, {
          userId: teacherId,
          name: "Sri Wahyuni",
        })
      }
      const path = await ctx.db.query("paths").withIndex("by_order").first()
      if (path) {
        await ctx.db.patch(path._id, {
          teacherId,
          teacher: "Nama Lama",
        })
      }
    })

    const site = await t.query(api.content.getSite, {})
    const path = site?.paths[0]
    expect(path?.teacherId).toBe(teacherId)
    expect(path?.teacher).toBe("Sri Wahyuni")
  })

  it("[P1-CMS-35] a path without teacherId keeps the stored teacher string", async () => {
    const t = await adminDb()
    await seedContent(t)

    const site = await t.query(api.content.getSite, {})
    const path = site?.paths[0]
    expect(path?.teacherId).toBeUndefined()
    expect(path?.teacher).toBeTruthy()
  })
})
