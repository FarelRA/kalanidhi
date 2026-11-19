import {
  applyGatewayFee,
  assertRupiah,
  reverseSplit,
  splitAmount,
  uniqueOffset,
} from "../../../lib/commerce/money"
import type { Doc, Id } from "../../_generated/dataModel"
import type { MutationCtx } from "../../_generated/server"
import { hashToken } from "../../commerce_shared"

type OrderStatus = Doc<"orders">["status"]
type PaymentStatus = Doc<"payments">["status"]
type PayoutStatus = Doc<"payouts">["status"]
type SubmissionStatus = Doc<"submissions">["status"]
type AssessmentStatus = Doc<"assessments">["status"]
type LedgerAccount = Doc<"ledgerEntries">["account"]
type CertificateStatus = Doc<"certificates">["status"]

const TOKEN_HASH = /^[0-9a-f]{64}$/
const PAYMENT_TTL_MS = 15 * 60_000

function chooseUniqueAmount(
  baseAmount: number,
  used: Set<number>,
  seed: number,
): number {
  let offset = 1 + (Math.abs(seed) % 999)
  for (let attempt = 0; attempt < 999; attempt += 1) {
    const candidate = baseAmount + offset
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
    offset = offset === 999 ? 1 : offset + 1
  }
  throw new Error("Seed builder, tidak ada nominal unik yang tersisa.")
}

export type BuildPaidOrderInput = {
  code: string
  buyer: Doc<"users">
  sellerId: Id<"users">
  workId?: Id<"works">
  itemKind: "work" | "service" | "path"
  pathId?: string
  title: string
  baseAmount: number
  createdAt: number
  /** The run instant; builders never read the wall clock. */
  now: number
  paidAt?: number
  status: OrderStatus
  gatewayFee?: number
  note?: string
  /** Explicit amount for deterministic fixtures; otherwise a unique offset is chosen. */
  uniqueAmount?: number
  usedUniqueAmounts?: Set<number>
  tokenSeed?: string
  providerKey?: string
  orderIdempotencyKey?: string
  paymentIdempotencyKey?: string
  deliveredAt?: number
  completedAt?: number
  cancelledAt?: number
  cancelReason?: string
  updatedAt?: number
  expiredAt?: number
}

/**
 * One paid-order graph: order, item, payment, and its created/settled events.
 *
 * Money invariant: `order.baseAmount === item.totalAmount === payment.baseAmount`.
 * The unique offset (1..999) is reconciliation cover only and is globally
 * unique across payments. The payment never settles before the order exists,
 * and a paid payment always shares the order's `paidAt`.
 */
export async function buildPaidOrder(
  ctx: MutationCtx,
  input: BuildPaidOrderInput,
): Promise<{
  orderId: Id<"orders">
  paymentId: Id<"payments">
  uniqueAmount: number
}> {
  const baseAmount = assertRupiah(input.baseAmount, "baseAmount")
  if (input.paidAt !== undefined && input.paidAt < input.createdAt) {
    throw new Error(`Seed builder, ${input.code} paid before it was created.`)
  }

  const providerKey = input.providerKey ?? input.code
  const used =
    input.usedUniqueAmounts ??
    new Set(
      (await ctx.db.query("payments").collect()).map((row) => row.uniqueAmount),
    )
  const uniqueAmount =
    input.uniqueAmount ??
    chooseUniqueAmount(
      baseAmount,
      used,
      (input.tokenSeed?.length ?? 0) + input.code.length + input.createdAt,
    )
  const offset = uniqueOffset(baseAmount, uniqueAmount)
  if (offset < 1 || offset > 999) {
    throw new Error(`Seed builder, ${input.code} offset out of range.`)
  }
  const duplicate = await ctx.db
    .query("payments")
    .withIndex("by_uniqueAmount", (q) => q.eq("uniqueAmount", uniqueAmount))
    .first()
  if (duplicate) {
    throw new Error(
      `Seed builder, unique amount ${uniqueAmount} is already in use.`,
    )
  }
  used.add(uniqueAmount)

  const tokenHash = await hashToken(
    input.tokenSeed ?? `seed-order-token-${input.code}`,
  )
  if (!TOKEN_HASH.test(tokenHash)) {
    throw new Error("Seed builder, order token is not a SHA-256 digest.")
  }

  const orderId = await ctx.db.insert("orders", {
    code: input.code,
    buyerUserId: input.buyer._id,
    buyerName: input.buyer.name,
    buyerEmail: input.buyer.email,
    buyerWhatsapp: input.buyer.phone,
    sellerId: input.sellerId,
    workId: input.workId,
    pathId: input.pathId,
    baseAmount,
    uniqueAmount,
    status: input.status,
    channel: "web",
    note: input.note,
    tokenHash,
    idempotencyKey: input.orderIdempotencyKey ?? `seed-idem-${input.code}`,
    consentVersion: "2026-11-transactional",
    consentAt: input.createdAt,
    claimedAt: input.createdAt,
    paidAt: input.paidAt,
    deliveredAt: input.deliveredAt,
    completedAt: input.completedAt,
    cancelledAt: input.cancelledAt,
    cancelReason: input.cancelReason,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.now,
  })

  await ctx.db.insert("orderItems", {
    orderId,
    kind: input.itemKind,
    refId: input.workId ?? input.pathId,
    pathId: input.pathId,
    title: input.title,
    quantity: 1,
    unitAmount: baseAmount,
    totalAmount: baseAmount,
  })

  const paymentStatus: PaymentStatus =
    input.status === "refunded"
      ? "refunded"
      : input.paidAt !== undefined
        ? "paid"
        : "pending"
  const paymentId = await ctx.db.insert("payments", {
    orderId,
    provider: "gopay_qris",
    providerChargeId: `ch_${providerKey}`,
    providerReference: `QRIS-${input.code}`,
    providerTransactionId:
      input.paidAt !== undefined ? `trx_${providerKey}` : undefined,
    baseAmount,
    uniqueAmount,
    status: paymentStatus,
    expiresAt: input.createdAt + PAYMENT_TTL_MS,
    paidAt: input.paidAt,
    lastReconciledAt: input.paidAt,
    gatewayFee: input.gatewayFee,
    qrString: `00020101021226${input.code}5802ID`,
    reconciliationState: "none",
    settledEventId:
      input.paidAt !== undefined ? `evt_settled_${providerKey}` : undefined,
    idempotencyKey:
      input.paymentIdempotencyKey ?? `idem_${providerKey}`,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.now,
  })

  await ctx.db.insert("paymentEvents", {
    eventId: `evt_created_${providerKey}`,
    paymentId,
    orderId,
    kind: "created",
    amount: uniqueAmount,
    providerReference: `QRIS-${input.code}`,
    payload: { provider: "gopay_qris", stage: "created" },
    createdAt: input.createdAt,
  })
  if (input.paidAt !== undefined) {
    await ctx.db.insert("paymentEvents", {
      eventId: `evt_settled_${providerKey}`,
      paymentId,
      orderId,
      kind: "settled",
      amount: uniqueAmount,
      providerReference: `QRIS-${input.code}`,
      payload: { provider: "gopay_qris", stage: "settled" },
      createdAt: input.paidAt,
    })
  }
  if (input.expiredAt !== undefined) {
    await ctx.db.insert("paymentEvents", {
      eventId: `evt_expired_${providerKey}`,
      paymentId,
      orderId,
      kind: "expired",
      amount: uniqueAmount,
      providerReference: `QRIS-${input.code}`,
      payload: { provider: "gopay_qris", stage: "expired" },
      createdAt: input.expiredAt,
    })
  }

  return { orderId, paymentId, uniqueAmount }
}

export type BuildPayoutAllocationInput = {
  orderId: Id<"orders">
  paymentId: Id<"payments">
  teacherId: Id<"users">
  baseAmount: number
  gatewayFee: number
  orderPaidAt: number
  status: PayoutStatus
  payoutPaidAt?: number
  dueAt?: number
  createdAt: number
  updatedAt?: number
  now: number
  approvedBy?: string
  reason?: string
  holdReason?: string
  reference?: string
  periodStart?: number
  periodEnd?: number
}

/**
 * Payout allocation and its ledger.
 *
 * The allocation ledger is double-entry at the order level:
 * credits = teacher + platform + community shares (exactly `baseAmount`);
 * debits = the gateway fee (always recorded, even when zero) plus the teacher
 * share once the payout is actually paid. The gateway fee is absorbed by the
 * platform share through `applyGatewayFee`, so teacher and community never
 * change. `dueAt` is always present and is never earlier than a paid payout.
 */
export async function buildPayoutAllocation(
  ctx: MutationCtx,
  input: BuildPayoutAllocationInput,
): Promise<{
  payoutId: Id<"payouts">
  credits: Id<"ledgerEntries">[]
  split: ReturnType<typeof splitAmount>
  platformNet: number
}> {
  const baseAmount = assertRupiah(input.baseAmount, "baseAmount")
  const split = splitAmount(baseAmount)
  const applied = applyGatewayFee(split, input.gatewayFee)
  const payoutPaidAt =
    input.status === "paid"
      ? (input.payoutPaidAt ?? input.orderPaidAt + 7 * 86_400_000)
      : undefined
  const naturalDueAt = input.dueAt ?? input.orderPaidAt + 7 * 86_400_000
  const dueAt =
    payoutPaidAt !== undefined
      ? Math.max(naturalDueAt, payoutPaidAt)
      : naturalDueAt

  const payoutId = await ctx.db.insert("payouts", {
    teacherId: input.teacherId,
    orderId: input.orderId,
    paymentId: input.paymentId,
    periodStart: input.periodStart ?? input.orderPaidAt,
    periodEnd: input.periodEnd ?? input.orderPaidAt + 7 * 86_400_000,
    dueAt,
    kind: "sale",
    reference: input.reference,
    gross: baseAmount,
    teacherShare: split.teacherShare,
    platformShare: split.platformShare,
    communityShare: split.communityShare,
    status: input.status,
    approvedBy: input.approvedBy,
    paidAt: payoutPaidAt,
    paidAmount: payoutPaidAt !== undefined ? split.teacherShare : undefined,
    reason: input.reason,
    holdReason: input.holdReason,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.now,
  })

  const credits: Id<"ledgerEntries">[] = []
  const accounts: Array<{
    account: LedgerAccount
    amount: number
    reason: string
  }> = [
    {
      account: "teacher",
      amount: split.teacherShare,
      reason: "Bagi hasil pengajar dan pembuat karya 70%",
    },
    {
      account: "platform",
      amount: split.platformShare,
      reason: "Operasional platform 15%",
    },
    {
      account: "community",
      amount: split.communityShare,
      reason: "Dana komunitas dan sanggar 15%",
    },
  ]
  for (const entry of accounts) {
    credits.push(
      await ctx.db.insert("ledgerEntries", {
        orderId: input.orderId,
        paymentId: input.paymentId,
        payoutId,
        teacherId: entry.account === "teacher" ? input.teacherId : undefined,
        account: entry.account,
        direction: "credit",
        amount: entry.amount,
        currency: "IDR",
        entryType: "sale",
        reason: entry.reason,
        createdAt: input.orderPaidAt,
      }),
    )
  }

  await ctx.db.insert("ledgerEntries", {
    orderId: input.orderId,
    paymentId: input.paymentId,
    payoutId,
    account: "gateway_fee",
    direction: "debit",
    amount: applied.gatewayFee,
    currency: "IDR",
    entryType: "sale",
    reason: "Biaya gerbang pembayaran",
    createdAt: input.orderPaidAt,
  })

  if (payoutPaidAt !== undefined) {
    await ctx.db.insert("ledgerEntries", {
      orderId: input.orderId,
      paymentId: input.paymentId,
      payoutId,
      teacherId: input.teacherId,
      account: "teacher",
      direction: "debit",
      amount: split.teacherShare,
      currency: "IDR",
      entryType: "payout",
      reason: "Payout dibayarkan ke rekening pengajar",
      createdAt: payoutPaidAt,
    })
  }

  return { payoutId, credits, split, platformNet: applied.platformNet }
}

export type BuildRefundReversalInput = {
  orderId: Id<"orders">
  paymentId: Id<"payments">
  baseAmount: number
  amount: number
  teacherId?: Id<"users">
  requestedBy?: Id<"users">
  reason: string
  status: Doc<"refunds">["status"]
  decidedBy?: string
  decisionReason?: string
  evidence?: string
  reviewedAt?: number
  paidAt?: number
  createdAt: number
  updatedAt?: number
  now: number
  originalPayoutId?: Id<"payouts">
  dueAt?: number
}

/**
 * Refund plus its compensating allocation.
 *
 * The unique offset is reconciliation cover, never revenue, so a full refund
 * returns the order base amount. `reverseSplit` produces shares whose sum is
 * exactly the refund amount; the reversal ledger is therefore always balanced.
 */
export async function buildRefundReversal(
  ctx: MutationCtx,
  input: BuildRefundReversalInput,
): Promise<{
  refundId: Id<"refunds">
  reversalPayoutId: Id<"payouts">
  reversal: ReturnType<typeof reverseSplit>
}> {
  const baseAmount = assertRupiah(input.baseAmount, "baseAmount")
  const reversal = reverseSplit(baseAmount, input.amount)
  if (input.paidAt !== undefined && input.paidAt < input.createdAt) {
    throw new Error("Seed builder, refund paid before it was created.")
  }

  const originalPayout = input.originalPayoutId
    ? await ctx.db.get(input.originalPayoutId)
    : (
        await ctx.db
          .query("payouts")
          .withIndex("by_orderId", (q) => q.eq("orderId", input.orderId))
          .collect()
      ).find((row) => row.kind === "sale")
  const teacherId = originalPayout?.teacherId ?? input.teacherId
  if (!teacherId) {
    throw new Error("Seed builder, refund has no teacher allocation.")
  }

  const refundId = await ctx.db.insert("refunds", {
    orderId: input.orderId,
    paymentId: input.paymentId,
    requestedBy: input.requestedBy,
    amount: reversal.baseAmount,
    reason: input.reason,
    status: input.status,
    decidedBy: input.decidedBy,
    decisionReason: input.decisionReason,
    evidence: input.evidence,
    reviewedAt: input.reviewedAt,
    paidAt: input.paidAt,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt ?? input.now,
  })

  const reversalPaidAt = input.paidAt
  const reversalPayoutId = await ctx.db.insert("payouts", {
    teacherId,
    periodStart: input.createdAt,
    periodEnd: input.createdAt + 7 * 86_400_000,
    gross: -reversal.baseAmount,
    teacherShare: -reversal.teacherShare,
    platformShare: -reversal.platformShare,
    communityShare: -reversal.communityShare,
    status: reversalPaidAt !== undefined ? "paid" : "approved",
    paidAt: reversalPaidAt,
    paidAmount:
      reversalPaidAt !== undefined ? -reversal.teacherShare : undefined,
    orderId: input.orderId,
    paymentId: input.paymentId,
    dueAt: Math.max(
      input.dueAt ?? input.createdAt,
      reversalPaidAt ?? input.createdAt,
    ),
    kind: "reversal",
    reversalOf: originalPayout?._id,
    reason: "Pembalikan payout setelah refund.",
    reference: `REVERSAL-${input.orderId}`,
    createdAt: reversalPaidAt ?? input.createdAt,
    updatedAt: input.updatedAt ?? input.now,
  })

  const originalCredits = new Map(
    (
      await ctx.db
        .query("ledgerEntries")
        .withIndex("by_orderId", (q) => q.eq("orderId", input.orderId))
        .collect()
    )
      .filter(
        (row) => row.entryType === "sale" && row.direction === "credit",
      )
      .map((row) => [row.account, row._id] as const),
  )
  const accounts: Array<{
    account: LedgerAccount
    amount: number
  }> = [
    { account: "teacher", amount: reversal.teacherShare },
    { account: "platform", amount: reversal.platformShare },
    { account: "community", amount: reversal.communityShare },
  ]
  for (const entry of accounts) {
    await ctx.db.insert("ledgerEntries", {
      orderId: input.orderId,
      paymentId: input.paymentId,
      payoutId: reversalPayoutId,
      refundId,
      teacherId: entry.account === "teacher" ? teacherId : undefined,
      account: entry.account,
      direction: "debit",
      amount: entry.amount,
      currency: "IDR",
      entryType: "reversal",
      reversalOf: originalCredits.get(entry.account),
      reason: "Pembalikan bagi hasil setelah refund",
      createdAt: reversalPaidAt ?? input.createdAt,
    })
  }

  if (originalPayout && originalPayout.status !== "paid") {
    await ctx.db.patch(originalPayout._id, {
      status: "reversed",
      updatedAt: input.updatedAt ?? input.now,
      reason: "Payout asal ditutup oleh pembalikan refund.",
    })
  }

  return { refundId, reversalPayoutId, reversal }
}

export type BuildCertificateChainInput = {
  assessmentId: Id<"assessments">
  serial: string
  publicCode: string
  issuedAt: number
  status?: CertificateStatus
  revokedAt?: number
  revokeReason?: string
  revokedBy?: string
  actorId?: Id<"users">
  enrollmentId?: Id<"enrollments">
  auditReason?: string
  updatedAt?: number
  now: number
}

/**
 * Certificate, issue/revoke events, enrollment patch, and audit row.
 *
 * A certificate may only come from a completed assessment on an approved
 * submission, and only after its completed enrollment. Revoked certificates
 * still point at that enrollment, so parity holds in both directions. The audit
 * row records the final serial, public code, and issue timestamp.
 */
export async function buildCertificateChain(
  ctx: MutationCtx,
  input: BuildCertificateChainInput,
): Promise<Id<"certificates">> {
  const assessment = await ctx.db.get(input.assessmentId)
  if (!assessment || assessment.status !== "completed") {
    throw new Error("Seed builder, certificate needs a completed assessment.")
  }
  const submission = await ctx.db.get(assessment.submissionId)
  if (!submission || submission.status !== "approved") {
    throw new Error("Seed builder, certificate needs an approved submission.")
  }
  const enrollmentId = input.enrollmentId ?? submission.enrollmentId
  const enrollment = await ctx.db.get(enrollmentId)
  if (!enrollment || enrollment.status !== "completed") {
    throw new Error("Seed builder, certificate needs a completed enrollment.")
  }
  if (
    enrollment.completedAt !== undefined &&
    input.issuedAt < enrollment.completedAt
  ) {
    throw new Error(
      "Seed builder, certificate issued before the enrollment completed.",
    )
  }
  if (input.issuedAt < assessment.createdAt) {
    throw new Error("Seed builder, certificate issued before the assessment.")
  }

  const duplicateSerial = await ctx.db
    .query("certificates")
    .withIndex("by_serial", (q) => q.eq("serial", input.serial))
    .first()
  const duplicateCode = await ctx.db
    .query("certificates")
    .withIndex("by_publicCode", (q) => q.eq("publicCode", input.publicCode))
    .first()
  if (duplicateSerial || duplicateCode) {
    throw new Error("Seed builder, certificate serial or public code reused.")
  }

  const [student, teacher, path] = await Promise.all([
    ctx.db.get(submission.studentId),
    ctx.db.get(assessment.assessorId),
    ctx.db
      .query("paths")
      .withIndex("by_slug", (q) => q.eq("slug", submission.pathId))
      .unique(),
  ])
  if (!student || !teacher) {
    throw new Error("Seed builder, certificate identity is incomplete.")
  }

  const status: CertificateStatus = input.status ?? "issued"
  if (status === "revoked") {
    if (input.revokedAt === undefined || input.revokedAt < input.issuedAt) {
      throw new Error("Seed builder, revoked certificate needs a valid revoke time.")
    }
  }

  const certificateId = await ctx.db.insert("certificates", {
    serial: input.serial,
    publicCode: input.publicCode,
    studentId: student._id,
    pathId: submission.pathId,
    teacherId: teacher._id,
    assessmentId: assessment._id,
    status,
    issuedAt: input.issuedAt,
    revokedAt: status === "revoked" ? input.revokedAt : undefined,
    revokeReason: status === "revoked" ? input.revokeReason : undefined,
    revokedBy: status === "revoked" ? input.revokedBy : undefined,
    snapshot: {
      studentName: student.name,
      pathTitle: path?.title ?? submission.pathId,
      teacherName: teacher.name,
      assessmentScore: assessment.score ?? 0,
      issuedAt: input.issuedAt,
    },
    createdAt: input.issuedAt,
    updatedAt: input.updatedAt ?? input.revokedAt ?? input.issuedAt,
  })

  await ctx.db.insert("certificateEvents", {
    certificateId,
    kind: "issue",
    actorId: teacher._id,
    reason: "Penilaian disetujui",
    createdAt: input.issuedAt,
  })
  if (status === "revoked") {
    await ctx.db.insert("certificateEvents", {
      certificateId,
      kind: "revoke",
      actorId: input.revokedBy ?? teacher._id,
      reason: input.revokeReason,
      createdAt: input.revokedAt as number,
    })
  }

  await ctx.db.patch(enrollmentId, {
    certificateId,
    updatedAt: input.updatedAt ?? input.revokedAt ?? input.issuedAt,
  })

  await ctx.db.insert("auditLogs", {
    actorId: input.actorId ?? teacher._id,
    actorRole: "Pengajar",
    action: "certificates.issue",
    entityType: "certificates",
    entityId: certificateId,
    reason: input.auditReason ?? "Penilaian disetujui",
    severity: "info",
    after: {
      serial: input.serial,
      publicCode: input.publicCode,
      issuedAt: input.issuedAt,
      status,
    },
    createdAt: input.issuedAt,
  })

  return certificateId
}

export type BuildSubmissionAssessmentInput = {
  code: string
  studentId: Id<"users">
  enrollmentId: Id<"enrollments">
  cohortId: Id<"cohorts">
  pathId: string
  taskTitle: string
  status: SubmissionStatus
  submittedAt?: number
  dueAt: number
  evidenceText?: string
  revisionCount: number
  createdAt?: number
  updatedAt?: number
  now: number
  escalatedAt?: number
  escalatedBy?: string
  escalationReason?: string
  asset?: {
    storageId: Id<"_storage">
    kind: Doc<"submissionAssets">["kind"]
    filename: string
    mimeType: string
    size: number
    createdAt?: number
  }
  assessment?: {
    assessorId: Id<"users">
    status: AssessmentStatus
    rubric: Doc<"assessments">["rubric"]
    score?: number
    feedback?: string
    assessedAt?: number
    createdAt?: number
    updatedAt?: number
    overrideReason?: string
    secondReviewerId?: Id<"users">
    events: Array<{
      kind: Doc<"assessmentEvents">["kind"]
      actorId: string
      reason?: string
      previousState?: string
      nextState?: string
      scoreBefore?: number
      scoreAfter?: number
      createdAt: number
    }>
  }
}

/**
 * Submission, evidence asset, assessment, and assessment events in causal
 * order. A submission gets at most one assessment; the builder rejects a
 * second one so duplicate grading cannot drift.
 */
export async function buildSubmissionAssessment(
  ctx: MutationCtx,
  input: BuildSubmissionAssessmentInput,
): Promise<{
  submissionId: Id<"submissions">
  assetId?: Id<"submissionAssets">
  assessmentId?: Id<"assessments">
}> {
  const submissionId = await ctx.db.insert("submissions", {
    code: input.code,
    studentId: input.studentId,
    enrollmentId: input.enrollmentId,
    cohortId: input.cohortId,
    pathId: input.pathId,
    taskTitle: input.taskTitle,
    status: input.status,
    submittedAt: input.submittedAt,
    dueAt: input.dueAt,
    evidenceText: input.evidenceText,
    assetIds: [],
    revisionCount: input.revisionCount,
    escalatedAt: input.escalatedAt,
    escalatedBy: input.escalatedBy,
    escalationReason: input.escalationReason,
    createdAt: input.createdAt ?? input.submittedAt ?? input.now,
    updatedAt: input.updatedAt ?? input.now,
  })

  let assetId: Id<"submissionAssets"> | undefined
  if (input.asset) {
    assetId = await ctx.db.insert("submissionAssets", {
      submissionId,
      storageId: input.asset.storageId,
      kind: input.asset.kind,
      filename: input.asset.filename,
      mimeType: input.asset.mimeType,
      size: input.asset.size,
      createdAt: input.asset.createdAt ?? input.submittedAt ?? input.now,
    })
    await ctx.db.patch(submissionId, { assetIds: [assetId] })
  }

  if (!input.assessment) return { submissionId, assetId }

  const existing = await ctx.db
    .query("assessments")
    .withIndex("by_submissionId", (q) => q.eq("submissionId", submissionId))
    .first()
  if (existing) {
    throw new Error("Seed builder, submission already has an assessment.")
  }

  const assessmentId = await ctx.db.insert("assessments", {
    submissionId,
    assessorId: input.assessment.assessorId,
    status: input.assessment.status,
    rubric: input.assessment.rubric,
    score: input.assessment.score,
    feedback: input.assessment.feedback,
    assessedAt: input.assessment.assessedAt,
    overrideReason: input.assessment.overrideReason,
    secondReviewerId: input.assessment.secondReviewerId,
    createdAt:
      input.assessment.createdAt ??
      input.assessment.assessedAt ??
      input.submittedAt ??
      input.now,
    updatedAt: input.assessment.updatedAt ?? input.now,
  })

  for (const event of input.assessment.events) {
    await ctx.db.insert("assessmentEvents", {
      assessmentId,
      submissionId,
      kind: event.kind,
      actorId: event.actorId,
      reason: event.reason,
      previousState: event.previousState,
      nextState: event.nextState,
      scoreBefore: event.scoreBefore,
      scoreAfter: event.scoreAfter,
      createdAt: event.createdAt,
    })
  }

  return { submissionId, assetId, assessmentId }
}

/** Latest assessment for a submission; duplicate historical rows never throw. */
export async function latestAssessmentForSubmission(
  ctx: MutationCtx,
  submissionId: Id<"submissions">,
): Promise<Doc<"assessments"> | undefined> {
  const rows = await ctx.db
    .query("assessments")
    .withIndex("by_submissionId", (q) => q.eq("submissionId", submissionId))
    .collect()
  return rows.sort((a, b) => b.createdAt - a.createdAt)[0]
}
