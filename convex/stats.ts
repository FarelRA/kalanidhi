import { v } from "convex/values"

import type {
  AdminOverview,
  FunnelStep,
  MetricResult,
  MetricsReport,
  OverviewQueueItem,
} from "../lib/admin/types"
import { now, requireAdmin, requireReason } from "./admin_context"
import { appendAudit } from "./audit"
import type { Doc } from "./_generated/dataModel"
import { mutation, query, type QueryCtx } from "./_generated/server"

const DAY_MS = 86_400_000
const PRODUCT_OFFSET_MS = 7 * 60 * 60 * 1_000

type Range = { from: number; to: number }

function resolveRange(from?: number, to?: number): Range {
  const end = to ?? now()
  const start = from ?? end - 30 * DAY_MS
  return { from: Math.min(start, end), to: Math.max(start, end) }
}

function previousRange(range: Range): Range {
  const length = range.to - range.from
  return { from: range.from - length, to: range.from }
}

function inRange(timestamp: number | undefined, range: Range): boolean {
  if (timestamp === undefined) return false
  return timestamp >= range.from && timestamp <= range.to
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  )
  return sorted[index]
}

function metric(input: {
  key: string
  label: string
  definition: string
  formula: string
  owner?: string
  unit: MetricResult["unit"]
  value: number | null
  previous?: number | null
  numerator?: number | null
  denominator?: number | null
  emptyReason?: string
}): MetricResult {
  return {
    key: input.key,
    label: input.label,
    definition: input.definition,
    formula: input.formula,
    owner: input.owner ?? "admin",
    unit: input.unit,
    value: input.value,
    previous: input.previous ?? null,
    numerator: input.numerator ?? null,
    denominator: input.denominator ?? null,
    emptyReason: input.value === null ? (input.emptyReason ?? "Belum ada data pada periode ini.") : null,
  }
}

type Data = {
  leads: Doc<"leads">[]
  enrollments: Doc<"enrollments">[]
  submissions: Doc<"submissions">[]
  assessments: Doc<"assessments">[]
  certificates: Doc<"certificates">[]
  orders: Doc<"orders">[]
  refunds: Doc<"refunds">[]
  ledger: Doc<"ledgerEntries">[]
  payouts: Doc<"payouts">[]
  works: Doc<"works">[]
  cohorts: Doc<"cohorts">[]
  payments: Doc<"payments">[]
  supportTickets: Doc<"supportTickets">[]
  supportMessages: Doc<"supportMessages">[]
  paths: Doc<"paths">[]
  site: Doc<"siteContent"> | null
  drafts: Doc<"contentRevisions">[]
  teachers: Doc<"teachers">[]
  audits: Doc<"auditLogs">[]
  integrations: Doc<"integrationHealth">[]
  messages: Doc<"messages">[]
  conversations: Doc<"conversations">[]
  callSessions: Doc<"callSessions">[]
  disputes: Doc<"disputes">[]
}

async function loadData(ctx: QueryCtx): Promise<Data> {
  const [
    leads,
    enrollments,
    submissions,
    assessments,
    certificates,
    orders,
    refunds,
    ledger,
    payouts,
    works,
    cohorts,
    payments,
    supportTickets,
    supportMessages,
    paths,
    site,
    drafts,
    teachers,
    audits,
    integrations,
    messages,
    conversations,
    callSessions,
    disputes,
  ] = await Promise.all([
    ctx.db.query("leads").collect(),
    ctx.db.query("enrollments").collect(),
    ctx.db.query("submissions").collect(),
    ctx.db.query("assessments").collect(),
    ctx.db.query("certificates").collect(),
    ctx.db.query("orders").collect(),
    ctx.db.query("refunds").collect(),
    ctx.db.query("ledgerEntries").collect(),
    ctx.db.query("payouts").collect(),
    ctx.db.query("works").collect(),
    ctx.db.query("cohorts").collect(),
    ctx.db.query("payments").collect(),
    ctx.db.query("supportTickets").collect(),
    ctx.db.query("supportMessages").collect(),
    ctx.db.query("paths").collect(),
    ctx.db
      .query("siteContent")
      .withIndex("by_key", (q) => q.eq("key", "site"))
      .unique(),
    ctx.db.query("contentRevisions").collect(),
    ctx.db.query("teachers").collect(),
    ctx.db.query("auditLogs").withIndex("by_createdAt").order("desc").take(50),
    ctx.db.query("integrationHealth").collect(),
    ctx.db.query("messages").collect(),
    ctx.db.query("conversations").collect(),
    ctx.db.query("callSessions").collect(),
    ctx.db.query("disputes").collect(),
  ])
  return {
    leads,
    enrollments,
    submissions,
    assessments,
    certificates,
    orders,
    refunds,
    ledger,
    payouts,
    works,
    cohorts,
    payments,
    supportTickets,
    supportMessages,
    paths,
    site,
    drafts,
    teachers,
    audits,
    integrations,
    messages,
    conversations,
    callSessions,
    disputes,
  }
}

type MetricSet = {
  leadConversion: { numerator: number; denominator: number }
  enrollmentActivation: { numerator: number; denominator: number }
  completion: { numerator: number; denominator: number }
  submissionRate: { numerator: number; denominator: number }
  assessmentSla: { p50: number | null; p90: number | null }
  passRate: { numerator: number; denominator: number }
  certificateIssuance: { numerator: number; denominator: number }
  sellerActivation: { numerator: number; denominator: number }
  gmv: number | null
  netRevenue: number | null
  payoutDue: number | null
  teacherLoad: number | null
  cohortFill: number | null
  supportResponse: { p50: number | null; p90: number | null }
  gatewaySuccess: { numerator: number; denominator: number }
}

const PAID_ORDER_STATUSES = new Set([
  "paid",
  "in_progress",
  "delivered",
  "completed",
])

function computeSet(data: Data, range: Range): MetricSet {
  const rangeLeads = data.leads.filter((lead) => inRange(lead.createdAt, range))
  const qualified = rangeLeads.filter((lead) =>
    ["qualified", "converted"].includes(lead.status),
  ).length
  const converted = rangeLeads.filter((lead) => lead.status === "converted").length

  const createdEnrollments = data.enrollments.filter((enrollment) =>
    inRange(enrollment.enrolledAt, range),
  )
  const activatedEnrollments = createdEnrollments.filter((enrollment) =>
    ["active", "completed"].includes(enrollment.status),
  ).length

  const currentEnrollments = data.enrollments.filter((enrollment) =>
    ["active", "completed"].includes(enrollment.status),
  )
  const completed = data.enrollments.filter(
    (enrollment) => enrollment.status === "completed",
  ).length

  const rangeSubmissions = data.submissions.filter((submission) =>
    inRange(submission.submittedAt, range),
  )
  const submitted = rangeSubmissions.filter(
    (submission) => submission.status !== "draft",
  ).length

  const pathTasks = new Map(
    data.paths.map((path) => [path.slug, path.tasks] as const),
  )
  const expectedTasks = createdEnrollments.reduce(
    (total, enrollment) => total + (pathTasks.get(enrollment.pathId) ?? 0),
    0,
  )

  const assessmentIds = new Set(rangeSubmissions.map((submission) => submission._id))
  const rangeAssessments = data.assessments.filter((assessment) =>
    assessmentIds.has(assessment.submissionId),
  )
  const slaHours = rangeAssessments
    .map((assessment) => {
      const submission = rangeSubmissions.find(
        (item) => item._id === assessment.submissionId,
      )
      if (!submission?.submittedAt || !assessment.assessedAt) return null
      return (assessment.assessedAt - submission.submittedAt) / 3_600_000
    })
    .filter((value): value is number => value !== null && value >= 0)

  const assessed = rangeSubmissions.filter((submission) =>
    ["approved", "rejected"].includes(submission.status),
  )
  const approved = rangeSubmissions.filter(
    (submission) => submission.status === "approved",
  ).length

  const issuedCertificates = data.certificates.filter(
    (certificate) =>
      certificate.status === "issued" &&
      inRange(certificate.issuedAt, range),
  )
  const certificateIssued = issuedCertificates.length

  const firstPublishedWorks = issuedCertificates.filter((certificate) => {
    const work = data.works.find(
      (item) =>
        item.makerId === certificate.studentId ||
        item.maker === certificate.snapshot.studentName,
    )
    if (!work?.createdAt) return false
    const delta = work.createdAt - certificate.issuedAt
    return delta >= 0 && delta <= 30 * DAY_MS && work.status === "published"
  }).length

  const paidOrders = data.orders.filter(
    (order) =>
      PAID_ORDER_STATUSES.has(order.status) &&
      inRange(order.paidAt, range),
  )
  const gmv = paidOrders.length > 0
    ? paidOrders.reduce((total, order) => total + order.baseAmount, 0)
    : null

  const refunds = data.refunds
    .filter(
      (refund) =>
        ["approved", "paid"].includes(refund.status) &&
        inRange(refund.createdAt, range),
    )
    .reduce((total, refund) => total + refund.amount, 0)
  const fees = data.ledger
    .filter(
      (entry) =>
        entry.account === "gateway_fee" && inRange(entry.createdAt, range),
    )
    .reduce((total, entry) => total + entry.amount, 0)

  const approvedPayouts = data.payouts.filter(
    (payout) => payout.status === "approved",
  )
  const payoutDue =
    approvedPayouts.length > 0
      ? approvedPayouts.reduce((total, payout) => total + payout.gross, 0)
      : null

  const activeCohorts = data.cohorts.filter((cohort) =>
    ["enrolling", "active"].includes(cohort.status),
  )
  const activeStudentsByTeacher = new Map<string, number>()
  for (const cohort of activeCohorts) {
    const count = data.enrollments.filter(
      (enrollment) =>
        enrollment.cohortId === cohort._id && enrollment.status === "active",
    ).length
    activeStudentsByTeacher.set(
      cohort.teacherId,
      (activeStudentsByTeacher.get(cohort.teacherId) ?? 0) + count,
    )
  }
  const teacherLoad =
    activeStudentsByTeacher.size > 0
      ? Array.from(activeStudentsByTeacher.values()).reduce(
          (total, value) => total + value,
          0,
        ) / activeStudentsByTeacher.size
      : null

  const capacity = activeCohorts.reduce(
    (total, cohort) => total + cohort.capacity,
    0,
  )
  const enrolledInCohorts = data.enrollments.filter(
    (enrollment) =>
      enrollment.cohortId !== undefined &&
      activeCohorts.some((cohort) => cohort._id === enrollment.cohortId) &&
      enrollment.status === "active",
  ).length
  const cohortFill = ratio(enrolledInCohorts, capacity)

  const rangeTickets = data.supportTickets.filter((ticket) =>
    inRange(ticket.createdAt, range),
  )
  const responseMinutes = rangeTickets
    .map((ticket) => {
      const firstReply = data.supportMessages
        .filter(
          (message) =>
            message.ticketId === ticket._id &&
            message.authorId !== undefined &&
            message.authorId !== ticket.requesterId,
        )
        .sort((a, b) => a.createdAt - b.createdAt)[0]
      if (!firstReply) return null
      return (firstReply.createdAt - ticket.createdAt) / 60_000
    })
    .filter((value): value is number => value !== null && value >= 0)

  const rangePayments = data.payments.filter((payment) =>
    inRange(payment.createdAt, range),
  )
  const paidPayments = rangePayments.filter(
    (payment) => payment.status === "paid",
  ).length

  return {
    leadConversion: { numerator: converted, denominator: qualified },
    enrollmentActivation: {
      numerator: activatedEnrollments,
      denominator: createdEnrollments.length,
    },
    completion: {
      numerator: completed,
      denominator: currentEnrollments.length,
    },
    submissionRate: { numerator: submitted, denominator: expectedTasks },
    assessmentSla: {
      p50: percentile(slaHours, 50),
      p90: percentile(slaHours, 90),
    },
    passRate: { numerator: approved, denominator: assessed.length },
    certificateIssuance: {
      numerator: certificateIssued,
      denominator: approved,
    },
    sellerActivation: {
      numerator: firstPublishedWorks,
      denominator: certificateIssued,
    },
    gmv: gmv,
    netRevenue: gmv === null ? null : gmv - refunds - fees,
    payoutDue,
    teacherLoad,
    cohortFill,
    supportResponse: {
      p50: percentile(responseMinutes, 50),
      p90: percentile(responseMinutes, 90),
    },
    gatewaySuccess: {
      numerator: paidPayments,
      denominator: rangePayments.length,
    },
  }
}

function buildMetrics(current: MetricSet, previous: MetricSet): MetricResult[] {
  return [
    metric({
      key: "lead_conversion",
      label: "Konversi lead",
      definition: "Lead yang selesai dibagi lead yang terkualifikasi pada periode.",
      formula: "converted ÷ qualified",
      unit: "ratio",
      value: ratio(current.leadConversion.numerator, current.leadConversion.denominator),
      previous: ratio(previous.leadConversion.numerator, previous.leadConversion.denominator),
      numerator: current.leadConversion.numerator,
      denominator: current.leadConversion.denominator,
    }),
    metric({
      key: "enrollment_activation",
      label: "Aktivasi pendaftaran",
      definition: "Pendaftaran aktif dibagi pendaftaran yang dibuat pada periode.",
      formula: "paid enrollments ÷ created enrollments",
      unit: "ratio",
      value: ratio(current.enrollmentActivation.numerator, current.enrollmentActivation.denominator),
      previous: ratio(previous.enrollmentActivation.numerator, previous.enrollmentActivation.denominator),
      numerator: current.enrollmentActivation.numerator,
      denominator: current.enrollmentActivation.denominator,
    }),
    metric({
      key: "completion",
      label: "Penyelesaian",
      definition: "Pendaftaran selesai dibagi pendaftaran aktif dan selesai.",
      formula: "completed ÷ active enrollments",
      unit: "ratio",
      value: ratio(current.completion.numerator, current.completion.denominator),
      previous: ratio(previous.completion.numerator, previous.completion.denominator),
      numerator: current.completion.numerator,
      denominator: current.completion.denominator,
    }),
    metric({
      key: "submission_rate",
      label: "Tingkat pengiriman tugas",
      definition: "Tugas terkirim dibagi tugas yang diharapkan dari pendaftaran periode.",
      formula: "submitted tasks ÷ expected tasks",
      unit: "ratio",
      value: ratio(current.submissionRate.numerator, current.submissionRate.denominator),
      previous: ratio(previous.submissionRate.numerator, previous.submissionRate.denominator),
      numerator: current.submissionRate.numerator,
      denominator: current.submissionRate.denominator,
    }),
    metric({
      key: "assessment_sla_p50",
      label: "SLA penilaian p50",
      definition: "Median jam dari kirim tugas sampai umpan balik pertama.",
      formula: "p50(first feedback − submitted)",
      unit: "hours",
      value: current.assessmentSla.p50,
      previous: previous.assessmentSla.p50,
      emptyReason: "Belum ada penilaian selesai pada periode ini.",
    }),
    metric({
      key: "assessment_sla_p90",
      label: "SLA penilaian p90",
      definition: "Persentil 90 jam dari kirim tugas sampai umpan balik pertama.",
      formula: "p90(first feedback − submitted)",
      unit: "hours",
      value: current.assessmentSla.p90,
      previous: previous.assessmentSla.p90,
      emptyReason: "Belum ada penilaian selesai pada periode ini.",
    }),
    metric({
      key: "pass_rate",
      label: "Tingkat kelulusan",
      definition: "Tugas disetujui dibagi tugas yang sudah dinilai.",
      formula: "approved ÷ assessed",
      unit: "ratio",
      value: ratio(current.passRate.numerator, current.passRate.denominator),
      previous: ratio(previous.passRate.numerator, previous.passRate.denominator),
      numerator: current.passRate.numerator,
      denominator: current.passRate.denominator,
    }),
    metric({
      key: "certificate_issuance",
      label: "Penerbitan sertifikat",
      definition: "Sertifikat terbit dibagi tugas yang disetujui pada periode.",
      formula: "issued certificates ÷ approved assessments",
      unit: "ratio",
      value: ratio(current.certificateIssuance.numerator, current.certificateIssuance.denominator),
      previous: ratio(previous.certificateIssuance.numerator, previous.certificateIssuance.denominator),
      numerator: current.certificateIssuance.numerator,
      denominator: current.certificateIssuance.denominator,
    }),
    metric({
      key: "seller_activation",
      label: "Aktivasi penjual",
      definition: "Sertifikat dengan karya terbit dalam 30 hari dibagi sertifikat terbit.",
      formula: "first published listing ≤ 30 days ÷ issued certificates",
      unit: "ratio",
      value: ratio(current.sellerActivation.numerator, current.sellerActivation.denominator),
      previous: ratio(previous.sellerActivation.numerator, previous.sellerActivation.denominator),
      numerator: current.sellerActivation.numerator,
      denominator: current.sellerActivation.denominator,
    }),
    metric({
      key: "gmv",
      label: "GMV",
      definition: "Nilai bruto pesanan berbayar sebelum refund.",
      formula: "sum(paid order baseAmount)",
      unit: "rupiah",
      value: current.gmv,
      previous: previous.gmv,
    }),
    metric({
      key: "net_revenue",
      label: "Pendapatan bersih",
      definition: "GMV dikurangi refund dan biaya gerbang pembayaran.",
      formula: "GMV − refunds − gateway fees",
      unit: "rupiah",
      value: current.netRevenue,
      previous: previous.netRevenue,
    }),
    metric({
      key: "payout_due",
      label: "Payout jatuh tempo",
      definition: "Payout yang sudah disetujui tetapi belum dibayar.",
      formula: "sum(approved payouts.gross)",
      unit: "rupiah",
      value: current.payoutDue,
      previous: previous.payoutDue,
    }),
    metric({
      key: "teacher_load",
      label: "Beban pengajar",
      definition: "Rata-rata peserta aktif per pengajar pada kohort berjalan.",
      formula: "active students ÷ teachers",
      unit: "count",
      value: current.teacherLoad,
      previous: previous.teacherLoad,
      emptyReason: "Belum ada kohort aktif.",
    }),
    metric({
      key: "cohort_fill",
      label: "Isi kohort",
      definition: "Peserta aktif dibagi kapasitas kohort berjalan.",
      formula: "enrolled ÷ capacity",
      unit: "ratio",
      value: current.cohortFill,
      previous: previous.cohortFill,
      emptyReason: "Belum ada kapasitas kohort.",
    }),
    metric({
      key: "support_first_response_p50",
      label: "Respons dukungan p50",
      definition: "Median menit dari tiket dibuat sampai balasan pertama.",
      formula: "p50(first reply − created)",
      unit: "minutes",
      value: current.supportResponse.p50,
      previous: previous.supportResponse.p50,
      emptyReason: "Belum ada tiket dengan balasan.",
    }),
    metric({
      key: "support_first_response_p90",
      label: "Respons dukungan p90",
      definition: "Persentil 90 menit dari tiket dibuat sampai balasan pertama.",
      formula: "p90(first reply − created)",
      unit: "minutes",
      value: current.supportResponse.p90,
      previous: previous.supportResponse.p90,
      emptyReason: "Belum ada tiket dengan balasan.",
    }),
    metric({
      key: "gateway_success",
      label: "Keberhasilan gerbang",
      definition: "Pembayaran berbayar dibagi pembayaran yang dibuat pada periode.",
      formula: "paid charges ÷ created charges",
      unit: "ratio",
      value: ratio(current.gatewaySuccess.numerator, current.gatewaySuccess.denominator),
      previous: ratio(previous.gatewaySuccess.numerator, previous.gatewaySuccess.denominator),
      numerator: current.gatewaySuccess.numerator,
      denominator: current.gatewaySuccess.denominator,
    }),
    metric({
      key: "content_freshness",
      label: "Kesegaran konten",
      definition: "Hari sejak landing publik terakhir diterbitkan.",
      formula: "now − siteContent.updatedAt",
      unit: "days",
      value: null,
      previous: null,
      emptyReason: "Konten belum pernah diterbitkan.",
    }),
  ]
}

function buildFunnel(data: Data, range: Range): FunnelStep[] {
  const paidOrders = data.orders.filter(
    (order) =>
      PAID_ORDER_STATUSES.has(order.status) && inRange(order.paidAt, range),
  )
  const sellers = new Map<string, number>()
  for (const order of paidOrders) {
    sellers.set(order.sellerId, (sellers.get(order.sellerId) ?? 0) + 1)
  }
  const firstSale = Array.from(sellers.values()).filter((count) => count >= 1).length
  const repeat = Array.from(sellers.values()).filter((count) => count >= 2).length

  return [
    {
      key: "visitor",
      label: "Pengunjung",
      value: null,
      definition: "Belum ada sumber analitik pengunjung; angka ini tidak dikarang.",
    },
    {
      key: "lead",
      label: "Lead",
      value: data.leads.filter((lead) => inRange(lead.createdAt, range)).length,
      definition: "Lead masuk pada periode.",
    },
    {
      key: "enrollment",
      label: "Pendaftaran",
      value: data.enrollments.filter((enrollment) =>
        inRange(enrollment.enrolledAt, range),
      ).length,
      definition: "Pendaftaran dibuat pada periode.",
    },
    {
      key: "submission",
      label: "Tugas",
      value: data.submissions.filter((submission) =>
        inRange(submission.submittedAt, range),
      ).length,
      definition: "Tugas terkirim pada periode.",
    },
    {
      key: "assessment",
      label: "Penilaian",
      value: data.assessments.filter((assessment) =>
        inRange(assessment.assessedAt, range),
      ).length,
      definition: "Penilaian selesai pada periode.",
    },
    {
      key: "certificate",
      label: "Sertifikat",
      value: data.certificates.filter(
        (certificate) =>
          certificate.status === "issued" &&
          inRange(certificate.issuedAt, range),
      ).length,
      definition: "Sertifikat terbit pada periode.",
    },
    {
      key: "first_sale",
      label: "Penjualan pertama",
      value: firstSale,
      definition: "Penjual dengan setidaknya satu pesanan berbayar.",
    },
    {
      key: "repeat",
      label: "Penjualan berulang",
      value: repeat,
      definition: "Penjual dengan dua pesanan berbayar atau lebih.",
    },
  ]
}

function contentFreshnessDays(site: Doc<"siteContent"> | null): number | null {
  if (!site) return null
  return Math.max(0, Math.floor((now() - site.updatedAt) / DAY_MS))
}

export const metrics = query({
  args: { from: v.optional(v.number()), to: v.optional(v.number()) },
  handler: async (ctx, args): Promise<MetricsReport> => {
    await requireAdmin(ctx, "stats.read")
    const range = resolveRange(args.from, args.to)
    const data = await loadData(ctx)
    const current = computeSet(data, range)
    const previous = computeSet(data, previousRange(range))
    const definitions = buildMetrics(current, previous)
    const freshness = definitions.find((item) => item.key === "content_freshness")
    if (freshness) freshness.value = contentFreshnessDays(data.site)

    return {
      generatedAt: now(),
      range,
      definitions,
      funnel: buildFunnel(data, range),
    }
  },
})

function monthStartJakarta(): number {
  const shifted = new Date(now() + PRODUCT_OFFSET_MS)
  return (
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), 1) -
    PRODUCT_OFFSET_MS
  )
}

export const overview = query({
  args: {},
  handler: async (ctx): Promise<AdminOverview> => {
    await requireAdmin(ctx, "stats.read")
    const data = await loadData(ctx)
    const timestamp = now()
    const monthStart = monthStartJakarta()

    const latestIntegration = new Map<string, Doc<"integrationHealth">>()
    for (const item of data.integrations.sort((a, b) => a.checkedAt - b.checkedAt)) {
      latestIntegration.set(item.integration, item)
    }

    const pendingSubmissions = data.submissions.filter((submission) =>
      ["submitted", "under_review"].includes(submission.status),
    )
    const queues: OverviewQueueItem[] = [
      {
        key: "new_leads",
        label: "Lead baru",
        count: data.leads.filter((lead) => lead.status === "new").length,
        href: "/ruang/prospek",
        note: "Belum dihubungi",
        tone: "open",
      },
      {
        key: "teacher_applications",
        label: "Pengajuan pengajar",
        count: data.teachers.filter(
          (teacher) =>
            teacher.verificationStatus === "submitted" ||
            teacher.verificationStatus === "under_review" ||
            (teacher.status === "review" && !teacher.verified),
        ).length,
        href: "/ruang/orang",
        note: "Menunggu verifikasi",
        tone: "wait",
      },
      {
        key: "pending_assessments",
        label: "Tugas menunggu penilaian",
        count: pendingSubmissions.length,
        href: "/ruang/tugas",
        note: "Modul penilaian fase berikutnya",
        tone: "progress",
      },
      {
        key: "overdue_assessments",
        label: "Tugas melewati SLA",
        count: pendingSubmissions.filter(
          (submission) => submission.dueAt < timestamp,
        ).length,
        href: "/ruang/tugas",
        note: "Lewat tenggat",
        tone: "danger",
      },
      {
        key: "certificates_month",
        label: "Sertifikat terbit bulan ini",
        count: data.certificates.filter(
          (certificate) =>
            certificate.status === "issued" &&
            certificate.issuedAt >= monthStart,
        ).length,
        href: "/ruang/kredensial",
        note: "Bulan berjalan",
        tone: "done",
      },
      {
        key: "works_review",
        label: "Karya menunggu tinjauan",
        count: data.works.filter((work) => work.status === "review").length,
        href: "/ruang/karya",
        note: "Moderasi karya",
        tone: "wait",
      },
      {
        key: "orders_awaiting_payment",
        label: "Pesanan menunggu pembayaran",
        count: data.orders.filter(
          (order) => order.status === "awaiting_payment",
        ).length,
        href: "/ruang/pesanan",
        note: "Modul pesanan fase berikutnya",
        tone: "progress",
      },
      {
        key: "payouts_due",
        label: "Payout jatuh tempo",
        count: data.payouts.filter((payout) => payout.status === "approved")
          .length,
        href: "/ruang/pesanan/payout",
        note: "Sudah disetujui",
        tone: "wait",
      },
      {
        key: "refunds_open",
        label: "Refund terbuka",
        count: data.refunds.filter((refund) =>
          ["requested", "reviewing"].includes(refund.status),
        ).length,
        href: "/ruang/pesanan",
        note: "Menunggu keputusan",
        tone: "danger",
      },
      {
        key: "disputes_open",
        label: "Sengketa terbuka",
        count: data.disputes.filter((dispute) =>
          ["open", "reviewing"].includes(dispute.status),
        ).length,
        href: "/ruang/tugas",
        note: "Menunggu peninjauan",
        tone: "danger",
      },
      {
        key: "support_open",
        label: "Dukungan terbuka",
        count: data.supportTickets.filter((ticket) =>
          ["open", "pending"].includes(ticket.status),
        ).length,
        href: "/ruang/dukungan",
        note: "Kotak masuk dukungan",
        tone: "open",
      },
    ]

    const draft = data.drafts
      .filter((revision) => revision.status === "draft")
      .sort((a, b) => b.version - a.version)[0]

    const activity = data.audits.slice(0, 6).map((row) => ({
      id: row._id,
      kind: "audit" as const,
      label: "Audit",
      actor: row.actorId ?? null,
      action: row.action,
      entity: row.entityType,
      entityId: row.entityId ?? null,
      severity: row.severity,
      requestId: row.requestId ?? null,
      detail: row.reason ?? "",
      createdAt: row.createdAt,
    }))

    return {
      generatedAt: timestamp,
      queues,
      activity,
      content: {
        publishedAt: data.site?.updatedAt ?? null,
        draftVersion: draft?.version ?? null,
        freshnessDays: contentFreshnessDays(data.site),
      },
      integrations: Array.from(latestIntegration.values()).map((item) => ({
        integration: item.integration,
        status: item.status,
        message: item.message ?? null,
        checkedAt: item.checkedAt,
      })),
      modules: [
        {
          key: "learning",
          label: "Belajar dan penilaian",
          available:
            data.enrollments.length > 0 ||
            data.submissions.length > 0 ||
            data.assessments.length > 0,
          note:
            data.enrollments.length > 0 ||
            data.submissions.length > 0 ||
            data.assessments.length > 0
              ? "Data nyata tersedia."
              : "Fase belajar belum terhubung; tidak ada data untuk ditampilkan.",
        },
        {
          key: "commerce",
          label: "Karya dan pesanan",
          available:
            data.orders.length > 0 ||
            data.payments.length > 0 ||
            data.payouts.length > 0,
          note:
            data.orders.length > 0 ||
            data.payments.length > 0 ||
            data.payouts.length > 0
              ? "Data nyata tersedia."
              : "Fase commerce belum terhubung; tidak ada data untuk ditampilkan.",
        },
        {
          key: "messaging",
          label: "Pesan",
          available: data.conversations.length > 0 || data.messages.length > 0,
          note:
            data.conversations.length > 0 || data.messages.length > 0
              ? "Data nyata tersedia."
              : "Fase pesan belum terhubung; tidak ada data untuk ditampilkan.",
        },
        {
          key: "calls",
          label: "Panggilan",
          available: data.callSessions.length > 0,
          note:
            data.callSessions.length > 0
              ? "Data nyata tersedia."
              : "Fase panggilan belum terhubung; tidak ada data untuk ditampilkan.",
        },
      ],
    }
  },
})

export const exportMetrics = mutation({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireAdmin(ctx, "stats.read")
    const reason = requireReason(args.reason)
    const range = resolveRange(args.from, args.to)
    const data = await loadData(ctx)
    const current = computeSet(data, range)
    const previous = computeSet(data, previousRange(range))
    const definitions = buildMetrics(current, previous)
    const freshness = definitions.find((item) => item.key === "content_freshness")
    if (freshness) freshness.value = contentFreshnessDays(data.site)

    await appendAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "stats.export",
      entityType: "stats",
      entityId: `${range.from}-${range.to}`,
      reason,
      after: { definitions: definitions.length },
    })
    return { rows: definitions, generatedAt: now(), range }
  },
})
