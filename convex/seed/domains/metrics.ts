import { v } from "convex/values"

import { netRevenue } from "../../../lib/commerce/money"
import { internalMutation } from "../../_generated/server"
import {
  createSeedClock,
  DAY,
  HOUR,
  jakartaDate,
  jakartaDayStart,
  SEED_START,
} from "../lib/clock"

const METRIC_DEFINITIONS = [
  {
    key: "lead_conversion",
    label: "Konversi lead",
    definition: "Lead yang selesai dibagi lead yang terkualifikasi pada periode.",
    formula: "converted ÷ qualified",
    owner: "Tim pemasaran",
  },
  {
    key: "enrollment_activation",
    label: "Aktivasi pendaftaran",
    definition: "Pendaftaran aktif dibagi pendaftaran yang dibuat pada periode.",
    formula: "paid enrollments ÷ created enrollments",
    owner: "Tim operasi",
  },
  {
    key: "completion",
    label: "Penyelesaian",
    definition: "Pendaftaran selesai dibagi pendaftaran aktif dan selesai.",
    formula: "completed ÷ active enrollments",
    owner: "Tim belajar",
  },
  {
    key: "submission_rate",
    label: "Tingkat pengiriman tugas",
    definition: "Tugas terkirim dibagi tugas yang diharapkan dari pendaftaran periode.",
    formula: "submitted tasks ÷ expected tasks",
    owner: "Tim belajar",
  },
  {
    key: "assessment_sla_p50",
    label: "SLA penilaian p50",
    definition: "Median jam dari kirim tugas sampai umpan balik pertama.",
    formula: "p50(first feedback − submitted)",
    owner: "Tim pengajar",
  },
  {
    key: "assessment_sla_p90",
    label: "SLA penilaian p90",
    definition: "Persentil 90 jam dari kirim tugas sampai umpan balik pertama.",
    formula: "p90(first feedback − submitted)",
    owner: "Tim pengajar",
  },
  {
    key: "pass_rate",
    label: "Tingkat kelulusan",
    definition: "Tugas disetujui dibagi tugas yang sudah dinilai.",
    formula: "approved ÷ assessed",
    owner: "Tim pengajar",
  },
  {
    key: "certificate_issuance",
    label: "Penerbitan sertifikat",
    definition: "Sertifikat terbit dibagi tugas yang disetujui pada periode.",
    formula: "issued certificates ÷ approved assessments",
    owner: "Tim kredensial",
  },
  {
    key: "seller_activation",
    label: "Aktivasi penjual",
    definition: "Sertifikat dengan karya terbit dalam 30 hari dibagi sertifikat terbit.",
    formula: "first published listing ≤ 30 days ÷ issued certificates",
    owner: "Tim commerce",
  },
  {
    key: "gmv",
    label: "GMV",
    definition: "Nilai bruto pesanan berbayar sebelum refund.",
    formula: "sum(paid order baseAmount)",
    owner: "Tim commerce",
  },
  {
    key: "net_revenue",
    label: "Pendapatan bersih",
    definition: "GMV dikurangi refund dan biaya gerbang pembayaran.",
    formula: "GMV − refunds − gateway fees",
    owner: "Tim keuangan",
  },
  {
    key: "payout_due",
    label: "Payout jatuh tempo",
    definition: "Payout yang sudah disetujui tetapi belum dibayar.",
    formula: "sum(approved payouts gross)",
    owner: "Tim keuangan",
  },
  {
    key: "teacher_load",
    label: "Beban pengajar",
    definition: "Rata-rata peserta aktif per pengajar di kohort aktif.",
    formula: "active students ÷ active cohorts",
    owner: "Tim pengajar",
  },
  {
    key: "cohort_fill",
    label: "Keterisian kohort",
    definition: "Peserta aktif dibagi kapasitas kohort.",
    formula: "active enrolled ÷ capacity",
    owner: "Tim operasi",
  },
  {
    key: "support_first_response_p50",
    label: "Respons dukungan p50",
    definition: "Median menit dari tiket dibuat sampai balasan pertama.",
    formula: "p50(first reply − created)",
    owner: "Tim dukungan",
  },
  {
    key: "support_first_response_p90",
    label: "Respons dukungan p90",
    definition: "Persentil 90 menit dari tiket dibuat sampai balasan pertama.",
    formula: "p90(first reply − created)",
    owner: "Tim dukungan",
  },
  {
    key: "gateway_success",
    label: "Keberhasilan gateway",
    definition: "Pembayaran berhasil dibagi pembayaran yang dibuat.",
    formula: "paid payments ÷ created payments",
    owner: "Tim keuangan",
  },
  {
    key: "content_freshness",
    label: "Kesegaran konten",
    definition: "Hari sejak konten landing terakhir diperbarui.",
    formula: "now − siteContent.updatedAt",
    owner: "Tim konten",
  },
]

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(fraction * sorted.length) - 1),
  )
  return sorted[index]
}

function ratio(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return numerator / denominator
}

export const seedMetricDefinitions = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    for (const definition of METRIC_DEFINITIONS) {
      await ctx.db.insert("metricDefinitions", {
        key: definition.key,
        label: definition.label,
        definition: definition.definition,
        formula: definition.formula,
        owner: definition.owner,
        version: 1,
        active: true,
        updatedAt: clock.now,
      })
    }
    return { definitions: METRIC_DEFINITIONS.length }
  },
})

/**
 * Writes one slice of the daily metric history.
 *
 * The tables are read once for the slice, then folded into day-keyed maps and
 * sorted event streams. Each day is a window query over those streams instead
 * of fifteen full-table scans, so a 15-day slice stays inside the mutation
 * budget while preserving the exact values the 30-day version produced.
 */
export const seedMetrics = internalMutation({
  args: { start: v.number(), end: v.number(), now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const [
      leads,
      enrollments,
      submissions,
      assessments,
      certificates,
      works,
      orders,
      payments,
      payouts,
      tickets,
      cohorts,
      teacherRows,
      contentRows,
      refundRows,
      ledgerRows,
    ] = await Promise.all([
      ctx.db.query("leads").collect(),
      ctx.db.query("enrollments").collect(),
      ctx.db.query("submissions").collect(),
      ctx.db.query("assessments").collect(),
      ctx.db.query("certificates").collect(),
      ctx.db.query("works").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("payments").collect(),
      ctx.db.query("payouts").collect(),
      ctx.db.query("supportTickets").collect(),
      ctx.db.query("cohorts").collect(),
      ctx.db.query("teachers").collect(),
      ctx.db.query("siteContent").collect(),
      ctx.db.query("refunds").collect(),
      ctx.db.query("ledgerEntries").collect(),
    ])

    const submissionById = new Map(
      submissions.map((submission) => [submission._id as string, submission]),
    )
    const siteUpdatedAt = contentRows.reduce(
      (latest, row) => Math.max(latest, row.updatedAt),
      SEED_START,
    )
    const teacherCount = Math.max(1, teacherRows.length)
    const activeEnrollmentStatuses = new Set(["active", "completed"])
    const settledPaymentStatuses = new Set(["paid", "refunded"])
    const unpaidPayoutStatuses = new Set([
      "pending",
      "approved",
      "held",
      "processing",
    ])
    const activeEnrollments = enrollments.filter((row) =>
      row.status === "active",
    )

    const days: number[] = []
    for (
      let dayStart = jakartaDayStart(Math.max(SEED_START, args.start));
      dayStart < args.end && dayStart <= clock.now;
      dayStart += DAY
    ) {
      days.push(dayStart)
    }

    const upperBound = <T>(
      rows: T[],
      value: number,
      key: (row: T) => number,
    ): number => {
      let low = 0
      let high = rows.length
      while (low < high) {
        const mid = Math.floor((low + high) / 2)
        if (key(rows[mid] as T) <= value) low = mid + 1
        else high = mid
      }
      return low
    }
    const window = <T>(
      rows: T[],
      fromExclusive: number,
      toInclusive: number,
      key: (row: T) => number,
    ): T[] =>
      rows.slice(
        upperBound(rows, fromExclusive, key),
        upperBound(rows, toInclusive, key),
      )

    // Daily sums are bucketed once, not re-scanned for every day.
    const addToDay = (map: Map<number, number>, at: number, value: number) => {
      const key = jakartaDayStart(at)
      map.set(key, (map.get(key) ?? 0) + value)
    }
    const gmvByDay = new Map<number, number>()
    for (const order of orders) {
      if (order.paidAt !== undefined) {
        addToDay(gmvByDay, order.paidAt, order.baseAmount)
      }
    }
    const refundsByDay = new Map<number, number>()
    for (const refund of refundRows) {
      if (!["approved", "paid"].includes(refund.status)) continue
      addToDay(refundsByDay, refund.createdAt, refund.amount)
    }
    const feesByDay = new Map<number, number>()
    for (const entry of ledgerRows) {
      if (entry.account !== "gateway_fee") continue
      addToDay(feesByDay, entry.createdAt, entry.amount)
    }

    const leadEvents = leads
      .map((lead) => ({
        at: lead.createdAt,
        converted: lead.status === "converted",
        qualified: ["qualified", "converted"].includes(lead.status),
      }))
      .sort((a, b) => a.at - b.at)
    const enrollmentEvents = enrollments
      .map((row) => ({
        at: row.createdAt,
        active: activeEnrollmentStatuses.has(row.status),
        completedAt: row.completedAt,
      }))
      .sort((a, b) => a.at - b.at)
    const submissionEvents = submissions
      .filter((row) => row.submittedAt !== undefined)
      .map((row) => ({ at: row.submittedAt as number }))
      .sort((a, b) => a.at - b.at)
    const gradedEvents = assessments
      .filter((row) => row.status === "completed")
      .map((assessment) => {
        const submission = submissionById.get(
          assessment.submissionId as string,
        )
        const sla =
          submission?.submittedAt !== undefined
            ? (assessment.createdAt - submission.submittedAt) / HOUR
            : undefined
        return {
          at: assessment.createdAt,
          score: assessment.score ?? 0,
          pass:
            (assessment.score ?? 0) >= 75 ||
            submission?.status === "approved",
          sla,
        }
      })
      .sort((a, b) => a.at - b.at)
    const workTimesByCertificate = new Map<string, number[]>()
    for (const work of works) {
      if (!work.certificateId || work.createdAt === undefined) continue
      const key = work.certificateId as string
      const times = workTimesByCertificate.get(key) ?? []
      times.push(work.createdAt)
      workTimesByCertificate.set(key, times)
    }
    const certificateEvents = certificates
      .map((certificate) => {
        const workAt = (workTimesByCertificate.get(certificate._id as string) ?? [])
          .filter(
            (createdAt) =>
              createdAt >= certificate.issuedAt &&
              createdAt <= certificate.issuedAt + 30 * DAY,
          )
          .sort((a, b) => a - b)[0]
        return { at: certificate.issuedAt, workAt }
      })
      .sort((a, b) => a.at - b.at)
    const paymentEvents = payments
      .map((row) => ({
        at: row.createdAt,
        settled: settledPaymentStatuses.has(row.status),
      }))
      .sort((a, b) => a.at - b.at)
    const ticketEvents = tickets
      .filter((row) => row.firstResponseAt !== undefined)
      .map((row) => ({
        at: row.createdAt,
        minutes: ((row.firstResponseAt as number) - row.createdAt) / 60_000,
      }))
      .sort((a, b) => a.at - b.at)
    const payoutActivations = payouts
      .filter(
        (payout) =>
          payout.status !== "paid" &&
          unpaidPayoutStatuses.has(payout.status) &&
          payout.dueAt !== undefined,
      )
      .map((payout) => ({
        at: Math.max(payout.createdAt, payout.dueAt as number),
        share: payout.teacherShare,
      }))
      .sort((a, b) => a.at - b.at)
    const payoutPrefix: number[] = []
    for (const payout of payoutActivations) {
      payoutPrefix.push(
        (payoutPrefix[payoutPrefix.length - 1] ?? 0) + payout.share,
      )
    }
    const payoutDueAt = (ref: number): number => {
      const index = upperBound(payoutActivations, ref, (row) => row.at)
      return payoutPrefix[index - 1] ?? 0
    }

    const valuesByDate = new Map<string, Record<string, number>>()
    for (const dayStart of days) {
      const dayEnd = dayStart + DAY
      const ref = Math.min(clock.now, dayEnd)

      const leads30 = window(leadEvents, ref - 30 * DAY, ref, (row) => row.at)
      const enrollments30 = window(
        enrollmentEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )
      const enrollments90 = window(
        enrollmentEvents,
        ref - 90 * DAY,
        ref,
        (row) => row.at,
      )
      const submissions30 = window(
        submissionEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )
      const graded30 = window(
        gradedEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )
      const graded90 = window(
        gradedEvents,
        ref - 90 * DAY,
        ref,
        (row) => row.at,
      )
      const certificates30 = window(
        certificateEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )
      const certificates90 = window(
        certificateEvents,
        ref - 90 * DAY,
        ref,
        (row) => row.at,
      )
      const payments30 = window(
        paymentEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )
      const tickets30 = window(
        ticketEvents,
        ref - 30 * DAY,
        ref,
        (row) => row.at,
      )

      const slaHours = graded30
        .map((assessment) => assessment.sla)
        .filter((value): value is number => value !== undefined)
      const responseMinutes = tickets30.map((ticket) => ticket.minutes)

      const gmvToday = gmvByDay.get(dayStart) ?? 0
      const refundsToday = refundsByDay.get(dayStart) ?? 0
      const feesToday = feesByDay.get(dayStart) ?? 0
      const netRevenueToday = netRevenue({
        gross: gmvToday,
        refunds: refundsToday,
        gatewayFees: feesToday,
      })

      const liveCohorts = cohorts.filter(
        (cohort) => cohort.startDate <= ref && cohort.endDate >= ref,
      )
      const cohortCapacity = liveCohorts.reduce(
        (total, cohort) => total + cohort.capacity,
        0,
      )
      const liveCohortIds = new Set(
        liveCohorts.map((cohort) => cohort._id as string),
      )
      const cohortEnrollments = enrollments.filter(
        (row) =>
          activeEnrollmentStatuses.has(row.status) &&
          row.cohortId !== undefined &&
          liveCohortIds.has(row.cohortId as string),
      )

      const approvedAssessments90 = graded90.filter(
        (assessment) => assessment.score >= 75,
      )
      const certificatesWithWork = certificates30.filter(
        (certificate) =>
          certificate.workAt !== undefined && certificate.workAt <= ref,
      )

      valuesByDate.set(jakartaDate(dayStart), {
        lead_conversion: ratio(
          leads30.filter((lead) => lead.converted).length,
          leads30.filter((lead) => lead.qualified).length,
        ),
        enrollment_activation: ratio(
          enrollments30.filter((row) => row.active).length,
          enrollments30.length,
        ),
        completion: ratio(
          enrollments90.filter(
            (row) =>
              row.completedAt !== undefined &&
              row.completedAt > ref - 30 * DAY &&
              row.completedAt <= ref,
          ).length,
          enrollments90.length,
        ),
        submission_rate: Math.min(
          1,
          ratio(submissions30.length, Math.max(1, activeEnrollments.length)),
        ),
        assessment_sla_p50: quantile(slaHours, 0.5),
        assessment_sla_p90: quantile(slaHours, 0.9),
        pass_rate: ratio(
          graded30.filter((assessment) => assessment.pass).length,
          graded30.length,
        ),
        certificate_issuance: Math.min(
          1,
          ratio(
            certificates90.length,
            Math.max(1, approvedAssessments90.length),
          ),
        ),
        seller_activation: ratio(
          certificatesWithWork.length,
          Math.max(1, certificates30.length),
        ),
        gmv: gmvToday,
        net_revenue: netRevenueToday,
        payout_due: payoutDueAt(ref),
        teacher_load: ratio(liveCohorts.length, teacherCount),
        cohort_fill: ratio(cohortEnrollments.length, cohortCapacity),
        support_first_response_p50: quantile(responseMinutes, 0.5),
        support_first_response_p90: quantile(responseMinutes, 0.9),
        gateway_success: ratio(
          payments30.filter((payment) => payment.settled).length,
          Math.max(1, payments30.length),
        ),
        content_freshness: Math.max(
          0,
          Math.floor((ref - siteUpdatedAt) / DAY),
        ),
      })
    }

    for (const dayStart of days) {
      const values = valuesByDate.get(jakartaDate(dayStart)) ?? {}
      for (const definition of METRIC_DEFINITIONS) {
        await ctx.db.insert("dailyMetrics", {
          date: jakartaDate(dayStart),
          metricKey: definition.key,
          value: Math.round((values[definition.key] ?? 0) * 100) / 100,
          computedAt: Math.min(clock.now, dayStart + DAY - 1),
        })
      }
    }

    return { days: days.length }
  },
})

