import { describe, expect, it } from "vitest"

import { internal } from "../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../convex/seedData"
import { createTestDb } from "./helpers/convex"

const NOW = 1_760_000_000_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
    ]),
  )
}

async function registerImages(
  t: ReturnType<typeof createTestDb>,
  filenames: string[],
) {
  await t.run(async (ctx) => {
    for (const filename of filenames) {
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
}

describe("comprehensive seed connectivity", () => {
  it("seeds every domain table and leaves no orphaned node", async () => {
    const t = createTestDb()
    await registerImages(t, seedFilenames())
    await t.action(internal.seedRunner.run, {})

    const counts = await t.run(async (ctx) => {
      const tables = [
        "users",
        "roleAssignments",
        "invites",
        "sessions",
        "consents",
        "payoutAccounts",
        "sellerProfiles",
        "whatsappVerifications",
        "siteContent",
        "contentRevisions",
        "contentPreviews",
        "contentLocks",
        "mediaAssets",
        "catalogFields",
        "paths",
        "pathModules",
        "lessons",
        "teachers",
        "works",
        "testimonials",
        "faqs",
        "seoOverrides",
        "cohorts",
        "cohortSessions",
        "enrollments",
        "lessonProgress",
        "submissions",
        "submissionAssets",
        "assessments",
        "assessmentEvents",
        "disputes",
        "certificates",
        "certificateEvents",
        "workCards",
        "orders",
        "orderItems",
        "payments",
        "paymentEvents",
        "payouts",
        "refunds",
        "ledgerEntries",
        "conversations",
        "conversationMembers",
        "messages",
        "messageAssets",
        "messageReceipts",
        "messageFlags",
        "blocks",
        "messageEdits",
        "messageAccessGrants",
        "messageUploadIntents",
        "messagingRestrictions",
        "callSessions",
        "callParticipants",
        "callEvents",
        "callRecordings",
        "leads",
        "leadNotes",
        "leadAssignments",
        "supportTickets",
        "supportMessages",
        "supportCannedReplies",
        "auditLogs",
        "authLogs",
        "webhookDeliveries",
        "notificationOutbox",
        "featureFlags",
        "settings",
        "integrationHealth",
        "dailyMetrics",
        "metricDefinitions",
        "flowDefinitions",
        "flowTransitions",
        "slaPolicies",
        "automationRules",
        "notificationTemplates",
        "apiKeys",
        "webhookEndpoints",
        "privacyRequests",
        "impersonationSessions",
        "culturalSources",
        "takedownRequests",
        "breakGlassGrants",
      ] as const

      const result: Record<string, number> = {}
      for (const table of tables) {
        result[table] = (await ctx.db.query(table as never).collect()).length
      }

      const users = await ctx.db.query("users").collect()
      const userIds = new Set(users.map((user) => user._id as string))
      const paths = await ctx.db.query("paths").collect()
      const pathSlugs = new Set(paths.map((path) => path.slug))
      const teachers = await ctx.db.query("teachers").collect()
      const teacherByUser = new Map(
        teachers
          .filter((teacher) => teacher.userId)
          .map((teacher) => [teacher.userId as string, teacher] as const),
      )
      const works = await ctx.db.query("works").collect()
      const workIds = new Set(works.map((work) => work._id as string))
      const certificates = await ctx.db.query("certificates").collect()
      const certificateIds = new Set(
        certificates.map((certificate) => certificate._id as string),
      )
      const assessments = await ctx.db.query("assessments").collect()
      const assessmentIds = new Set(
        assessments.map((assessment) => assessment._id as string),
      )
      const submissions = await ctx.db.query("submissions").collect()
      const submissionIds = new Set(
        submissions.map((submission) => submission._id as string),
      )
      const enrollments = await ctx.db.query("enrollments").collect()
      const enrollmentIds = new Set(
        enrollments.map((enrollment) => enrollment._id as string),
      )
      const cohorts = await ctx.db.query("cohorts").collect()
      const cohortIds = new Set(cohorts.map((cohort) => cohort._id as string))
      const orders = await ctx.db.query("orders").collect()
      const orderIds = new Set(orders.map((order) => order._id as string))
      const payments = await ctx.db.query("payments").collect()
      const paymentIds = new Set(
        payments.map((payment) => payment._id as string),
      )
      const payouts = await ctx.db.query("payouts").collect()
      const conversations = await ctx.db.query("conversations").collect()
      const members = await ctx.db.query("conversationMembers").collect()
      const memberKeys = new Set(
        members.map(
          (member) => `${member.conversationId}:${member.userId}`,
        ),
      )
      const messages = await ctx.db.query("messages").collect()
      const calls = await ctx.db.query("callSessions").collect()
      const participants = await ctx.db.query("callParticipants").collect()
      const participantCallIds = new Set(
        participants.map((participant) => participant.callId as string),
      )
      const tickets = await ctx.db.query("supportTickets").collect()
      const leads = await ctx.db.query("leads").collect()
      const leadAssignments = await ctx.db.query("leadAssignments").collect()
      const assignedLeadIds = new Set(
        leadAssignments.map((assignment) => assignment.leadId as string),
      )
      const sources = await ctx.db.query("culturalSources").collect()
      const deliveries = await ctx.db.query("webhookDeliveries").collect()
      const endpoints = await ctx.db.query("webhookEndpoints").collect()
      const endpointIds = new Set(
        endpoints.map((endpoint) => endpoint._id as string),
      )
      const outbox = await ctx.db.query("notificationOutbox").collect()
      const definitions = await ctx.db.query("flowDefinitions").collect()
      const transitions = await ctx.db.query("flowTransitions").collect()
      const metrics = await ctx.db.query("dailyMetrics").collect()
      const metricDefinitions = await ctx.db
        .query("metricDefinitions")
        .collect()
      const metricKeys = new Set(
        metricDefinitions.map((definition) => definition.key),
      )

      for (const path of paths) {
        expect(path.teacherId, `path ${path.slug} teacherId`).toBeTruthy()
        expect(userIds.has(path.teacherId as string)).toBe(true)
      }
      for (const teacher of teachers) {
        expect(teacher.userId, `teacher ${teacher.slug} userId`).toBeTruthy()
        expect(userIds.has(teacher.userId as string)).toBe(true)
      }
      for (const cohort of cohorts) {
        expect(userIds.has(cohort.teacherId as string)).toBe(true)
        expect(pathSlugs.has(cohort.pathId)).toBe(true)
        const profile = teacherByUser.get(cohort.teacherId as string)
        expect(profile, `cohort ${cohort.code} teacher profile`).toBeTruthy()
        expect(profile?.pathIds).toContain(cohort.pathId)
      }
      for (const enrollment of enrollments) {
        expect(userIds.has(enrollment.studentId as string)).toBe(true)
        expect(pathSlugs.has(enrollment.pathId)).toBe(true)
        expect(cohortIds.has(enrollment.cohortId as string)).toBe(true)
      }
      for (const submission of submissions) {
        expect(userIds.has(submission.studentId as string)).toBe(true)
        expect(
          enrollmentIds.has(submission.enrollmentId as string),
        ).toBe(true)
        expect(cohortIds.has(submission.cohortId as string)).toBe(true)
        expect(pathSlugs.has(submission.pathId)).toBe(true)
      }
      for (const assessment of assessments) {
        expect(
          submissionIds.has(assessment.submissionId as string),
        ).toBe(true)
        expect(userIds.has(assessment.assessorId as string)).toBe(true)
      }
      for (const certificate of certificates) {
        expect(userIds.has(certificate.studentId as string)).toBe(true)
        expect(userIds.has(certificate.teacherId as string)).toBe(true)
        expect(
          assessmentIds.has(certificate.assessmentId as string),
        ).toBe(true)
        expect(pathSlugs.has(certificate.pathId)).toBe(true)
      }
      for (const work of works) {
        expect(work.makerId, `work ${work.slug} makerId`).toBeTruthy()
        expect(userIds.has(work.makerId as string)).toBe(true)
        expect(work.pathId, `work ${work.slug} pathId`).toBeTruthy()
        expect(pathSlugs.has(work.pathId as string)).toBe(true)
        expect(
          work.certificateId,
          `work ${work.slug} certificateId`,
        ).toBeTruthy()
        expect(certificateIds.has(work.certificateId as string)).toBe(true)
        expect(work.status).toBe("published")
        expect(work.imageAssetId).toBeTruthy()
      }
      for (const order of orders) {
        expect(userIds.has(order.sellerId as string)).toBe(true)
        expect(userIds.has(order.buyerUserId as string)).toBe(true)
        expect(workIds.has(order.workId as string)).toBe(true)
      }
      for (const payment of payments) {
        expect(orderIds.has(payment.orderId as string)).toBe(true)
      }
      for (const payout of payouts) {
        expect(userIds.has(payout.teacherId as string)).toBe(true)
        expect(orderIds.has(payout.orderId as string)).toBe(true)
        expect(paymentIds.has(payout.paymentId as string)).toBe(true)
      }
      for (const conversation of conversations) {
        const hasMember = [...memberKeys].some((key) =>
          key.startsWith(`${conversation._id}:`),
        )
        expect(hasMember, `conversation ${conversation._id} member`).toBe(true)
      }
      for (const message of messages) {
        if (!message.senderId) continue
        expect(
          memberKeys.has(
            `${message.conversationId}:${message.senderId}`,
          ),
          `message ${message._id} sender is a member`,
        ).toBe(true)
      }
      for (const call of calls) {
        expect(
          participantCallIds.has(call._id as string),
          `call ${call._id} participant`,
        ).toBe(true)
      }
      for (const ticket of tickets) {
        expect(ticket.requesterId).toBeTruthy()
        expect(userIds.has(ticket.requesterId as string)).toBe(true)
        expect(ticket.assigneeId).toBeTruthy()
        expect(userIds.has(ticket.assigneeId as string)).toBe(true)
      }
      for (const lead of leads) {
        expect(
          assignedLeadIds.has(lead._id as string),
          `lead ${lead._id} assignment`,
        ).toBe(true)
      }
      for (const source of sources) {
        expect(Boolean(source.pathId || source.workId)).toBe(true)
      }
      for (const delivery of deliveries) {
        expect(endpointIds.has(delivery.endpointId as string)).toBe(true)
      }
      for (const row of outbox) {
        if (row.channel !== "in_app") continue
        expect(row.recipientId).toBeTruthy()
        expect(userIds.has(row.recipientId as string)).toBe(true)
      }
      for (const definition of definitions) {
        expect(
          transitions.some(
            (transition) => transition.flowKey === definition.key,
          ),
          `flow ${definition.key} transitions`,
        ).toBe(true)
      }
      for (const metric of metrics) {
        expect(metricKeys.has(metric.metricKey)).toBe(true)
      }

      return result
    })

    for (const [table, count] of Object.entries(counts)) {
      expect(count, `${table} should be seeded`).toBeGreaterThan(0)
    }
  })
})
