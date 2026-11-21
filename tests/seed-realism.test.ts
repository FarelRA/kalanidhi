import { describe, expect, it } from "vitest"

import { api, internal } from "../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seed/content/data"
import { CURRICULUM_IMAGE_FILES } from "../convex/seed/domains/curriculum"
import { MESSAGING_IMAGE_FILES } from "../convex/seed/domains/messaging"
import { SEED_START } from "../convex/seed/lib/clock"
import { createTestDb } from "./helpers/convex"

const NOW = Date.now()
const DAY = 86_400_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
      ...CURRICULUM_IMAGE_FILES,
      ...MESSAGING_IMAGE_FILES,
    ]),
  )
}

async function seedWorkspace(t: ReturnType<typeof createTestDb>) {
  await t.run(async (ctx) => {
    for (const filename of seedFilenames()) {
      const storageId = await ctx.storage.store(
        new Blob([`image:${filename}`], { type: "image/jpeg" }),
      )
      await ctx.db.insert("mediaAssets", {
        kind: "image",
        storageId,
        filename,
        mimeType: "image/jpeg",
        size: 10,
        alt: filename,
        status: "active",
        uploadedBy: "system",
        createdAt: NOW,
      })
    }
  })
  await t.action(internal.seed.run.run, {})
}

function timestampRange(values: Array<number | undefined>) {
  const filled = values.filter((value): value is number => value !== undefined)
  return {
    min: Math.min(...filled),
    max: Math.max(...filled),
    count: filled.length,
  }
}

describe("seed realism", () => {
  it("seeds one canonical teacher and work definition", async () => {
    const t = createTestDb()
    await seedWorkspace(t)
    const data = await t.run(async (ctx) => ({
      teachers: await ctx.db.query("teachers").collect(),
      works: await ctx.db.query("works").collect(),
    }))
    expect(data.teachers.map((teacher) => teacher.slug).sort()).toEqual(
      teachersSeed.map((teacher) => teacher.slug).sort(),
    )
    expect(data.works.map((work) => work.slug).sort()).toEqual(
      worksSeed.map((work) => work.slug).sort(),
    )
    expect(new Set(data.teachers.map((teacher) => teacher.slug)).size).toBe(
      data.teachers.length,
    )
    expect(new Set(data.works.map((work) => work.slug)).size).toBe(
      data.works.length,
    )
  })

  it("uses plausible Gmail, WhatsApp, and DIY identities", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const users = await t.run(async (ctx) => {
      return await ctx.db.query("users").collect()
    })

    const emails = new Set<string>()
    const phones = new Set<string>()
    for (const user of users) {
      if (user.roles.includes("admin")) {
        // The operator account is provisioned by Better Auth, not the seed.
        expect(user.province).toBe("DI Yogyakarta")
        continue
      }

      // Growth signups use the same personal-mail pattern the seed ships with:
      // first.last plus two digits, on Gmail, Yahoo Indonesia, or Outlook.
      expect(user.email).toMatch(
        /^[a-z0-9]+(\.[a-z0-9]+)*\d{2}@(gmail\.com|yahoo\.co\.id|outlook\.com)$/,
      )
      expect(user.phone).toMatch(/^628\d{8,11}$/)
      expect(user.province).toBe("DI Yogyakarta")
      expect(user.region.toLowerCase()).toContain("yogyakarta")
      expect(user.whatsappVerified).toBe(true)
      expect(user.createdAt).toBeGreaterThanOrEqual(SEED_START)
      expect(user.createdAt).toBeLessThanOrEqual(NOW)

      emails.add(user.email)
      phones.add(user.phone)
    }

    expect(emails.size).toBe(users.length - 1)
    expect(phones.size).toBe(users.length - 1)
  })

  it("masks payout accounts like real bank records", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const accounts = await t.run(async (ctx) => {
      return await ctx.db.query("payoutAccounts").collect()
    })

    expect(accounts.length).toBeGreaterThan(0)
    const suffixes = new Set<string>()
    for (const account of accounts) {
      expect(account.accountNumberMasked).toMatch(/^\*{4}\d{4}$/)
      expect(account.accountName.trim().length).toBeGreaterThan(3)
      expect(["BCA", "BRI", "BNI", "Mandiri"]).toContain(account.bankCode)
      suffixes.add(account.accountNumberMasked)
    }
    expect(suffixes.size).toBe(accounts.length)
  })

  it("keeps order codes in chronological order", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const orders = await t.run(async (ctx) => {
      return await ctx.db.query("orders").collect()
    })
    const sorted = [...orders].sort((a, b) => a.code.localeCompare(b.code))
    for (let index = 1; index < sorted.length; index += 1) {
      expect(
        sorted[index].createdAt,
        `${sorted[index].code} should be newer than ${sorted[index - 1].code}`,
      ).toBeGreaterThanOrEqual(sorted[index - 1].createdAt)
    }
  })

  it("keeps every causal chain in order", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const chains = await t.run(async (ctx) => {
      const users = await ctx.db.query("users").collect()
      const userById = new Map(users.map((user) => [user._id, user]))
      const enrollments = await ctx.db.query("enrollments").collect()
      const submissions = await ctx.db.query("submissions").collect()
      const assessments = await ctx.db.query("assessments").collect()
      const certificates = await ctx.db.query("certificates").collect()
      const works = await ctx.db.query("works").collect()
      const orders = await ctx.db.query("orders").collect()
      const payments = await ctx.db.query("payments").collect()
      const payouts = await ctx.db.query("payouts").collect()

      const byId = <T extends { _id: string }>(rows: T[]) =>
        new Map(rows.map((row) => [row._id as string, row]))
      const assessmentBySubmission = new Map(
        assessments.map((row) => [row.submissionId as string, row]),
      )
      const certificateById = byId(certificates)
      const workById = byId(works)
      const paymentByOrder = new Map(
        payments.map((row) => [row.orderId as string, row]),
      )
      const payoutByOrder = new Map(
        payouts.map((row) => [row.orderId as string, row]),
      )

      return {
        enrollmentBeforeStudent: enrollments
          .map((row) => ({
            student: userById.get(row.studentId)?.createdAt,
            enrolledAt: row.enrolledAt,
          }))
          .filter((row) => row.student !== undefined),
        enrollmentBeforeSubmission: submissions
          .map((row) => {
            const enrollment = enrollments.find(
              (item) =>
                item.studentId === row.studentId &&
                item.cohortId === row.cohortId,
            )
            return {
              enrolledAt: enrollment?.enrolledAt,
              submittedAt: row.submittedAt,
            }
          })
          .filter((row) => row.enrolledAt !== undefined && row.submittedAt),
        submissionBeforeAssessment: submissions
          .map((row) => ({
            submittedAt: row.submittedAt,
            assessedAt: assessmentBySubmission.get(row._id)?.createdAt,
          }))
          .filter((row) => row.submittedAt && row.assessedAt),
        assessmentBeforeCertificate: certificates
          .map((row) => ({
            assessedAt: assessmentBySubmission.get(row.assessmentId)?.createdAt,
            issuedAt: row.issuedAt,
          }))
          .filter((row) => row.assessedAt !== undefined),
        certificateBeforeWork: works
          .map((row) => ({
            issuedAt: row.certificateId
              ? certificateById.get(row.certificateId)?.issuedAt
              : undefined,
            workCreatedAt: row.createdAt,
          }))
          .filter((row) => row.issuedAt !== undefined),
        workBeforeOrder: orders
          .map((row) => ({
            workCreatedAt: row.workId
              ? workById.get(row.workId)?.createdAt
              : undefined,
            orderCreatedAt: row.createdAt,
          }))
          .filter((row) => row.workCreatedAt !== undefined),
        orderBeforePayment: orders
          .map((row) => ({
            orderPaidAt: row.paidAt,
            paymentPaidAt: paymentByOrder.get(row._id)?.paidAt,
          }))
          .filter((row) => row.orderPaidAt && row.paymentPaidAt),
        paymentBeforePayout: payments
          .map((row) => ({
            paymentPaidAt: row.paidAt,
            payoutPaidAt: payoutByOrder.get(row.orderId)?.paidAt,
          }))
          .filter((row) => row.paymentPaidAt && row.payoutPaidAt),
      }
    })

    for (const row of chains.enrollmentBeforeStudent) {
      expect(row.enrolledAt, "enrollment after account").toBeGreaterThanOrEqual(
        row.student as number,
      )
    }
    for (const row of chains.enrollmentBeforeSubmission) {
      expect(
        row.submittedAt as number,
        "submission after enrollment",
      ).toBeGreaterThanOrEqual(row.enrolledAt as number)
    }
    for (const row of chains.submissionBeforeAssessment) {
      expect(
        row.assessedAt as number,
        "assessment after submission",
      ).toBeGreaterThanOrEqual(row.submittedAt as number)
    }
    for (const row of chains.assessmentBeforeCertificate) {
      expect(
        row.issuedAt,
        "certificate after assessment",
      ).toBeGreaterThanOrEqual(row.assessedAt as number)
    }
    for (const row of chains.certificateBeforeWork) {
      expect(
        row.workCreatedAt,
        "work after certificate",
      ).toBeGreaterThanOrEqual(row.issuedAt as number)
    }
    for (const row of chains.workBeforeOrder) {
      expect(
        row.orderCreatedAt,
        "order after work",
      ).toBeGreaterThanOrEqual(row.workCreatedAt as number)
    }
    for (const row of chains.orderBeforePayment) {
      expect(
        row.paymentPaidAt as number,
        "payment after order",
      ).toBeGreaterThanOrEqual(row.orderPaidAt as number)
    }
    for (const row of chains.paymentBeforePayout) {
      expect(
        row.payoutPaidAt as number,
        "payout after payment",
      ).toBeGreaterThanOrEqual(row.paymentPaidAt as number)
    }
  })

  it("keeps delivery, certificate, and work-credit chronology honest", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const data = await t.run(async (ctx) => {
      const orders = await ctx.db.query("orders").collect()
      const payouts = await ctx.db.query("payouts").collect()
      const certificates = await ctx.db.query("certificates").collect()
      const works = await ctx.db.query("works").collect()
      const workCards = await ctx.db.query("workCards").collect()
      const enrollments = await ctx.db.query("enrollments").collect()
      const submissions = await ctx.db.query("submissions").collect()
      const assessments = await ctx.db.query("assessments").collect()
      const lessons = await ctx.db.query("lessons").collect()
      const mediaAssets = await ctx.db.query("mediaAssets").collect()
      const culturalSources = await ctx.db.query("culturalSources").collect()
      return {
        orders,
        payouts,
        certificates,
        works,
        workCards,
        enrollments,
        submissions,
        assessments,
        lessons,
        mediaAssets,
        culturalSources,
      }
    })

    for (const order of data.orders) {
      if (order.paidAt !== undefined && order.deliveredAt !== undefined) {
        expect(
          order.deliveredAt,
          `${order.code} delivered after payment`,
        ).toBeGreaterThanOrEqual(order.paidAt)
      }
      if (order.deliveredAt !== undefined && order.completedAt !== undefined) {
        expect(
          order.completedAt,
          `${order.code} completed after delivery`,
        ).toBeGreaterThanOrEqual(order.deliveredAt)
      }
      for (const stamp of [order.deliveredAt, order.completedAt]) {
        if (stamp !== undefined) expect(stamp).toBeLessThanOrEqual(NOW)
      }
    }

    const serials = data.certificates.map((row) => row.serial)
    expect(new Set(serials).size).toBe(serials.length)
    for (const certificate of data.certificates) {
      expect(certificate.serial).toMatch(/^KN-\d{4}-\d{4}$/)
      expect(certificate.publicCode).toBe(certificate.serial)
    }

    const certificateById = new Map(
      data.certificates.map((row) => [row._id as string, row]),
    )
    for (const work of data.works) {
      if (!work.certificateId) continue
      const certificate = certificateById.get(work.certificateId as string)
      expect(certificate?.snapshot.teacherName, `${work.slug} teacher`).toBe(
        work.teacher,
      )
    }

    const assessmentBySubmission = new Map(
      data.assessments.map((assessment) => [
        assessment.submissionId as string,
        assessment,
      ]),
    )
    const isFinalTask = (title: string) => /uji|akhir/i.test(title)
    const completedWithoutFinal = data.enrollments.filter(
      (enrollment) =>
        enrollment.status === "completed" &&
        !enrollment.certificateId &&
        !data.submissions.some(
          (submission) =>
            submission.enrollmentId === enrollment._id &&
            isFinalTask(submission.taskTitle) &&
            assessmentBySubmission.has(submission._id as string),
        ),
    )
    expect(completedWithoutFinal).toHaveLength(0)

    for (const payout of data.payouts) {
      if (payout.status !== "paid") continue
      expect(payout.paidAt, `${payout.reference} paidAt`).toBeDefined()
      expect(payout.paidAmount, `${payout.reference} paidAmount`).toBeDefined()
      if (payout.kind === "reversal") {
        expect(payout.paidAmount, `${payout.reference} reversal amount`).toBe(
          payout.teacherShare,
        )
      }
    }

    const assetById = new Map(
      data.mediaAssets.map((asset) => [asset._id as string, asset]),
    )
    for (const lesson of data.lessons) {
      if (!["video", "audio", "file"].includes(lesson.kind)) continue
      expect(
        lesson.mediaAssetIds.length,
        `${lesson.title} needs matching media`,
      ).toBeGreaterThan(0)
      for (const assetId of lesson.mediaAssetIds) {
        expect(assetById.get(assetId as string)?.kind, lesson.title).toBe(
          lesson.kind,
        )
      }
    }
    expect(
      data.mediaAssets.some(
        (asset) =>
          asset.filename === "lesson-soga-audio.mp3" ||
          asset.filename === "lesson-tari kreasi-video.mp4",
      ),
    ).toBe(false)

    const sourceByWork = new Map(
      data.culturalSources
        .filter((source) => source.workId)
        .map((source) => [source.workId as string, source]),
    )
    const sourceByPath = new Map(
      data.culturalSources
        .filter((source) => source.pathId)
        .map((source) => [source.pathId as string, source]),
    )
    for (const work of data.works) {
      const source =
        sourceByWork.get(work._id as string) ??
        (work.pathId ? sourceByPath.get(work.pathId) : undefined)
      if (/tercatat/i.test(work.permission ?? "")) {
        expect(
          source,
          `${work.slug} claims a recorded permission without a source`,
        ).toBeDefined()
        expect(
          source?.permissionStatus,
          `${work.slug} source permission`,
        ).toBe("granted")
      }
      const card = data.workCards.find((row) => row.workId === work._id)
      expect(card?.permission, `${work.slug} card permission`).toBe(
        work.permission,
      )
    }

    // An archive date follows the material it holds; a public reference is a
    // citation, never a grant, and carries its own URL.
    const materialDates: Record<string, number> = {
      "Materi Batik Giriloyo": Date.UTC(2022, 0, 1),
      "Batik Bambu, Inovasi Teknik Membatik pada Media Bambu": Date.UTC(
        2013,
        10,
        8,
      ),
      "Materi aksara Jawa dan tabel sandhangan": Date.UTC(2026, 10, 13),
    }
    for (const [sourceName, materialDate] of Object.entries(materialDates)) {
      const source = data.culturalSources.find(
        (row) => row.sourceName === sourceName,
      )
      expect(source, `${sourceName} source`).toBeDefined()
      expect(
        source?.permissionDate,
        `${sourceName} archive date`,
      ).toBeGreaterThanOrEqual(materialDate)
    }

    for (const sourceName of [
      "Batik Bambu, Inovasi Teknik Membatik pada Media Bambu",
      "Profil Desa Wisata Krebet",
    ]) {
      const source = data.culturalSources.find(
        (row) => row.sourceName === sourceName,
      )
      expect(source?.permissionStatus, `${sourceName} is a citation`).toBe(
        "public_reference",
      )
      expect(source?.permissionDocumentRef, `${sourceName} URL`).toMatch(
        /^https?:\/\//,
      )
      expect(source?.workId, `${sourceName} carries no work grant`).toBeUndefined()
    }

    const aksaraSource = data.culturalSources.find(
      (source) => source.pathId === "aksara-jawa",
    )
    expect(aksaraSource?.community).toBe("Arsip pengelola platform")
    expect(aksaraSource?.attribution).not.toContain("Sanggar Aksara")

    const giriloyoSource = data.culturalSources.find(
      (row) => row.sourceName === "Materi Batik Giriloyo",
    )
    expect(giriloyoSource?.pathId).toBe("batik-bambu")
    expect(giriloyoSource?.attribution).toContain("diadaptasi")
    expect(giriloyoSource?.attribution).toContain("hanya mencakup kain")
    expect(giriloyoSource?.attribution).not.toContain(
      "tidak dipraktikkan sebagai kampung batik bambu",
    )

    const order13 = data.orders.find(
      (order) => order.idempotencyKey === "seed-idem-order-13",
    )
    const payout13 = data.payouts.find(
      (payout) => payout.orderId === order13?._id,
    )
    expect(payout13?.status).toBe("approved")
    expect(payout13?.paidAt).toBeUndefined()

    const order5 = data.orders.find(
      (order) => order.idempotencyKey === "seed-idem-order-5",
    )
    expect(
      data.payouts.some(
        (payout) => payout.orderId === order5?._id && payout.kind === "reversal",
      ),
    ).toBe(true)

    // The public evidence series in DESIGN.md must match the seeded tables.
    // Growth batches add active participants, so the count is derived from the
    // enrollments read above instead of being pinned to the original cohort.
    const participants = new Set(
      data.enrollments
        .filter(
          (enrollment) =>
            enrollment.status === "active" ||
            enrollment.status === "completed",
        )
        .map((enrollment) => enrollment.studentId as string),
    ).size
    const assessedSubmissions = data.submissions.filter((submission) =>
      ["approved", "revision_requested", "rejected"].includes(
        submission.status,
      ),
    ).length
    const stats = await t.query(api.content.getPublicStats, {})
    expect(stats).toEqual({
      fields: 10,
      teachers: 5,
      participants,
      submissions: assessedSubmissions,
      works: 6,
    })
  })

  it("derives daily metrics from seeded events", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const data = await t.run(async (ctx) => {
      const metrics = await ctx.db.query("dailyMetrics").collect()
      const orders = await ctx.db.query("orders").collect()
      const definitions = await ctx.db.query("metricDefinitions").collect()
      return { metrics, orders, definitions }
    })

    const dates = new Set(data.metrics.map((row) => row.date))
    expect(dates.size).toBeGreaterThan(300)

    const gmvTotal = data.metrics
      .filter((row) => row.metricKey === "gmv")
      .reduce((total, row) => total + row.value, 0)
    const orderTotal = data.orders
      .filter((order) => order.paidAt !== undefined)
      .reduce((total, order) => total + order.baseAmount, 0)
    expect(gmvTotal).toBeCloseTo(orderTotal, 0)

    const gmvSeries = data.metrics.filter((row) => row.metricKey === "gmv")
    expect(gmvSeries.some((row) => row.value > 0)).toBe(true)
    expect(gmvSeries.some((row) => row.value === 0)).toBe(true)

    const sla = data.metrics.filter(
      (row) => row.metricKey === "assessment_sla_p50" && row.value > 0,
    )
    expect(sla.length).toBeGreaterThan(0)

    for (const row of data.metrics) {
      if (
        row.metricKey === "gmv" ||
        row.metricKey === "net_revenue" ||
        row.metricKey === "payout_due" ||
        // A teacher can carry more than one live cohort, so this count is not
        // bounded by 1 the way a share metric is.
        row.metricKey === "teacher_load" ||
        row.metricKey === "assessment_sla_p50" ||
        row.metricKey === "assessment_sla_p90" ||
        row.metricKey === "support_first_response_p50" ||
        row.metricKey === "support_first_response_p90" ||
        row.metricKey === "content_freshness"
      ) {
        continue
      }
      expect(row.value, row.metricKey).toBeGreaterThanOrEqual(0)
      expect(row.value, row.metricKey).toBeLessThanOrEqual(1)
    }

    const keys = new Set(data.metrics.map((row) => row.metricKey))
    for (const definition of data.definitions) {
      expect(keys.has(definition.key), definition.key).toBe(true)
    }
  })

  it("spreads domain activity from January 2026 to the present", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const ranges = await t.run(async (ctx) => {
      const collect = async (table: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await ctx.db.query(table as any).collect()
      const tables = [
        "submissions",
        "assessments",
        "certificates",
        "orders",
        "payments",
        "payouts",
        "messages",
        "leads",
        "supportTickets",
        "culturalSources",
        "auditLogs",
        "cohorts",
        "pathModules",
        "lessons",
        "works",
      ]
      const result: Record<string, ReturnType<typeof timestampRange>> = {}
      for (const table of tables) {
        const docs = (await collect(table)) as Array<{ createdAt?: number }>
        result[table] = timestampRange(docs.map((doc) => doc.createdAt))
      }
      return result
    })

    for (const [table, range] of Object.entries(ranges)) {
      expect(range.count, `${table} should not be empty`).toBeGreaterThan(0)
      expect(range.min, `${table} starts before opening`).toBeGreaterThanOrEqual(
        SEED_START - DAY,
      )
      expect(range.max, `${table} is dated in the future`).toBeLessThanOrEqual(
        NOW + 2 * DAY,
      )
    }

    const startOfMarch = Date.UTC(2026, 2, 1)
    const startOfApril = Date.UTC(2026, 3, 1)
    const sixtyDaysAgo = NOW - 60 * DAY
    const ninetyDaysAgo = NOW - 90 * DAY
    const sevenDaysAgo = NOW - 7 * DAY

    expect(ranges.submissions.min).toBeLessThan(startOfMarch)
    expect(ranges.submissions.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.orders.min).toBeLessThan(startOfApril)
    expect(ranges.orders.max).toBeGreaterThan(sixtyDaysAgo)
    expect(ranges.messages.min).toBeLessThan(startOfMarch)
    expect(ranges.messages.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.leads.min).toBeLessThan(startOfMarch)
    expect(ranges.leads.max).toBeGreaterThan(sevenDaysAgo)
    expect(ranges.auditLogs.min).toBeLessThanOrEqual(SEED_START + DAY)
    expect(ranges.auditLogs.max).toBeGreaterThan(ninetyDaysAgo)
    expect(ranges.certificates.max).toBeGreaterThan(ninetyDaysAgo)
  })

  it("opens Batik Bambu and leaves Batik Tulis honestly preparing", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const data = await t.run(async (ctx) => {
      const paths = await ctx.db.query("paths").collect()
      const modules = await ctx.db.query("pathModules").collect()
      const lessons = await ctx.db.query("lessons").collect()
      return { paths, modules, lessons }
    })

    const bamboo = data.paths.find((path) => path.slug === "batik-bambu")
    expect(bamboo, "Batik Bambu path").toBeDefined()
    expect(bamboo?.order).toBe(0)
    expect(bamboo?.status).toBe("open")
    expect(bamboo?.comingSoon).not.toBe(true)

    const bambooModules = data.modules.filter(
      (module) => module.pathId === "batik-bambu",
    )
    expect(bambooModules).toHaveLength(6)
    expect(bambooModules.every((module) => module.status === "published")).toBe(
      true,
    )
    const bambooLessons = data.lessons.filter(
      (lesson) => lesson.pathId === "batik-bambu",
    )
    expect(bambooLessons.length).toBeGreaterThan(0)
    expect(bambooLessons.some((lesson) => lesson.accessLevel === "public")).toBe(
      true,
    )
    for (const lesson of bambooLessons) {
      expect(lesson.body.toLowerCase(), lesson.title).not.toContain(
        "tujuh langkah",
      )
      expect(lesson.title.toLowerCase(), lesson.title).not.toContain("nerusi")
    }
    const exam = bambooLessons.find((lesson) =>
      lesson.title.startsWith("Ujian akhir"),
    )
    expect(exam?.body).toContain("nembok")
    expect(exam?.body).not.toContain("nerusi")
    for (const step of [
      "pilih bambu",
      "rebus",
      "keringkan",
      "amplas",
      "pola",
      "nglowongi",
      "ngisen-isen",
      "mbabar",
      "nembok",
      "warna dasar",
      "nglorod",
      "mepe",
      "finishing",
      "periksa",
    ]) {
      expect(exam?.body.toLowerCase(), step).toContain(step)
    }

    const aksaraLessons = data.lessons.filter(
      (lesson) => lesson.pathId === "aksara-jawa",
    )
    expect(
      aksaraLessons.some((lesson) => lesson.title === "Lembar uji aksara"),
    ).toBe(true)
    const paragraph = aksaraLessons.find((lesson) =>
      lesson.title.startsWith("Membaca paragraf"),
    )
    expect(paragraph?.body).toContain("ꦩꦶꦤꦁꦏ")
    expect(paragraph?.body).toContain("ꦩꦸꦣꦤ꧀ꦢꦸꦮꦺꦤꦶ")
    expect(paragraph?.body).toContain("ꦩꦚ꧀ꦕ")
    expect(paragraph?.body).toContain("ꦏꦼꦱꦺꦤꦶꦪꦤ꧀")
    expect(paragraph?.body).toContain("Erratum")
    for (const wrong of ["ꦩꦶꦤꦺꦴꦁꦏ", "ꦩꦺꦴꦚꦕ", "ꦏꦼꦱꦼꦤꦶꦪꦤ꧀"]) {
      // The misspelling survives only inside the erratum that names it.
      expect(paragraph?.body.indexOf(wrong)).toBeGreaterThan(
        paragraph?.body.indexOf("Erratum") ?? -1,
      )
    }

    const tulis = data.paths.find((path) => path.slug === "batik-tulis-soga")
    expect(tulis, "Batik Tulis path").toBeDefined()
    expect(tulis?.title).toBe("Batik Tulis")
    expect(tulis?.comingSoon).toBe(true)
    expect(tulis?.status).toBe("planned")
    expect(
      data.modules.filter((module) => module.pathId === "batik-tulis-soga"),
    ).toHaveLength(0)
    expect(
      data.lessons.filter((lesson) => lesson.pathId === "batik-tulis-soga"),
    ).toHaveLength(0)

    const preparingPublic = await t.query(api.content.getPublicPath, {
      slug: "batik-tulis-soga",
    })
    expect(preparingPublic?.comingSoon).toBe(true)
    expect(preparingPublic?.curriculum).toHaveLength(0)
    expect(preparingPublic?.lessons).toBe(0)
  })

  it("opens Tari Kreasi and Kuliner Nusantara with verified teachers", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const data = await t.run(async (ctx) => {
      const paths = await ctx.db.query("paths").collect()
      const modules = await ctx.db.query("pathModules").collect()
      const lessons = await ctx.db.query("lessons").collect()
      const teachers = await ctx.db.query("teachers").collect()
      return { paths, modules, lessons, teachers }
    })

    for (const slug of ["tari-kreasi", "kuliner-nusantara"]) {
      const path = data.paths.find((row) => row.slug === slug)
      expect(path, `${slug} path`).toBeDefined()
      expect(path?.status).toBe("open")
      expect(path?.comingSoon).not.toBe(true)
      expect(path?.price).toBeGreaterThan(0)
      expect(path?.weeks).toBe(5)
      expect(path?.tasks).toBe(5)

      const modules = data.modules.filter((row) => row.pathId === slug)
      expect(modules.length, `${slug} modules`).toBeGreaterThanOrEqual(5)
      expect(modules.length, `${slug} modules`).toBeLessThanOrEqual(6)
      expect(
        modules.every((module) => module.status === "published"),
        `${slug} published modules`,
      ).toBe(true)

      const lessons = data.lessons
        .filter((row) => row.pathId === slug)
        .sort((a, b) => {
          const moduleA = modules.find((m) => m._id === a.moduleId)?.order ?? 0
          const moduleB = modules.find((m) => m._id === b.moduleId)?.order ?? 0
          return moduleA === moduleB ? a.order - b.order : moduleA - moduleB
        })
      expect(lessons.length, `${slug} lessons`).toBeGreaterThanOrEqual(25)
      expect(lessons.length, `${slug} lessons`).toBeLessThanOrEqual(30)
      expect(
        lessons.every((lesson) => lesson.status === "published"),
        `${slug} published lessons`,
      ).toBe(true)
      expect(
        lessons.every((lesson) =>
          ["public", "enrolled", "certified"].includes(lesson.accessLevel),
        ),
        `${slug} access levels`,
      ).toBe(true)
      expect(
        lessons.some((lesson) => lesson.accessLevel === "public"),
        `${slug} public teaser`,
      ).toBe(true)
      expect(
        lessons.some((lesson) => lesson.accessLevel === "certified"),
        `${slug} certified lesson`,
      ).toBe(true)

      for (const mod of modules) {
        const orders = data.lessons
          .filter((lesson) => lesson.moduleId === mod._id)
          .map((lesson) => lesson.order)
          .sort((a, b) => a - b)
        expect(orders, `${slug} module ${mod.order} lesson order`).toEqual(
          Array.from({ length: orders.length }, (_, index) => index + 1),
        )
      }

      const teacher = data.teachers.find((row) =>
        (row.pathIds ?? []).includes(slug),
      )
      expect(teacher, `${slug} teacher`).toBeDefined()
      expect(teacher?.verified).toBe(true)
      expect(teacher?.verificationStatus).toBe("verified")
      expect(teacher?.published).toBe(true)
      expect(teacher?.status).toBe("active")
      expect(teacher?.experience).toMatch(/tahun/)
    }
  })

  it("turns every batik work into a bamboo product", async () => {
    const t = createTestDb()
    await seedWorkspace(t)

    const works = await t.run(async (ctx) =>
      await ctx.db.query("works").collect(),
    )
    const batikWorks = works.filter((work) => work.category === "batik")
    expect(batikWorks).toHaveLength(3)
    for (const work of batikWorks) {
      expect(work.pathId, work.slug).toBe("batik-bambu")
      expect(work.title.toLowerCase(), work.slug).toContain("bambu")
      expect(work.teacher, work.slug).toBe("Sri Sriningsih")
    }
    const titles = works.map((work) => work.title)
    expect(titles).not.toContain("Kain Batik Soga Anyaman")
    expect(titles).not.toContain("Batik Tulis Lereng Soga")
  })
})
