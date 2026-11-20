import { ConvexError } from "convex/values"

import type { Doc } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"

type SeedDb = Pick<QueryCtx, "db">

export type SeedSnapshot = {
  users: Doc<"users">[]
  sessions: Doc<"sessions">[]
  mediaAssets: Doc<"mediaAssets">[]
  contentRevisions: Doc<"contentRevisions">[]
  paths: Doc<"paths">[]
  pathModules: Doc<"pathModules">[]
  lessons: Doc<"lessons">[]
  teachers: Doc<"teachers">[]
  works: Doc<"works">[]
  workCards: Doc<"workCards">[]
  cohorts: Doc<"cohorts">[]
  cohortSessions: Doc<"cohortSessions">[]
  enrollments: Doc<"enrollments">[]
  lessonProgress: Doc<"lessonProgress">[]
  submissions: Doc<"submissions">[]
  submissionAssets: Doc<"submissionAssets">[]
  assessments: Doc<"assessments">[]
  assessmentEvents: Doc<"assessmentEvents">[]
  certificates: Doc<"certificates">[]
  certificateEvents: Doc<"certificateEvents">[]
  orders: Doc<"orders">[]
  orderItems: Doc<"orderItems">[]
  payments: Doc<"payments">[]
  paymentEvents: Doc<"paymentEvents">[]
  payouts: Doc<"payouts">[]
  refunds: Doc<"refunds">[]
  ledgerEntries: Doc<"ledgerEntries">[]
  leads: Doc<"leads">[]
  leadNotes: Doc<"leadNotes">[]
  leadAssignments: Doc<"leadAssignments">[]
  dailyMetrics: Doc<"dailyMetrics">[]
  metricDefinitions: Doc<"metricDefinitions">[]
  seedAuthAccounts: Doc<"seedAuthAccounts">[]
}

export type SeedViolation = {
  code: string
  severity: "error" | "warning"
  table: string
  rowId?: string
  message: string
  evidence?: Record<string, string | number | boolean | undefined>
}

const TOKEN_HASH = /^[0-9a-f]{64}$/
const PUBLIC_EMAIL = /^(?!.*(seed|growth|demo|example|test))[a-z0-9]+(\.[a-z0-9]+)*\d{2}@(gmail\.com|yahoo\.co\.id|outlook\.com)$/
const PUBLIC_PHONE = /^628\d{8,11}$/

export async function loadSeedSnapshot(ctx: SeedDb): Promise<SeedSnapshot> {
  const [
    users,
    sessions,
    mediaAssets,
    contentRevisions,
    paths,
    pathModules,
    lessons,
    teachers,
    works,
    workCards,
    cohorts,
    cohortSessions,
    enrollments,
    lessonProgress,
    submissions,
    submissionAssets,
    assessments,
    assessmentEvents,
    certificates,
    certificateEvents,
    orders,
    orderItems,
    payments,
    paymentEvents,
    payouts,
    refunds,
    ledgerEntries,
    leads,
    leadNotes,
    leadAssignments,
    dailyMetrics,
    metricDefinitions,
    seedAuthAccounts,
  ] = await Promise.all([
    ctx.db.query("users").collect(),
    ctx.db.query("sessions").collect(),
    ctx.db.query("mediaAssets").collect(),
    ctx.db.query("contentRevisions").collect(),
    ctx.db.query("paths").collect(),
    ctx.db.query("pathModules").collect(),
    ctx.db.query("lessons").collect(),
    ctx.db.query("teachers").collect(),
    ctx.db.query("works").collect(),
    ctx.db.query("workCards").collect(),
    ctx.db.query("cohorts").collect(),
    ctx.db.query("cohortSessions").collect(),
    ctx.db.query("enrollments").collect(),
    ctx.db.query("lessonProgress").collect(),
    ctx.db.query("submissions").collect(),
    ctx.db.query("submissionAssets").collect(),
    ctx.db.query("assessments").collect(),
    ctx.db.query("assessmentEvents").collect(),
    ctx.db.query("certificates").collect(),
    ctx.db.query("certificateEvents").collect(),
    ctx.db.query("orders").collect(),
    ctx.db.query("orderItems").collect(),
    ctx.db.query("payments").collect(),
    ctx.db.query("paymentEvents").collect(),
    ctx.db.query("payouts").collect(),
    ctx.db.query("refunds").collect(),
    ctx.db.query("ledgerEntries").collect(),
    ctx.db.query("leads").collect(),
    ctx.db.query("leadNotes").collect(),
    ctx.db.query("leadAssignments").collect(),
    ctx.db.query("dailyMetrics").collect(),
    ctx.db.query("metricDefinitions").collect(),
    ctx.db.query("seedAuthAccounts").collect(),
  ])

  return {
    users,
    sessions,
    mediaAssets,
    contentRevisions,
    paths,
    pathModules,
    lessons,
    teachers,
    works,
    workCards,
    cohorts,
    cohortSessions,
    enrollments,
    lessonProgress,
    submissions,
    submissionAssets,
    assessments,
    assessmentEvents,
    certificates,
    certificateEvents,
    orders,
    orderItems,
    payments,
    paymentEvents,
    payouts,
    refunds,
    ledgerEntries,
    leads,
    leadNotes,
    leadAssignments,
    dailyMetrics,
    metricDefinitions,
    seedAuthAccounts,
  }
}

function idSet<T extends { _id: string }>(rows: T[]): Set<string> {
  return new Set(rows.map((row) => row._id as string))
}

function violation(
  violations: SeedViolation[],
  input: Omit<SeedViolation, "severity"> & {
    severity?: SeedViolation["severity"]
  },
) {
  violations.push({ severity: "error", ...input })
}

function checkRef(
  violations: SeedViolation[],
  input: {
    code: string
    table: string
    rowId: string
    field: string
    value: string | undefined
    target: Set<string>
    targetTable: string
  },
) {
  if (input.value === undefined) return
  if (input.target.has(input.value)) return
  violation(violations, {
    code: input.code,
    table: input.table,
    rowId: input.rowId,
    message: `${input.table}.${input.field} points at a missing ${input.targetTable}.`,
    evidence: { [input.field]: input.value },
  })
}

function checkUnique(
  violations: SeedViolation[],
  input: {
    code: string
    table: string
    field: string
    rows: Array<{ _id: string; value: string | number }>
  },
) {
  const seen = new Map<string, string>()
  for (const row of input.rows) {
    const key = String(row.value)
    const existing = seen.get(key)
    if (existing) {
      violation(violations, {
        code: input.code,
        table: input.table,
        rowId: row._id,
        message: `${input.table}.${input.field} "${key}" is duplicated.`,
        evidence: { firstRowId: existing, duplicateRowId: row._id },
      })
    } else {
      seen.set(key, row._id)
    }
  }
}

export function checkSeedIntegrity(snapshot: SeedSnapshot): SeedViolation[] {
  const violations: SeedViolation[] = []
  const userIds = idSet(snapshot.users)
  const sessionUserIds = idSet(snapshot.users)
  const pathSlugs = new Set(snapshot.paths.map((row) => row.slug))
  const moduleIds = idSet(snapshot.pathModules)
  const lessonIds = idSet(snapshot.lessons)
  const workIds = idSet(snapshot.works)
  const cohortIds = idSet(snapshot.cohorts)
  const enrollmentIds = idSet(snapshot.enrollments)
  const submissionIds = idSet(snapshot.submissions)
  const assetIds = idSet(snapshot.submissionAssets)
  const mediaAssetIds = idSet(snapshot.mediaAssets)
  const activeMediaAssetIds = new Set(
    snapshot.mediaAssets
      .filter((row) => row.status === "active")
      .map((row) => row._id as string),
  )
  const assessmentIds = idSet(snapshot.assessments)
  const certificateIds = idSet(snapshot.certificates)
  const orderIds = idSet(snapshot.orders)
  const paymentIds = idSet(snapshot.payments)
  const payoutIds = idSet(snapshot.payouts)
  const refundIds = idSet(snapshot.refunds)
  const leadIds = idSet(snapshot.leads)

  // Foreign keys ---------------------------------------------------------
  for (const row of snapshot.sessions) {
    checkRef(violations, {
      code: "FK_SESSION_USER",
      table: "sessions",
      rowId: row._id,
      field: "userId",
      value: row.userId,
      target: sessionUserIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.pathModules) {
    checkRef(violations, {
      code: "FK_MODULE_PATH",
      table: "pathModules",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
  }
  for (const row of snapshot.lessons) {
    checkRef(violations, {
      code: "FK_LESSON_MODULE",
      table: "lessons",
      rowId: row._id,
      field: "moduleId",
      value: row.moduleId,
      target: moduleIds,
      targetTable: "pathModules",
    })
    checkRef(violations, {
      code: "FK_LESSON_PATH",
      table: "lessons",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
  }
  for (const row of snapshot.teachers) {
    checkRef(violations, {
      code: "FK_TEACHER_USER",
      table: "teachers",
      rowId: row._id,
      field: "userId",
      value: row.userId,
      target: userIds,
      targetTable: "users",
    })
    for (const pathId of row.pathIds ?? []) {
      checkRef(violations, {
        code: "FK_TEACHER_PATH",
        table: "teachers",
        rowId: row._id,
        field: "pathIds",
        value: pathId,
        target: pathSlugs,
        targetTable: "paths",
      })
    }
  }
  for (const row of snapshot.works) {
    checkRef(violations, {
      code: "FK_WORK_MAKER",
      table: "works",
      rowId: row._id,
      field: "makerId",
      value: row.makerId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_WORK_PATH",
      table: "works",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
    checkRef(violations, {
      code: "FK_WORK_CERTIFICATE",
      table: "works",
      rowId: row._id,
      field: "certificateId",
      value: row.certificateId,
      target: certificateIds,
      targetTable: "certificates",
    })
  }
  for (const row of snapshot.paths) {
    checkRef(violations, {
      code: "FK_PATH_MEDIA",
      table: "paths",
      rowId: row._id,
      field: "imageAssetId",
      value: row.imageAssetId,
      target: mediaAssetIds,
      targetTable: "mediaAssets",
    })
  }
  for (const row of snapshot.teachers) {
    checkRef(violations, {
      code: "FK_TEACHER_MEDIA",
      table: "teachers",
      rowId: row._id,
      field: "imageAssetId",
      value: row.imageAssetId,
      target: mediaAssetIds,
      targetTable: "mediaAssets",
    })
  }
  for (const row of snapshot.works) {
    checkRef(violations, {
      code: "FK_WORK_MEDIA",
      table: "works",
      rowId: row._id,
      field: "imageAssetId",
      value: row.imageAssetId,
      target: mediaAssetIds,
      targetTable: "mediaAssets",
    })
  }
  for (const row of snapshot.lessons) {
    for (const assetId of row.mediaAssetIds) {
      checkRef(violations, {
        code: "FK_LESSON_MEDIA",
        table: "lessons",
        rowId: row._id,
        field: "mediaAssetIds",
        value: assetId,
        target: mediaAssetIds,
        targetTable: "mediaAssets",
      })
    }
  }
  const referencedMedia = new Set<string>()
  for (const row of snapshot.paths) {
    if (row.imageAssetId) referencedMedia.add(row.imageAssetId)
  }
  for (const row of snapshot.teachers) {
    if (row.imageAssetId) referencedMedia.add(row.imageAssetId)
  }
  for (const row of snapshot.works) {
    if (row.imageAssetId) referencedMedia.add(row.imageAssetId)
  }
  for (const row of snapshot.lessons) {
    for (const assetId of row.mediaAssetIds) referencedMedia.add(assetId)
  }
  for (const assetId of referencedMedia) {
    if (mediaAssetIds.has(assetId) && !activeMediaAssetIds.has(assetId)) {
      violation(violations, {
        code: "MEDIA_REFERENCED_ARCHIVED",
        table: "mediaAssets",
        rowId: assetId,
        message: "A content row references an archived media asset.",
      })
    }
  }

  for (const row of snapshot.workCards) {
    checkRef(violations, {
      code: "FK_CARD_WORK",
      table: "workCards",
      rowId: row._id,
      field: "workId",
      value: row.workId,
      target: workIds,
      targetTable: "works",
    })
    checkRef(violations, {
      code: "FK_CARD_CERTIFICATE",
      table: "workCards",
      rowId: row._id,
      field: "certificateId",
      value: row.certificateId,
      target: certificateIds,
      targetTable: "certificates",
    })
    checkRef(violations, {
      code: "FK_CARD_MAKER",
      table: "workCards",
      rowId: row._id,
      field: "makerId",
      value: row.makerId,
      target: userIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.cohorts) {
    checkRef(violations, {
      code: "FK_COHORT_PATH",
      table: "cohorts",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
    checkRef(violations, {
      code: "FK_COHORT_TEACHER",
      table: "cohorts",
      rowId: row._id,
      field: "teacherId",
      value: row.teacherId,
      target: userIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.cohortSessions) {
    checkRef(violations, {
      code: "FK_SESSION_COHORT",
      table: "cohortSessions",
      rowId: row._id,
      field: "cohortId",
      value: row.cohortId,
      target: cohortIds,
      targetTable: "cohorts",
    })
  }
  for (const row of snapshot.enrollments) {
    checkRef(violations, {
      code: "FK_ENROLLMENT_STUDENT",
      table: "enrollments",
      rowId: row._id,
      field: "studentId",
      value: row.studentId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_ENROLLMENT_COHORT",
      table: "enrollments",
      rowId: row._id,
      field: "cohortId",
      value: row.cohortId,
      target: cohortIds,
      targetTable: "cohorts",
    })
    checkRef(violations, {
      code: "FK_ENROLLMENT_PATH",
      table: "enrollments",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
    checkRef(violations, {
      code: "FK_ENROLLMENT_CERTIFICATE",
      table: "enrollments",
      rowId: row._id,
      field: "certificateId",
      value: row.certificateId,
      target: certificateIds,
      targetTable: "certificates",
    })
  }
  for (const row of snapshot.lessonProgress) {
    checkRef(violations, {
      code: "FK_PROGRESS_USER",
      table: "lessonProgress",
      rowId: row._id,
      field: "userId",
      value: row.userId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_PROGRESS_ENROLLMENT",
      table: "lessonProgress",
      rowId: row._id,
      field: "enrollmentId",
      value: row.enrollmentId,
      target: enrollmentIds,
      targetTable: "enrollments",
    })
    checkRef(violations, {
      code: "FK_PROGRESS_LESSON",
      table: "lessonProgress",
      rowId: row._id,
      field: "lessonId",
      value: row.lessonId,
      target: lessonIds,
      targetTable: "lessons",
    })
  }
  for (const row of snapshot.submissions) {
    checkRef(violations, {
      code: "FK_SUBMISSION_STUDENT",
      table: "submissions",
      rowId: row._id,
      field: "studentId",
      value: row.studentId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_SUBMISSION_ENROLLMENT",
      table: "submissions",
      rowId: row._id,
      field: "enrollmentId",
      value: row.enrollmentId,
      target: enrollmentIds,
      targetTable: "enrollments",
    })
    checkRef(violations, {
      code: "FK_SUBMISSION_COHORT",
      table: "submissions",
      rowId: row._id,
      field: "cohortId",
      value: row.cohortId,
      target: cohortIds,
      targetTable: "cohorts",
    })
    checkRef(violations, {
      code: "FK_SUBMISSION_PATH",
      table: "submissions",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
    for (const assetId of row.assetIds) {
      checkRef(violations, {
        code: "FK_SUBMISSION_ASSET",
        table: "submissions",
        rowId: row._id,
        field: "assetIds",
        value: assetId,
        target: assetIds,
        targetTable: "submissionAssets",
      })
    }
  }
  for (const row of snapshot.submissionAssets) {
    checkRef(violations, {
      code: "FK_ASSET_SUBMISSION",
      table: "submissionAssets",
      rowId: row._id,
      field: "submissionId",
      value: row.submissionId,
      target: submissionIds,
      targetTable: "submissions",
    })
  }
  for (const row of snapshot.assessments) {
    checkRef(violations, {
      code: "FK_ASSESSMENT_SUBMISSION",
      table: "assessments",
      rowId: row._id,
      field: "submissionId",
      value: row.submissionId,
      target: submissionIds,
      targetTable: "submissions",
    })
    checkRef(violations, {
      code: "FK_ASSESSMENT_ASSESSOR",
      table: "assessments",
      rowId: row._id,
      field: "assessorId",
      value: row.assessorId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_ASSESSMENT_REVIEWER",
      table: "assessments",
      rowId: row._id,
      field: "secondReviewerId",
      value: row.secondReviewerId,
      target: userIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.assessmentEvents) {
    checkRef(violations, {
      code: "FK_ASSESSMENT_EVENT_ASSESSMENT",
      table: "assessmentEvents",
      rowId: row._id,
      field: "assessmentId",
      value: row.assessmentId,
      target: assessmentIds,
      targetTable: "assessments",
    })
    checkRef(violations, {
      code: "FK_ASSESSMENT_EVENT_SUBMISSION",
      table: "assessmentEvents",
      rowId: row._id,
      field: "submissionId",
      value: row.submissionId,
      target: submissionIds,
      targetTable: "submissions",
    })
  }
  for (const row of snapshot.certificates) {
    checkRef(violations, {
      code: "FK_CERTIFICATE_STUDENT",
      table: "certificates",
      rowId: row._id,
      field: "studentId",
      value: row.studentId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_CERTIFICATE_PATH",
      table: "certificates",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
    checkRef(violations, {
      code: "FK_CERTIFICATE_TEACHER",
      table: "certificates",
      rowId: row._id,
      field: "teacherId",
      value: row.teacherId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_CERTIFICATE_ASSESSMENT",
      table: "certificates",
      rowId: row._id,
      field: "assessmentId",
      value: row.assessmentId,
      target: assessmentIds,
      targetTable: "assessments",
    })
    checkRef(violations, {
      code: "FK_CERTIFICATE_REPLACED",
      table: "certificates",
      rowId: row._id,
      field: "replacedBy",
      value: row.replacedBy,
      target: certificateIds,
      targetTable: "certificates",
    })
  }
  for (const row of snapshot.certificateEvents) {
    checkRef(violations, {
      code: "FK_CERTIFICATE_EVENT",
      table: "certificateEvents",
      rowId: row._id,
      field: "certificateId",
      value: row.certificateId,
      target: certificateIds,
      targetTable: "certificates",
    })
  }
  for (const row of snapshot.orders) {
    checkRef(violations, {
      code: "FK_ORDER_BUYER",
      table: "orders",
      rowId: row._id,
      field: "buyerUserId",
      value: row.buyerUserId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_ORDER_SELLER",
      table: "orders",
      rowId: row._id,
      field: "sellerId",
      value: row.sellerId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_ORDER_WORK",
      table: "orders",
      rowId: row._id,
      field: "workId",
      value: row.workId,
      target: workIds,
      targetTable: "works",
    })
    checkRef(violations, {
      code: "FK_ORDER_PATH",
      table: "orders",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
  }
  for (const row of snapshot.orderItems) {
    checkRef(violations, {
      code: "FK_ITEM_ORDER",
      table: "orderItems",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
    checkRef(violations, {
      code: "FK_ITEM_PATH",
      table: "orderItems",
      rowId: row._id,
      field: "pathId",
      value: row.pathId,
      target: pathSlugs,
      targetTable: "paths",
    })
  }
  for (const row of snapshot.payments) {
    checkRef(violations, {
      code: "FK_PAYMENT_ORDER",
      table: "payments",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
  }
  for (const row of snapshot.paymentEvents) {
    checkRef(violations, {
      code: "FK_PAYMENT_EVENT_PAYMENT",
      table: "paymentEvents",
      rowId: row._id,
      field: "paymentId",
      value: row.paymentId,
      target: paymentIds,
      targetTable: "payments",
    })
    checkRef(violations, {
      code: "FK_PAYMENT_EVENT_ORDER",
      table: "paymentEvents",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
  }
  for (const row of snapshot.payouts) {
    checkRef(violations, {
      code: "FK_PAYOUT_TEACHER",
      table: "payouts",
      rowId: row._id,
      field: "teacherId",
      value: row.teacherId,
      target: userIds,
      targetTable: "users",
    })
    checkRef(violations, {
      code: "FK_PAYOUT_ORDER",
      table: "payouts",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
    checkRef(violations, {
      code: "FK_PAYOUT_PAYMENT",
      table: "payouts",
      rowId: row._id,
      field: "paymentId",
      value: row.paymentId,
      target: paymentIds,
      targetTable: "payments",
    })
    checkRef(violations, {
      code: "FK_PAYOUT_REVERSAL",
      table: "payouts",
      rowId: row._id,
      field: "reversalOf",
      value: row.reversalOf,
      target: payoutIds,
      targetTable: "payouts",
    })
  }
  for (const row of snapshot.refunds) {
    checkRef(violations, {
      code: "FK_REFUND_ORDER",
      table: "refunds",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
    checkRef(violations, {
      code: "FK_REFUND_PAYMENT",
      table: "refunds",
      rowId: row._id,
      field: "paymentId",
      value: row.paymentId,
      target: paymentIds,
      targetTable: "payments",
    })
    checkRef(violations, {
      code: "FK_REFUND_REQUESTER",
      table: "refunds",
      rowId: row._id,
      field: "requestedBy",
      value: row.requestedBy,
      target: userIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.ledgerEntries) {
    checkRef(violations, {
      code: "FK_LEDGER_ORDER",
      table: "ledgerEntries",
      rowId: row._id,
      field: "orderId",
      value: row.orderId,
      target: orderIds,
      targetTable: "orders",
    })
    checkRef(violations, {
      code: "FK_LEDGER_PAYMENT",
      table: "ledgerEntries",
      rowId: row._id,
      field: "paymentId",
      value: row.paymentId,
      target: paymentIds,
      targetTable: "payments",
    })
    checkRef(violations, {
      code: "FK_LEDGER_PAYOUT",
      table: "ledgerEntries",
      rowId: row._id,
      field: "payoutId",
      value: row.payoutId,
      target: payoutIds,
      targetTable: "payouts",
    })
    checkRef(violations, {
      code: "FK_LEDGER_REFUND",
      table: "ledgerEntries",
      rowId: row._id,
      field: "refundId",
      value: row.refundId,
      target: refundIds,
      targetTable: "refunds",
    })
    checkRef(violations, {
      code: "FK_LEDGER_TEACHER",
      table: "ledgerEntries",
      rowId: row._id,
      field: "teacherId",
      value: row.teacherId,
      target: userIds,
      targetTable: "users",
    })
  }
  for (const row of snapshot.leadNotes) {
    checkRef(violations, {
      code: "FK_LEAD_NOTE_LEAD",
      table: "leadNotes",
      rowId: row._id,
      field: "leadId",
      value: row.leadId,
      target: leadIds,
      targetTable: "leads",
    })
  }
  for (const row of snapshot.leadAssignments) {
    checkRef(violations, {
      code: "FK_LEAD_ASSIGNMENT_LEAD",
      table: "leadAssignments",
      rowId: row._id,
      field: "leadId",
      value: row.leadId,
      target: leadIds,
      targetTable: "leads",
    })
    checkRef(violations, {
      code: "FK_LEAD_ASSIGNMENT_OWNER",
      table: "leadAssignments",
      rowId: row._id,
      field: "ownerId",
      value: row.ownerId,
      target: userIds,
      targetTable: "users",
    })
  }

  // Renumbered text references ------------------------------------------
  const orderCodes = new Set(snapshot.orders.map((row) => row.code))
  const codePattern = /KN-\d{4}-\d{6}/g
  const checkCodeText = (input: {
    table: string
    rowId: string
    field: string
    value: string | undefined
  }) => {
    if (!input.value) return
    for (const code of input.value.match(codePattern) ?? []) {
      if (orderCodes.has(code)) continue
      violation(violations, {
        code: "FK_ORDER_CODE_TEXT",
        table: input.table,
        rowId: input.rowId,
        message: `${input.table}.${input.field} references missing order ${code}.`,
        evidence: { [input.field]: input.value, code },
      })
    }
  }
  for (const row of snapshot.orders) {
    checkCodeText({
      table: "orders",
      rowId: row._id,
      field: "idempotencyKey",
      value: row.idempotencyKey,
    })
  }
  for (const row of snapshot.payments) {
    checkCodeText({
      table: "payments",
      rowId: row._id,
      field: "providerReference",
      value: row.providerReference,
    })
    checkCodeText({
      table: "payments",
      rowId: row._id,
      field: "providerChargeId",
      value: row.providerChargeId,
    })
    checkCodeText({
      table: "payments",
      rowId: row._id,
      field: "qrString",
      value: row.qrString,
    })
    checkCodeText({
      table: "payments",
      rowId: row._id,
      field: "idempotencyKey",
      value: row.idempotencyKey,
    })
  }
  for (const row of snapshot.paymentEvents) {
    checkCodeText({
      table: "paymentEvents",
      rowId: row._id,
      field: "eventId",
      value: row.eventId,
    })
    checkCodeText({
      table: "paymentEvents",
      rowId: row._id,
      field: "providerReference",
      value: row.providerReference,
    })
  }
  for (const row of snapshot.payouts) {
    checkCodeText({
      table: "payouts",
      rowId: row._id,
      field: "reference",
      value: row.reference,
    })
  }

  // Uniqueness -----------------------------------------------------------
  checkUnique(violations, {
    code: "UNIQUE_USER_EMAIL",
    table: "users",
    field: "email",
    rows: snapshot.users.map((row) => ({ _id: row._id, value: row.email })),
  })
  checkUnique(violations, {
    code: "UNIQUE_USER_PHONE",
    table: "users",
    field: "phone",
    rows: snapshot.users.map((row) => ({ _id: row._id, value: row.phone })),
  })
  checkUnique(violations, {
    code: "UNIQUE_USER_AUTH",
    table: "users",
    field: "authUserId",
    rows: snapshot.users.map((row) => ({
      _id: row._id,
      value: row.authUserId,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_ORDER_CODE",
    table: "orders",
    field: "code",
    rows: snapshot.orders.map((row) => ({ _id: row._id, value: row.code })),
  })
  checkUnique(violations, {
    code: "UNIQUE_PAYMENT_AMOUNT",
    table: "payments",
    field: "uniqueAmount",
    rows: snapshot.payments.map((row) => ({
      _id: row._id,
      value: row.uniqueAmount,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_CERTIFICATE_SERIAL",
    table: "certificates",
    field: "serial",
    rows: snapshot.certificates.map((row) => ({
      _id: row._id,
      value: row.serial,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_CERTIFICATE_CODE",
    table: "certificates",
    field: "publicCode",
    rows: snapshot.certificates.map((row) => ({
      _id: row._id,
      value: row.publicCode,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_COHORT_CODE",
    table: "cohorts",
    field: "code",
    rows: snapshot.cohorts.map((row) => ({ _id: row._id, value: row.code })),
  })
  checkUnique(violations, {
    code: "UNIQUE_PATH_SLUG",
    table: "paths",
    field: "slug",
    rows: snapshot.paths.map((row) => ({ _id: row._id, value: row.slug })),
  })
  checkUnique(violations, {
    code: "UNIQUE_WORK_SLUG",
    table: "works",
    field: "slug",
    rows: snapshot.works.map((row) => ({ _id: row._id, value: row.slug })),
  })
  checkUnique(violations, {
    code: "UNIQUE_WORK_CARD_SERIAL",
    table: "workCards",
    field: "serial",
    rows: snapshot.workCards.map((row) => ({
      _id: row._id,
      value: row.serial,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_METRIC_DAY",
    table: "dailyMetrics",
    field: "metricKey+date",
    rows: snapshot.dailyMetrics.map((row) => ({
      _id: row._id,
      value: `${row.metricKey}:${row.date}`,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_METRIC_KEY",
    table: "metricDefinitions",
    field: "key",
    rows: snapshot.metricDefinitions.map((row) => ({
      _id: row._id,
      value: row.key,
    })),
  })
  checkUnique(violations, {
    code: "UNIQUE_MEDIA_ACTIVE_FILENAME",
    table: "mediaAssets",
    field: "filename",
    rows: snapshot.mediaAssets
      .filter((row) => row.status === "active")
      .map((row) => ({ _id: row._id, value: row.filename })),
  })

  for (const revision of snapshot.contentRevisions) {
    if (revision.status !== "scheduled") continue
    if (revision.scheduledFor === undefined) {
      violation(violations, {
        code: "CONTENT_SCHEDULED_FOR_MISSING",
        table: "contentRevisions",
        rowId: revision._id,
        message: `Scheduled revision v${revision.version} has no scheduledFor.`,
      })
    }
  }

  // Lookup maps ----------------------------------------------------------
  const enrollmentById = new Map(
    snapshot.enrollments.map((row) => [row._id as string, row]),
  )
  const cohortById = new Map(
    snapshot.cohorts.map((row) => [row._id as string, row]),
  )
  const assessmentById = new Map(
    snapshot.assessments.map((row) => [row._id as string, row]),
  )
  const orderById = new Map(
    snapshot.orders.map((row) => [row._id as string, row]),
  )
  const paymentByOrder = new Map(
    snapshot.payments.map((row) => [row.orderId as string, row]),
  )
  const itemByOrder = new Map(
    snapshot.orderItems.map((row) => [row.orderId as string, row]),
  )
  const earliestSubmission = new Map<string, number>()
  for (const submission of snapshot.submissions) {
    if (submission.submittedAt === undefined) continue
    const key = submission.enrollmentId as string
    earliestSubmission.set(
      key,
      Math.min(earliestSubmission.get(key) ?? submission.submittedAt, submission.submittedAt),
    )
  }
  const ledgerByOrder = new Map<string, Doc<"ledgerEntries">[]>()
  for (const entry of snapshot.ledgerEntries) {
    if (!entry.orderId) continue
    const rows = ledgerByOrder.get(entry.orderId) ?? []
    rows.push(entry)
    ledgerByOrder.set(entry.orderId, rows)
  }

  // Chronology, money, and status --------------------------------------
  for (const order of snapshot.orders) {
    if (order.paidAt !== undefined && order.paidAt < order.createdAt) {
      violation(violations, {
        code: "CHRONO_ORDER_PAID",
        table: "orders",
        rowId: order._id,
        message: `${order.code} was paid before it was created.`,
      })
    }
    if (
      order.deliveredAt !== undefined &&
      order.paidAt !== undefined &&
      order.deliveredAt < order.paidAt
    ) {
      violation(violations, {
        code: "CHRONO_ORDER_DELIVERED",
        table: "orders",
        rowId: order._id,
        message: `${order.code} was delivered before payment.`,
      })
    }
    if (
      order.completedAt !== undefined &&
      order.deliveredAt !== undefined &&
      order.completedAt < order.deliveredAt
    ) {
      violation(violations, {
        code: "CHRONO_ORDER_COMPLETED",
        table: "orders",
        rowId: order._id,
        message: `${order.code} completed before delivery.`,
      })
    }
    if (order.cancelledAt !== undefined && order.status !== "cancelled") {
      violation(violations, {
        code: "STATUS_ORDER_CANCELLED_AT",
        table: "orders",
        rowId: order._id,
        message: `${order.code} has cancelledAt without cancelled status.`,
      })
    }
    if (order.status === "cancelled" && order.cancelledAt === undefined) {
      violation(violations, {
        code: "STATUS_ORDER_CANCELLED_MISSING",
        table: "orders",
        rowId: order._id,
        message: `${order.code} is cancelled without cancelledAt.`,
      })
    }
    if (
      order.cancelledAt !== undefined &&
      order.paidAt !== undefined &&
      order.cancelledAt <= order.paidAt
    ) {
      violation(violations, {
        code: "CHRONO_ORDER_CANCELLED",
        table: "orders",
        rowId: order._id,
        message: `${order.code} was cancelled before or at the instant it was paid.`,
        evidence: { paidAt: order.paidAt, cancelledAt: order.cancelledAt },
      })
    }
    if (
      order.status === "refunded" &&
      !snapshot.refunds.some((refund) => refund.orderId === order._id)
    ) {
      violation(violations, {
        code: "STATUS_ORDER_REFUND_MISSING",
        table: "orders",
        rowId: order._id,
        message: `${order.code} is refunded without a refund row.`,
      })
    }

    const item = itemByOrder.get(order._id as string)
    const payment = paymentByOrder.get(order._id as string)
    if (!item) {
      violation(violations, {
        code: "MONEY_ORDER_ITEM_MISSING",
        table: "orders",
        rowId: order._id,
        message: `${order.code} has no order item.`,
      })
    } else if (
      item.totalAmount !== order.baseAmount ||
      item.unitAmount !== order.baseAmount
    ) {
      violation(violations, {
        code: "MONEY_ORDER_ITEM",
        table: "orders",
        rowId: order._id,
        message: `${order.code} item does not match the order base amount.`,
        evidence: { baseAmount: order.baseAmount, totalAmount: item.totalAmount },
      })
    }
    if (!payment) {
      violation(violations, {
        code: "MONEY_ORDER_PAYMENT_MISSING",
        table: "orders",
        rowId: order._id,
        message: `${order.code} has no payment.`,
      })
    } else {
      if (
        payment.baseAmount !== order.baseAmount ||
        payment.uniqueAmount !== order.uniqueAmount
      ) {
        violation(violations, {
          code: "MONEY_ORDER_PAYMENT",
          table: "orders",
          rowId: order._id,
          message: `${order.code} payment amounts do not match the order.`,
          evidence: {
            orderBase: order.baseAmount,
            paymentBase: payment.baseAmount,
            orderUnique: order.uniqueAmount,
            paymentUnique: payment.uniqueAmount,
          },
        })
      }
      if (
        order.uniqueAmount !== undefined &&
        (order.uniqueAmount - order.baseAmount < 1 ||
          order.uniqueAmount - order.baseAmount > 999)
      ) {
        violation(violations, {
          code: "MONEY_UNIQUE_OFFSET",
          table: "orders",
          rowId: order._id,
          message: `${order.code} unique offset is outside 1..999.`,
        })
      }
      if (payment.paidAt !== order.paidAt) {
        violation(violations, {
          code: "CHRONO_ORDER_PAYMENT_PAID_AT",
          table: "orders",
          rowId: order._id,
          message: `${order.code} order and payment paidAt differ.`,
        })
      }
    }
    if (order.tokenHash !== undefined && !TOKEN_HASH.test(order.tokenHash)) {
      violation(violations, {
        code: "TOKEN_HASH",
        table: "orders",
        rowId: order._id,
        message: `${order.code} tokenHash is not a SHA-256 hex digest.`,
      })
    }

    const entries = ledgerByOrder.get(order._id as string) ?? []
    const saleCredits = entries.filter(
      (entry) => entry.entryType === "sale" && entry.direction === "credit",
    )
    const creditTotal = saleCredits.reduce(
      (total, entry) => total + entry.amount,
      0,
    )
    if (saleCredits.length > 0 && creditTotal !== order.baseAmount) {
      violation(violations, {
        code: "MONEY_LEDGER_CREDITS",
        table: "ledgerEntries",
        rowId: order._id,
        message: `${order.code} sale credits do not equal the base amount.`,
        evidence: { creditTotal, baseAmount: order.baseAmount },
      })
    }
    if (
      saleCredits.length > 0 &&
      !entries.some(
        (entry) =>
          entry.account === "gateway_fee" && entry.entryType === "sale",
      )
    ) {
      violation(violations, {
        code: "MONEY_GATEWAY_DEBIT_MISSING",
        table: "ledgerEntries",
        rowId: order._id,
        message: `${order.code} has no gateway-fee debit entry.`,
      })
    }
    const paidSalePayouts = snapshot.payouts.filter(
      (payout) =>
        payout.orderId === order._id &&
        payout.kind === "sale" &&
        payout.status === "paid",
    )
    const teacherPayoutDebits = entries.filter(
      (entry) =>
        entry.account === "teacher" &&
        entry.entryType === "payout" &&
        entry.direction === "debit",
    )
    const expectedPayoutDebit = paidSalePayouts.reduce(
      (total, payout) => total + payout.teacherShare,
      0,
    )
    const actualPayoutDebit = teacherPayoutDebits.reduce(
      (total, entry) => total + entry.amount,
      0,
    )
    if (actualPayoutDebit !== expectedPayoutDebit) {
      violation(violations, {
        code: "MONEY_TEACHER_PAYOUT_DEBIT",
        table: "ledgerEntries",
        rowId: order._id,
        message: `${order.code} teacher payout debits do not match paid payouts.`,
        evidence: { expectedPayoutDebit, actualPayoutDebit },
      })
    }
  }

  for (const payment of snapshot.payments) {
    if (payment.paidAt !== undefined && payment.paidAt < payment.createdAt) {
      violation(violations, {
        code: "CHRONO_PAYMENT_PAID",
        table: "payments",
        rowId: payment._id,
        message: "Payment was settled before it was created.",
      })
    }
    if (
      (payment.status === "paid" || payment.status === "refunded") &&
      payment.paidAt === undefined
    ) {
      violation(violations, {
        code: "STATUS_PAYMENT_PAID_AT",
        table: "payments",
        rowId: payment._id,
        message: "Settled payment has no paidAt.",
      })
    }
  }

  for (const payout of snapshot.payouts) {
    if (payout.dueAt === undefined) {
      violation(violations, {
        code: "PAYOUT_DUE_MISSING",
        table: "payouts",
        rowId: payout._id,
        message: "Payout has no dueAt.",
      })
    }
    if (payout.status === "paid") {
      if (payout.paidAt === undefined) {
        violation(violations, {
          code: "STATUS_PAYOUT_PAID_AT",
          table: "payouts",
          rowId: payout._id,
          message: "Paid payout has no paidAt.",
        })
      }
      if (
        payout.dueAt !== undefined &&
        payout.paidAt !== undefined &&
        payout.dueAt < payout.paidAt
      ) {
        violation(violations, {
          code: "CHRONO_PAYOUT_DUE",
          table: "payouts",
          rowId: payout._id,
          message: "Paid payout is due before it was paid.",
        })
      }
      if (payout.paidAmount !== payout.teacherShare) {
        violation(violations, {
          code: "MONEY_PAYOUT_PAID_AMOUNT",
          table: "payouts",
          rowId: payout._id,
          message: "Paid payout amount does not equal the teacher share.",
        })
      }
    }
    if (
      payout.teacherShare + payout.platformShare + payout.communityShare !==
      payout.gross
    ) {
      violation(violations, {
        code: "MONEY_PAYOUT_SPLIT",
        table: "payouts",
        rowId: payout._id,
        message: "Payout shares do not sum to gross.",
      })
    }
    if (payout.kind === "sale" && payout.orderId) {
      const order = orderById.get(payout.orderId as string)
      if (order && payout.gross !== order.baseAmount) {
        violation(violations, {
          code: "MONEY_PAYOUT_GROSS",
          table: "payouts",
          rowId: payout._id,
          message: "Sale payout gross does not equal the order base amount.",
        })
      }
    }
    if (payout.kind === "reversal" && payout.dueAt === undefined) {
      violation(violations, {
        code: "PAYOUT_REVERSAL_DUE",
        table: "payouts",
        rowId: payout._id,
        message: "Reversal payout has no dueAt.",
      })
    }
  }

  for (const refund of snapshot.refunds) {
    const order = orderById.get(refund.orderId as string)
    if (order && refund.amount > order.baseAmount) {
      violation(violations, {
        code: "MONEY_REFUND_EXCEEDS_BASE",
        table: "refunds",
        rowId: refund._id,
        message: "Refund exceeds the order base amount.",
      })
    }
    if (
      refund.paidAt !== undefined &&
      refund.paidAt < refund.createdAt
    ) {
      violation(violations, {
        code: "CHRONO_REFUND_PAID",
        table: "refunds",
        rowId: refund._id,
        message: "Refund was paid before it was created.",
      })
    }
    if (
      refund.reviewedAt !== undefined &&
      refund.reviewedAt < refund.createdAt
    ) {
      violation(violations, {
        code: "CHRONO_REFUND_REVIEWED",
        table: "refunds",
        rowId: refund._id,
        message: "Refund was reviewed before it was created.",
      })
    }
    if (
      refund.paidAt !== undefined &&
      refund.reviewedAt !== undefined &&
      refund.paidAt < refund.reviewedAt
    ) {
      violation(violations, {
        code: "CHRONO_REFUND_PAID_REVIEW",
        table: "refunds",
        rowId: refund._id,
        message: "Refund was paid before review.",
      })
    }
    const reversalTotal = snapshot.ledgerEntries
      .filter((entry) => entry.refundId === refund._id)
      .reduce((total, entry) => total + entry.amount, 0)
    if (reversalTotal !== refund.amount) {
      violation(violations, {
        code: "MONEY_REFUND_REVERSAL",
        table: "refunds",
        rowId: refund._id,
        message: "Reversal ledger does not equal the refund amount.",
        evidence: { refundAmount: refund.amount, reversalTotal },
      })
    }
  }

  for (const enrollment of snapshot.enrollments) {
    if (enrollment.status !== "pending_payment") {
      const classOrders = snapshot.orders.filter(
        (order) =>
          order.buyerUserId === enrollment.studentId &&
          order.pathId === enrollment.pathId &&
          itemByOrder.get(order._id as string)?.kind === "path",
      )
      if (classOrders.length === 0) {
        violation(violations, {
          code: "ENROLLMENT_ORDER_MISSING",
          table: "enrollments",
          rowId: enrollment._id,
          message: "Paid enrollment has no matching class order.",
        })
      } else if (
        !classOrders.some((order) =>
          snapshot.payments.some((payment) => payment.orderId === order._id),
        )
      ) {
        violation(violations, {
          code: "ENROLLMENT_PAYMENT_MISSING",
          table: "enrollments",
          rowId: enrollment._id,
          message: "Enrollment class order has no payment.",
        })
      }
    }
    const cohort = enrollment.cohortId
      ? cohortById.get(enrollment.cohortId as string)
      : undefined
    if (cohort) {
      if (enrollment.status === "completed") {
        if (enrollment.completedAt !== cohort.endDate) {
          violation(violations, {
            code: "CHRONO_ENROLLMENT_COMPLETED",
            table: "enrollments",
            rowId: enrollment._id,
            message: "Completed enrollment must end at the cohort end date.",
          })
        }
        if (
          enrollment.completedAt !== undefined &&
          enrollment.enrolledAt > enrollment.completedAt
        ) {
          violation(violations, {
            code: "CHRONO_ENROLLMENT_START",
            table: "enrollments",
            rowId: enrollment._id,
            message: "Enrollment completed before it started.",
          })
        }
      }
      if (enrollment.status === "withdrawn") {
        if (enrollment.withdrawnAt === undefined) {
          violation(violations, {
            code: "STATUS_ENROLLMENT_WITHDRAWN",
            table: "enrollments",
            rowId: enrollment._id,
            message: "Withdrawn enrollment has no withdrawnAt.",
          })
        } else if (enrollment.withdrawnAt < enrollment.enrolledAt) {
          violation(violations, {
            code: "CHRONO_ENROLLMENT_WITHDRAWN",
            table: "enrollments",
            rowId: enrollment._id,
            message: "Enrollment withdrew before it started.",
          })
        }
      }
    }
    if (
      enrollment.status === "pending_payment" &&
      snapshot.lessonProgress.some(
        (progress) => progress.enrollmentId === enrollment._id,
      )
    ) {
      violation(violations, {
        code: "STATUS_PENDING_PROGRESS",
        table: "lessonProgress",
        rowId: enrollment._id,
        message: "Pending-payment enrollment has lesson progress.",
      })
    }
  }

  for (const progress of snapshot.lessonProgress) {
    const enrollment = enrollmentById.get(progress.enrollmentId as string)
    const cohort = enrollment?.cohortId
      ? cohortById.get(enrollment.cohortId as string)
      : undefined
    if (!enrollment || !cohort) continue
    if (progress.completedAt !== undefined) {
      if (progress.completedAt < enrollment.enrolledAt) {
        violation(violations, {
          code: "CHRONO_PROGRESS_ENROLLED",
          table: "lessonProgress",
          rowId: progress._id,
          message: "Lesson completed before enrollment.",
        })
      }
      if (progress.completedAt > cohort.endDate) {
        violation(violations, {
          code: "CHRONO_PROGRESS_COHORT",
          table: "lessonProgress",
          rowId: progress._id,
          message: "Lesson completed after the cohort end.",
        })
      }
      const earliest = earliestSubmission.get(enrollment._id as string)
      if (earliest !== undefined && progress.completedAt > earliest) {
        violation(violations, {
          code: "CHRONO_PROGRESS_SUBMISSION",
          table: "lessonProgress",
          rowId: progress._id,
          message: "Lesson completed after the enrollment's first submission.",
        })
      }
      if (
        enrollment.completedAt !== undefined &&
        progress.completedAt > enrollment.completedAt
      ) {
        violation(violations, {
          code: "CHRONO_PROGRESS_COMPLETION",
          table: "lessonProgress",
          rowId: progress._id,
          message: "Lesson completed after enrollment completion.",
        })
      }
    }
  }

  for (const submission of snapshot.submissions) {
    const enrollment = enrollmentById.get(submission.enrollmentId as string)
    if (
      submission.submittedAt !== undefined &&
      enrollment &&
      submission.submittedAt < enrollment.enrolledAt
    ) {
      violation(violations, {
        code: "CHRONO_SUBMISSION_ENROLLED",
        table: "submissions",
        rowId: submission._id,
        message: "Submission predates enrollment.",
      })
    }
    const assessments = snapshot.assessments.filter(
      (assessment) => assessment.submissionId === submission._id,
    )
    if (assessments.length > 1) {
      violation(violations, {
        code: "STATUS_ASSESSMENT_DUPLICATE",
        table: "assessments",
        rowId: submission._id,
        message: "Submission has more than one assessment.",
      })
    }
    for (const assessment of assessments) {
      if (
        submission.submittedAt !== undefined &&
        assessment.createdAt < submission.submittedAt
      ) {
        violation(violations, {
          code: "CHRONO_ASSESSMENT_SUBMISSION",
          table: "assessments",
          rowId: assessment._id,
          message: "Assessment predates the submission.",
        })
      }
      if (
        assessment.status === "completed" &&
        (assessment.score === undefined || assessment.assessedAt === undefined)
      ) {
        violation(violations, {
          code: "STATUS_ASSESSMENT_COMPLETED",
          table: "assessments",
          rowId: assessment._id,
          message: "Completed assessment has no score or assessedAt.",
        })
      }
    }
  }

  for (const certificate of snapshot.certificates) {
    const assessment = assessmentById.get(certificate.assessmentId as string)
    if (assessment && certificate.issuedAt < assessment.createdAt) {
      violation(violations, {
        code: "CHRONO_CERTIFICATE_ASSESSMENT",
        table: "certificates",
        rowId: certificate._id,
        message: "Certificate issued before its assessment.",
      })
    }
    if (certificate.snapshot.issuedAt !== certificate.issuedAt) {
      violation(violations, {
        code: "CERTIFICATE_SNAPSHOT_ISSUED_AT",
        table: "certificates",
        rowId: certificate._id,
        message: "Certificate snapshot issuedAt is stale.",
      })
    }
    if (certificate.status === "revoked") {
      if (
        certificate.revokedAt === undefined ||
        certificate.revokedAt < certificate.issuedAt
      ) {
        violation(violations, {
          code: "STATUS_CERTIFICATE_REVOKED",
          table: "certificates",
          rowId: certificate._id,
          message: "Revoked certificate has no valid revokedAt.",
        })
      }
      if (!certificate.revokeReason) {
        violation(violations, {
          code: "STATUS_CERTIFICATE_REASON",
          table: "certificates",
          rowId: certificate._id,
          message: "Revoked certificate has no revokeReason.",
        })
      }
    }
    const completedEnrollment = snapshot.enrollments.find(
      (enrollment) =>
        enrollment.studentId === certificate.studentId &&
        enrollment.pathId === certificate.pathId &&
        enrollment.status === "completed",
    )
    if (!completedEnrollment) {
      violation(violations, {
        code: "PARITY_CERTIFICATE_ENROLLMENT",
        table: "certificates",
        rowId: certificate._id,
        message: "Certificate has no completed enrollment.",
      })
    } else {
      if (
        completedEnrollment.completedAt !== undefined &&
        certificate.issuedAt < completedEnrollment.completedAt
      ) {
        violation(violations, {
          code: "CHRONO_CERTIFICATE_COMPLETION",
          table: "certificates",
          rowId: certificate._id,
          message: "Certificate issued before enrollment completion.",
        })
      }
      if (completedEnrollment.certificateId !== certificate._id) {
        violation(violations, {
          code: "PARITY_ENROLLMENT_CERTIFICATE",
          table: "enrollments",
          rowId: completedEnrollment._id,
          message: "Completed enrollment does not point at its certificate.",
        })
      }
    }
  }

  for (const enrollment of snapshot.enrollments) {
    if (enrollment.status !== "completed") continue
    if (enrollment.certificateId === undefined) {
      violation(violations, {
        code: "PARITY_COMPLETED_NO_CERTIFICATE",
        table: "enrollments",
        rowId: enrollment._id,
        message: "Completed enrollment has no certificate.",
      })
      continue
    }
    const certificate = snapshot.certificates.find(
      (row) => row._id === enrollment.certificateId,
    )
    if (!certificate) continue
    if (
      certificate.studentId !== enrollment.studentId ||
      certificate.pathId !== enrollment.pathId
    ) {
      violation(violations, {
        code: "PARITY_CERTIFICATE_IDENTITY",
        table: "certificates",
        rowId: certificate._id,
        message: "Certificate identity does not match its enrollment.",
      })
    }
  }

  // Cohort capacity and session window ----------------------------------
  for (const cohort of snapshot.cohorts) {
    const members = snapshot.enrollments.filter(
      (enrollment) => enrollment.cohortId === cohort._id,
    )
    if (members.length > cohort.capacity) {
      violation(violations, {
        code: "COHORT_CAPACITY",
        table: "cohorts",
        rowId: cohort._id,
        message: `${cohort.code} holds ${members.length} of ${cohort.capacity}.`,
      })
    }
  }
  for (const session of snapshot.cohortSessions) {
    const cohort = cohortById.get(session.cohortId as string)
    if (!cohort) continue
    if (
      session.startsAt < cohort.startDate ||
      session.endsAt > cohort.endDate
    ) {
      violation(violations, {
        code: "COHORT_SESSION_WINDOW",
        table: "cohortSessions",
        rowId: session._id,
        message: "Cohort session falls outside the cohort window.",
        evidence: {
          startsAt: session.startsAt,
          endsAt: session.endsAt,
          startDate: cohort.startDate,
          endDate: cohort.endDate,
        },
      })
    }
  }

  // Seed auth mapping ----------------------------------------------------
  const userByEmail = new Map(
    snapshot.users.map((row) => [row.email.toLowerCase(), row]),
  )
  checkUnique(violations, {
    code: "UNIQUE_SEED_AUTH_EMAIL",
    table: "seedAuthAccounts",
    field: "email",
    rows: snapshot.seedAuthAccounts.map((row) => ({
      _id: row._id,
      value: row.email.toLowerCase(),
    })),
  })
  for (const row of snapshot.seedAuthAccounts) {
    const user = userByEmail.get(row.email.toLowerCase())
    if (!user) {
      violation(violations, {
        code: "SEED_AUTH_USER_MISSING",
        table: "seedAuthAccounts",
        rowId: row._id,
        message: `Seed auth mapping for ${row.email} has no user.`,
      })
      continue
    }
    if (user.authUserId !== row.authUserId) {
      violation(violations, {
        code: "SEED_AUTH_SUBJECT_MISMATCH",
        table: "seedAuthAccounts",
        rowId: row._id,
        message: `Seed auth mapping for ${row.email} does not match the user subject.`,
        evidence: {
          mapped: row.authUserId,
          user: user.authUserId,
        },
      })
    }
  }

  // Public identity ------------------------------------------------------
  const seededEmails = new Set(
    snapshot.seedAuthAccounts.map((row) => row.email.toLowerCase()),
  )
  for (const user of snapshot.users) {
    if (user.roles.includes("admin")) continue
    if (!seededEmails.has(user.email.toLowerCase())) continue
    if (user.province !== "DI Yogyakarta") {
      violation(violations, {
        code: "IDENTITY_PROVINCE",
        table: "users",
        rowId: user._id,
        message: "Seed user is outside D.I. Yogyakarta.",
      })
    }
    if (!PUBLIC_EMAIL.test(user.email)) {
      violation(violations, {
        code: "IDENTITY_EMAIL",
        table: "users",
        rowId: user._id,
        message: "Seed email is not a plausible public identity.",
        evidence: { email: user.email },
      })
    }
    if (!PUBLIC_PHONE.test(user.phone)) {
      violation(violations, {
        code: "IDENTITY_PHONE",
        table: "users",
        rowId: user._id,
        message: "Seed phone is not a valid 62-prefixed number.",
        evidence: { phone: user.phone },
      })
    }
    if (!user.region.toLowerCase().includes("yogyakarta")) {
      violation(violations, {
        code: "IDENTITY_REGION",
        table: "users",
        rowId: user._id,
        message: "Seed user region is outside Yogyakarta.",
        evidence: { region: user.region },
      })
    }
  }

  return violations
}

export async function assertSeedIntegrity(ctx: SeedDb): Promise<number> {
  const violations = checkSeedIntegrity(await loadSeedSnapshot(ctx))
  if (violations.length > 0) {
    throw new ConvexError({
      code: "SEED_INTEGRITY_FAILED",
      message: `Seed integrity failed with ${violations.length} violation(s).`,
      violations,
    })
  }
  return violations.length
}

export const verify = internalQuery({
  args: {},
  handler: async (ctx) => {
    return checkSeedIntegrity(await loadSeedSnapshot(ctx))
  },
})

export const assert = internalMutation({
  args: {},
  handler: async (ctx) => {
    const count = await assertSeedIntegrity(ctx)
    return { violations: count }
  },
})
