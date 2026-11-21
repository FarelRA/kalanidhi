import { v } from "convex/values"

import type { Id } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import {
  buildCertificateChain,
  latestAssessmentForSubmission,
} from "../lib/builders"
import {
  CERTIFICATES,
  certificatePublicCode,
  certificateSerial,
  pathSlug,
  submissionCodeForKey,
} from "../lib/codes"
import { createSeedClock } from "../lib/clock"
import { pathBySlug, seedAdmin, userByEmail, workBySlug } from "../lib/lookup"
import { worksSeed as WORKS } from "../content/data"
import { seedEmail } from "../content/identities"

export const seedCredentials = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const certificateIds = new Map<string, Id<"certificates">>()

    // Serials follow issue order; the revoked certificate is the newest.
    const finals = [
      {
        key: "anisa",
        submissionKey: "anisa-bbm-final",
        pathSlug: pathSlug("batikBambu"),
        issuedDaysAgo: 327,
        serial: certificateSerial("anisa"),
        status: "issued" as const,
      },
      {
        key: "dimas",
        submissionKey: "dimas-bbm-final",
        pathSlug: pathSlug("batikBambu"),
        issuedDaysAgo: 326,
        serial: certificateSerial("dimas"),
        status: "issued" as const,
      },
      {
        key: "purnomo",
        submissionKey: "purnomo-bbm-final",
        pathSlug: pathSlug("batikBambu"),
        issuedDaysAgo: 325,
        serial: certificateSerial("purnomo"),
        status: "issued" as const,
      },
      {
        key: "galuh",
        submissionKey: "galuh-aks-final",
        pathSlug: pathSlug("aksaraJawa"),
        issuedDaysAgo: 110,
        serial: certificateSerial("galuh"),
        status: "issued" as const,
      },
      {
        key: "arif",
        submissionKey: "arif-aks-final",
        pathSlug: pathSlug("aksaraJawa"),
        issuedDaysAgo: 8,
        serial: certificateSerial("arif"),
        status: "issued" as const,
      },
      {
        key: "sekar",
        submissionKey: "sekar-tari-final",
        pathSlug: pathSlug("tariKreasi"),
        issuedDaysAgo: 112,
        serial: certificateSerial("sekar"),
        status: "issued" as const,
      },
      {
        key: "bimo",
        submissionKey: "bimo-kul-final",
        pathSlug: pathSlug("kulinerNusantara"),
        issuedDaysAgo: 106,
        serial: certificateSerial("bimo"),
        status: "issued" as const,
      },
      {
        key: "dwi",
        submissionKey: "dwi-bbm-final",
        pathSlug: pathSlug("batikBambu"),
        issuedDaysAgo: 15,
        revokedDaysAgo: 5,
        serial: certificateSerial("dwi"),
        status: "revoked" as const,
      },
    ]

    for (const final of finals) {
      const student = await userByEmail(ctx, seedEmail(final.key))
      const path = await pathBySlug(ctx, final.pathSlug)
      const submission = await ctx.db
        .query("submissions")
        .withIndex("by_code", (q) =>
          q.eq("code", submissionCodeForKey(final.submissionKey)),
        )
        .unique()
      if (!submission) {
        throw new Error(`Seed submission missing, ${final.submissionKey}`)
      }
      const assessment = await latestAssessmentForSubmission(
        ctx,
        submission._id,
      )
      if (!assessment) {
        throw new Error(`Seed assessment missing, ${final.submissionKey}`)
      }
      const completed = (
        await ctx.db
          .query("enrollments")
          .withIndex("by_studentId", (q) => q.eq("studentId", student._id))
          .collect()
      ).find(
        (item) => item.pathId === path.slug && item.status === "completed",
      )
      if (!completed) {
        throw new Error(`Seed completed enrollment missing, ${final.key}`)
      }

      const issuedAt = clock.ago(final.issuedDaysAgo)
      const certificateId = await buildCertificateChain(ctx, {
        now: clock.now,
        assessmentId: assessment._id,
        enrollmentId: completed._id,
        serial: final.serial,
        publicCode: certificatePublicCode(final.key as keyof typeof CERTIFICATES),
        issuedAt,
        status: final.status,
        revokedAt:
          final.status === "revoked"
            ? clock.ago(final.revokedDaysAgo ?? 5)
            : undefined,
        revokeReason:
          final.status === "revoked"
            ? "Sertifikat uji proses verifikasi dicabut setelah koreksi ejaan nama."
            : undefined,
        revokedBy: final.status === "revoked" ? admin._id : undefined,
        actorId: final.status === "revoked" ? admin._id : undefined,
        auditReason:
          final.status === "revoked"
            ? "Penerbitan sertifikat angkatan 1."
            : "Penilaian akhir disetujui",
      })
      certificateIds.set(final.key, certificateId)
    }

    for (const [index, work] of WORKS.entries()) {
      const workDoc = await workBySlug(ctx, work.slug)
      const maker = await userByEmail(ctx, seedEmail(work.makerKey))
      const certificateId = certificateIds.get(work.certificateKey)
      if (!certificateId) {
        throw new Error(`Seed certificate missing, ${work.certificateKey}`)
      }
      await ctx.db.patch(workDoc._id, {
        certificateId,
        makerId: maker._id,
        pathId: work.pathSlug,
        status: "published",
        permission: work.permission,
        // Work evidence follows its maker's issued credential.
        createdAt: clock.ago([320, 265, 210, 100, 85, 55][index] ?? 55),
      })
      await ctx.db.insert("workCards", {
        workId: workDoc._id,
        certificateId,
        makerId: maker._id,
        serial: work.workCard,
        title: work.title,
        technique: work.technique,
        materials:
          work.pathSlug === pathSlug("batikBambu")
            ? "Bambu petung, malam, pewarna, dan pelapis NC"
            : work.pathSlug === pathSlug("aksaraJawa")
              ? "Kertas, tinta, pena, dan penggaris"
              : work.pathSlug === pathSlug("tariKreasi")
                ? "Rekaman, iringan, properti ringan, dan busana latihan"
                : work.pathSlug === pathSlug("kulinerNusantara")
                  ? "Tapioka, bawang putih, minyak goreng, dan kemasan beku"
                  : "Busana adat, perlengkapan acara",
        provenance: work.region,
        permission: work.permission,
        accessLevel: "public",
        // One card waits in teacher review so the review path is demonstrable.
        status: work.slug === "geblek-renteng-beku" ? "submitted" : "published",
        createdAt: clock.ago([320, 265, 210, 100, 85, 55][index] ?? 55),
        updatedAt: clock.now,
      })
    }

    return { certificates: certificateIds.size }
  },
})
