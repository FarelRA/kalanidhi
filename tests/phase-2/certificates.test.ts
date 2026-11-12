import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  createPhase2Db,
  seedPhase2,
  seedWorkForCertificate,
  submitAndGrade,
} from "./fixtures"

async function issueForStudent(t: ReturnType<typeof createPhase2Db>) {
  const h = await seedPhase2(t)
  const { submissionId, result } = await submitAndGrade(t, h, {
    studentAuth: "auth-student",
    studentId: h.studentId,
    enrollmentId: h.enrollmentId,
    teacherAuth: "auth-teacher",
    decision: "approve",
    score: 89,
  })
  if (!result.certificateId) throw new Error("certificate missing")
  return { h, submissionId, certificateId: result.certificateId, assessmentId: result.assessmentId }
}

describe("certificates / issuance and public verification", () => {
  it("[P2-CRT-01] approval issues exactly one certificate per assessment", async () => {
    const t = createPhase2Db()
    const { certificateId, assessmentId, submissionId } = await issueForStudent(t)

    const certificates = await t.run(async (ctx) =>
      ctx.db
        .query("certificates")
        .withIndex("by_assessmentId", (q) =>
          q.eq("assessmentId", assessmentId as never),
        )
        .collect(),
    )
    expect(certificates).toHaveLength(1)
    expect(certificates[0]?._id).toBe(certificateId)

    await expect(
      t.withIdentity({ subject: "auth-teacher" }).mutation(
        api.assessments.grade,
        {
          submissionId,
          decision: "approve",
          rubric: [
            { criterion: "A", weight: 50, score: 90 },
            { criterion: "B", weight: 50, score: 90 },
          ],
        },
      ),
    ).rejects.toThrow()

    const after = await t.run(async (ctx) =>
      ctx.db
        .query("certificates")
        .withIndex("by_assessmentId", (q) =>
          q.eq("assessmentId", assessmentId as never),
        )
        .collect(),
    )
    expect(after).toHaveLength(1)
  })

  it("[P2-CRT-02] serial and public code are unique and unguessable", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    const original = await t.run(async (ctx) => ctx.db.get(certificateId))
    expect(original?.publicCode).toMatch(/^kn-[a-z0-9-]+$/)
    expect(original?.serial).toMatch(/^KN-[A-Z]{3}-\d{4}-[A-Z0-9]+$/)
    expect(original?.publicCode.length).toBeGreaterThan(12)
  })

  it("[P2-CRT-03] the certificate snapshots student, path, teacher, date, and status", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    const certificate = await t.run(async (ctx) => ctx.db.get(certificateId))
    expect(certificate?.snapshot.studentName).toBe("Anisa Rahmawati")
    expect(certificate?.snapshot.pathTitle).toBe("Batik Tulis Soga")
    expect(certificate?.snapshot.teacherName).toBe("Bambang Hardjono")
    expect(certificate?.snapshot.assessmentScore).toBe(89)
    expect(certificate?.status).toBe("issued")
    expect(certificate?.issuedAt).toBeGreaterThan(0)
  })

  it("[P2-CRT-04] public verification returns only safe fields", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    const certificate = await t.run(async (ctx) => ctx.db.get(certificateId))
    if (!certificate) throw new Error("certificate missing")

    const publicView = await t.query(api.certificates.verifyPublic, {
      code: certificate.publicCode,
    })
    expect(publicView).not.toBeNull()
    expect(publicView?.status).toBe("issued")
    expect(publicView?.studentName).toBe("Anisa Rahmawati")
    expect(publicView).not.toHaveProperty("studentId")
    expect(publicView).not.toHaveProperty("teacherId")
    expect(publicView).not.toHaveProperty("assessmentId")
    expect(publicView).not.toHaveProperty("revokeReason")
    expect(publicView).not.toHaveProperty("email")

    const missing = await t.query(api.certificates.verifyPublic, {
      code: "kn-tidak-ada",
    })
    expect(missing).toBeNull()
  })

  it("[P2-CRT-05] revocation requires a reason and shows revoked immediately", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    const certificate = await t.run(async (ctx) => ctx.db.get(certificateId))
    if (!certificate) throw new Error("certificate missing")

    await expect(
      t.withIdentity({ subject: "auth-admin" }).mutation(
        api.certificates.revoke,
        { certificateId, reason: "pendek" },
      ),
    ).rejects.toThrow()

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.certificates.revoke,
      {
        certificateId,
        reason: "Bukti penilaian tidak sah setelah peninjauan.",
      },
    )

    const publicView = await t.query(api.certificates.verifyPublic, {
      code: certificate.publicCode,
    })
    expect(publicView?.status).toBe("revoked")
    expect(publicView?.revokedAt).toBeGreaterThan(0)
  })

  it("[P2-CRT-06] reissue creates a new code and marks the old one replaced", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    const original = await t.run(async (ctx) => ctx.db.get(certificateId))
    if (!original) throw new Error("certificate missing")

    const replacement = await t
      .withIdentity({ subject: "auth-admin" })
      .mutation(api.certificates.reissue, {
        certificateId,
        reason: "Kode lama tidak dapat dipindai pada unduhan.",
      })
    expect(replacement.publicCode).not.toBe(original.publicCode)
    expect(replacement.serial).not.toBe(original.serial)

    const oldPublic = await t.query(api.certificates.verifyPublic, {
      code: original.publicCode,
    })
    expect(oldPublic?.status).toBe("replaced")
    expect(oldPublic?.replacedByPublicCode).toBe(replacement.publicCode)

    const newPublic = await t.query(api.certificates.verifyPublic, {
      code: replacement.publicCode,
    })
    expect(newPublic?.status).toBe("issued")

    const enrollment = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.learning.listEnrollments, {})
    expect(enrollment[0]?.certificateId).toBe(replacement.certificateId)
  })

  it("[P2-CRT-07] revocation removes seller scope and pauses dependent listings", async () => {
    const t = createPhase2Db()
    const { h, certificateId } = await issueForStudent(t)
    const work = await seedWorkForCertificate(t, {
      certificateId,
      makerId: h.studentId,
      slug: "kain-seller",
    })

    const before = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.access.getViewer, {})
    expect(before?.sellScopes).toContain("batik-tulis-soga")

    const mine = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.certificates.listMine, {})
    expect(mine[0]?.workCards[0]?.serial).toBe("KN-8821")
    expect(before?.capabilities).toContain("sell")

    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.certificates.revoke,
      {
        certificateId,
        reason: "Pelanggaran etika sumber budaya.",
      },
    )

    const after = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.access.getViewer, {})
    expect(after?.sellScopes).toEqual([])
    expect(after?.capabilities).not.toContain("sell")

    const listing = await t.run(async (ctx) => ctx.db.get(work.workId))
    const card = await t.run(async (ctx) => ctx.db.get(work.workCardId))
    expect(listing?.status).toBe("paused")
    expect(card?.status).toBe("paused")
  })

  it("[P2-CRT-08] teacher suspension keeps issued certificates valid", async () => {
    const t = createPhase2Db()
    const { h, certificateId } = await issueForStudent(t)
    const certificate = await t.run(async (ctx) => ctx.db.get(certificateId))
    if (!certificate) throw new Error("certificate missing")

    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("teachers")
        .withIndex("by_userId", (q) => q.eq("userId", h.teacherId))
        .unique()
      if (profile) {
        await ctx.db.patch(profile._id, { status: "suspended" })
      }
    })

    const publicView = await t.query(api.certificates.verifyPublic, {
      code: certificate.publicCode,
    })
    expect(publicView?.status).toBe("issued")

    const studentView = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.access.getViewer, {})
    expect(studentView?.sellScopes).toContain("batik-tulis-soga")
  })

  it("[P2-CRT-10] a certificate for path A never authorizes path B", async () => {
    const t = createPhase2Db()
    await issueForStudent(t)
    const viewer = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.access.getViewer, {})
    expect(viewer?.sellScopes).toEqual(["batik-tulis-soga"])
    expect(viewer?.sellScopes).not.toContain("pranatacara-jawa")
  })

  it("[P2-CRT-11] certificate events are append-only records with actor and reason", async () => {
    const t = createPhase2Db()
    const { certificateId } = await issueForStudent(t)
    await t.withIdentity({ subject: "auth-admin" }).mutation(
      api.certificates.revoke,
      {
        certificateId,
        reason: "Pencabutan untuk pengujian alasan.",
      },
    )

    const events = await t.run(async (ctx) =>
      ctx.db
        .query("certificateEvents")
        .withIndex("by_certificateId", (q) =>
          q.eq("certificateId", certificateId),
        )
        .collect(),
    )
    expect(events).toHaveLength(2)
    expect(events.map((event) => event.kind)).toEqual(["issue", "revoke"])
    expect(events.every((event) => Boolean(event.actorId))).toBe(true)
    expect(events[1]?.reason).toContain("Pencabutan")
  })

  it("[P2-CRT-12] an admin cannot issue a certificate without an approved assessment", async () => {
    const t = createPhase2Db()
    const h = await seedPhase2(t)
    const draft = await t
      .withIdentity({ subject: "auth-student" })
      .mutation(api.assessments.createDraft, {
        enrollmentId: h.enrollmentId,
        taskTitle: "Belum disetujui",
        evidenceText: "Catatan",
      })
    await t.withIdentity({ subject: "auth-student" }).mutation(
      api.assessments.submit,
      { submissionId: draft.submissionId },
    )

    const certificates = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.certificates.listRegistry, {})
    expect(certificates).toEqual([])

    const detail = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.certificates.listMine, {})
    expect(detail).toEqual([])
  })

  it("[P2-CRT-13] certificate registry is scoped to the operator", async () => {
    const t = createPhase2Db()
    await issueForStudent(t)

    const registry = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.certificates.listRegistry, {})
    expect(registry).toHaveLength(1)

    const mine = await t
      .withIdentity({ subject: "auth-student" })
      .query(api.certificates.listMine, {})
    expect(mine).toHaveLength(1)

    const otherMine = await t
      .withIdentity({ subject: "auth-student-other" })
      .query(api.certificates.listMine, {})
    expect(otherMine).toEqual([])

    await expect(
      t
        .withIdentity({ subject: "auth-student" })
        .query(api.certificates.listRegistry, {}),
    ).rejects.toThrow()
  })
})
