import { describe, expect, it } from "vitest"

import { createTestDb } from "./helpers/convex"

const NOW = 1_760_000_000_000

const testDb = createTestDb

async function baseUser(t: ReturnType<typeof testDb>, suffix = "one") {
  return await t.run(async (ctx) =>
    ctx.db.insert("users", {
      authUserId: `auth-${suffix}`,
      name: `User ${suffix}`,
      email: `${suffix}@example.test`,
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: "U",
      region: "Yogyakarta",
      roles: ["student"],
      status: "active",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

describe("identity schema", () => {
  it("inserts identity records and serves their indexes", async () => {
    const t = testDb()
    const userId = await baseUser(t)
    await t.run(async (ctx) => {
      await ctx.db.insert("roleAssignments", {
        userId,
        role: "student",
        action: "grant",
        actorId: userId,
        reason: "Account created",
        createdAt: NOW,
      })
      await ctx.db.insert("invites", {
        email: "teacher@example.test",
        roles: ["teacher"],
        tokenHash: "hash",
        status: "pending",
        invitedBy: userId,
        reason: "Teacher invitation",
        expiresAt: NOW + 86_400_000,
        createdAt: NOW,
      })
      await ctx.db.insert("sessions", {
        userId,
        authSessionId: "auth-session",
        deviceName: "Browser",
        userAgent: "vitest",
        createdAt: NOW,
        lastSeenAt: NOW,
        expiresAt: NOW + 86_400_000,
      })
      await ctx.db.insert("consents", {
        userId,
        kind: "privacy",
        granted: true,
        version: "2026-11",
        source: "signup",
        createdAt: NOW,
      })
      await ctx.db.insert("payoutAccounts", {
        userId,
        provider: "bank",
        bankCode: "BCA",
        accountName: "User One",
        accountNumberMasked: "****1234",
        accountRef: "vault:1",
        status: "verified",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("sellerProfiles", {
        userId,
        displayName: "User One",
        status: "active",
        onboardingChecklist: {
          payoutAccount: true,
          consent: true,
          firstWorkCard: true,
          taxDetails: false,
        },
        createdAt: NOW,
        updatedAt: NOW,
      })

      const user = await ctx.db
        .query("users")
        .withIndex("by_authUserId", (q) => q.eq("authUserId", "auth-one"))
        .unique()
      expect(user?._id).toBe(userId)
      expect(
        await ctx.db
          .query("roleAssignments")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("invites")
          .withIndex("by_email", (q) => q.eq("email", "teacher@example.test"))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("sessions")
          .withIndex("by_authSessionId", (q) =>
            q.eq("authSessionId", "auth-session"),
          )
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("sellerProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique(),
      ).not.toBeNull()
    })
  })
})

describe("content schema", () => {
  it("inserts content records and serves their indexes", async () => {
    const t = testDb()
    const userId = await baseUser(t, "content")
    await t.run(async (ctx) => {
      await ctx.db.insert("siteContent", {
        key: "site",
        value: { hero: { title: "Belajar" } },
        updatedAt: NOW,
      })
      await ctx.db.insert("contentRevisions", {
        key: "site",
        version: 1,
        value: { hero: { title: "Belajar" } },
        status: "published",
        authorId: userId,
        note: "Initial",
        createdAt: NOW,
        publishedAt: NOW,
      })
      const assetId = await ctx.db.insert("mediaAssets", {
        kind: "image",
        filename: "plate.jpg",
        mimeType: "image/jpeg",
        size: 1024,
        alt: "Plate",
        status: "active",
        uploadedBy: userId,
        createdAt: NOW,
      })
      await ctx.db.insert("catalogFields", {
        order: 1,
        name: "Batik tulis",
        region: "Yogyakarta",
        status: "Terbuka",
        note: "Open",
      })
      await ctx.db.insert("paths", {
        order: 1,
        slug: "batik-tulis-soga",
        code: "BTS",
        title: "Batik Tulis Soga",
        subtitle: "Soga",
        teacher: "Bambang",
        teacherRole: "Pengajar",
        region: "Yogyakarta",
        level: "Dasar",
        modules: 4,
        weeks: 8,
        tasks: 6,
        price: 1_450_000,
        imageAssetId: assetId,
        tags: ["batik"],
        outcome: "Kain soga",
        includes: ["Bahan"],
        status: "open",
        createdAt: NOW,
      })
      const moduleId = await ctx.db.insert("pathModules", {
        order: 1,
        pathId: "batik-tulis-soga",
        title: "Soga",
        summary: "Materials",
        estimatedMinutes: 90,
        status: "published",
        createdAt: NOW,
      })
      await ctx.db.insert("lessons", {
        order: 1,
        moduleId,
        pathId: "batik-tulis-soga",
        title: "Mordanting",
        kind: "text",
        body: "Lesson",
        mediaAssetIds: [assetId],
        estimatedMinutes: 30,
        accessLevel: "enrolled",
        status: "published",
        createdAt: NOW,
      })
      await ctx.db.insert("teachers", {
        order: 1,
        slug: "bambang",
        name: "Bambang",
        initials: "BH",
        specialty: "Batik",
        region: "Yogyakarta",
        experience: "20 years",
        quote: "Practice",
        focus: "Soga",
        path: "Batik",
        community: "Giriloyo",
        imageAssetId: assetId,
        verified: true,
        userId,
        pathIds: ["batik-tulis-soga"],
        status: "active",
      })
      await ctx.db.insert("works", {
        order: 1,
        slug: "kain-soga",
        title: "Kain Soga",
        category: "batik",
        kind: "product",
        maker: "Anisa",
        makerRole: "Peserta",
        teacher: "Bambang",
        region: "Yogyakarta",
        price: 500_000,
        unit: "lembar",
        technique: "Batik tulis",
        techniqueNote: "Soga",
        workCard: "KC-1",
        description: "Kain",
        imageAssetId: assetId,
        makerId: userId,
        pathId: "batik-tulis-soga",
        status: "published",
        createdAt: NOW,
      })
      await ctx.db.insert("testimonials", {
        order: 1,
        quote: "Baik",
        name: "Anisa",
        role: "Peserta",
        city: "Yogyakarta",
        initials: "AR",
      })
      await ctx.db.insert("faqs", {
        order: 1,
        question: "Apa?",
        answer: "Ini.",
      })
      await ctx.db.insert("seoOverrides", {
        route: "/",
        title: "KalaNidhi",
        description: "Belajar praktik budaya",
        updatedAt: NOW,
      })

      expect(
        await ctx.db
          .query("siteContent")
          .withIndex("by_key", (q) => q.eq("key", "site"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("paths")
          .withIndex("by_slug", (q) => q.eq("slug", "batik-tulis-soga"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("pathModules")
          .withIndex("by_path_order", (q) =>
            q.eq("pathId", "batik-tulis-soga").eq("order", 1),
          )
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("works")
          .withIndex("by_status", (q) => q.eq("status", "published"))
          .collect(),
      ).toHaveLength(1)
    })
  })
})

describe("learning and credential schema", () => {
  it("inserts a learning loop and certificate chain with indexed reads", async () => {
    const t = testDb()
    const studentId = await baseUser(t, "student")
    const teacherId = await baseUser(t, "teacher")
    await t.run(async (ctx) => {
      const cohortId = await ctx.db.insert("cohorts", {
        code: "KOH-1",
        pathId: "batik-tulis-soga",
        teacherId,
        title: "Kohort 1",
        startDate: NOW,
        endDate: NOW + 86_400_000,
        capacity: 12,
        timezone: "Asia/Jakarta",
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("cohortSessions", {
        cohortId,
        title: "Sesi 1",
        kind: "session",
        startsAt: NOW,
        endsAt: NOW + 3_600_000,
        timezone: "Asia/Jakarta",
        status: "scheduled",
        createdAt: NOW,
      })
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId,
        pathId: "batik-tulis-soga",
        cohortId,
        status: "active",
        enrolledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const moduleId = await ctx.db.insert("pathModules", {
        order: 1,
        pathId: "batik-tulis-soga",
        title: "Soga",
        summary: "Materials",
        estimatedMinutes: 90,
        status: "published",
        createdAt: NOW,
      })
      const lessonId = await ctx.db.insert("lessons", {
        order: 1,
        moduleId,
        pathId: "batik-tulis-soga",
        title: "Mordanting",
        kind: "text",
        body: "Lesson",
        mediaAssetIds: [],
        estimatedMinutes: 30,
        accessLevel: "enrolled",
        status: "published",
        createdAt: NOW,
      })
      await ctx.db.insert("lessonProgress", {
        userId: studentId,
        enrollmentId,
        lessonId,
        state: "completed",
        attendance: "present",
        completedAt: NOW,
        updatedAt: NOW,
      })
      const submissionId = await ctx.db.insert("submissions", {
        code: "TUG-1",
        studentId,
        enrollmentId,
        cohortId,
        pathId: "batik-tulis-soga",
        taskTitle: "Kain",
        status: "submitted",
        submittedAt: NOW,
        dueAt: NOW + 86_400_000,
        assetIds: [],
        revisionCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const storageId = await ctx.storage.store(new Blob(["evidence"]))
      await ctx.db.insert("submissionAssets", {
        submissionId,
        storageId,
        kind: "image",
        filename: "evidence.jpg",
        mimeType: "image/jpeg",
        size: 8,
        createdAt: NOW,
      })
      const assessmentId = await ctx.db.insert("assessments", {
        submissionId,
        assessorId: teacherId,
        status: "completed",
        rubric: [{ criterion: "Teknik", weight: 1, score: 90 }],
        score: 90,
        feedback: "Baik",
        assessedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("assessmentEvents", {
        assessmentId,
        submissionId,
        kind: "grade",
        actorId: teacherId,
        scoreBefore: 0,
        scoreAfter: 90,
        createdAt: NOW,
      })
      await ctx.db.insert("disputes", {
        subjectType: "assessment",
        subjectId: assessmentId,
        openedBy: studentId,
        status: "open",
        reason: "Nilai belum sesuai rubrik",
        createdAt: NOW,
        updatedAt: NOW,
      })
      const certificateId = await ctx.db.insert("certificates", {
        serial: "KN-2026-0001",
        publicCode: "PUB-0001",
        studentId,
        pathId: "batik-tulis-soga",
        teacherId,
        assessmentId,
        status: "issued",
        issuedAt: NOW,
        snapshot: {
          studentName: "User student",
          pathTitle: "Batik Tulis Soga",
          teacherName: "User teacher",
          assessmentScore: 90,
          issuedAt: NOW,
        },
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("certificateEvents", {
        certificateId,
        kind: "issue",
        actorId: teacherId,
        createdAt: NOW,
      })
      const workId = await ctx.db.insert("works", {
        order: 1,
        slug: "kain-soga",
        title: "Kain Soga",
        category: "batik",
        kind: "product",
        maker: "User student",
        makerRole: "Peserta",
        teacher: "User teacher",
        region: "Yogyakarta",
        price: 500_000,
        unit: "lembar",
        technique: "Batik tulis",
        techniqueNote: "Soga",
        workCard: "KC-1",
        description: "Kain",
      })
      await ctx.db.insert("workCards", {
        workId,
        certificateId,
        makerId: studentId,
        serial: "KC-1",
        title: "Kain Soga",
        technique: "Batik tulis",
        materials: "Katun",
        provenance: "Giriloyo",
        permission: "2026",
        accessLevel: "public",
        status: "published",
        createdAt: NOW,
        updatedAt: NOW,
      })

      expect(
        await ctx.db
          .query("enrollments")
          .withIndex("by_studentId", (q) => q.eq("studentId", studentId))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("submissions")
          .withIndex("by_status", (q) => q.eq("status", "submitted"))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("certificates")
          .withIndex("by_publicCode", (q) => q.eq("publicCode", "PUB-0001"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("workCards")
          .withIndex("by_certificateId", (q) =>
            q.eq("certificateId", certificateId),
          )
          .collect(),
      ).toHaveLength(1)
    })
  })
})

describe("commerce schema", () => {
  it("inserts orders, payments, payouts, and append-only ledger entries", async () => {
    const t = testDb()
    const buyerId = await baseUser(t, "buyer")
    const sellerId = await baseUser(t, "seller")
    await t.run(async (ctx) => {
      const orderId = await ctx.db.insert("orders", {
        code: "KN-2026-0001",
        buyerUserId: buyerId,
        buyerName: "Buyer",
        buyerEmail: "buyer@example.test",
        sellerId,
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_037,
        status: "paid",
        channel: "web",
        createdAt: NOW,
        updatedAt: NOW,
        paidAt: NOW,
      })
      await ctx.db.insert("orderItems", {
        orderId,
        kind: "work",
        title: "Kain Soga",
        quantity: 1,
        unitAmount: 1_450_000,
        totalAmount: 1_450_000,
      })
      const paymentId = await ctx.db.insert("payments", {
        orderId,
        provider: "gopay_qris",
        providerChargeId: "ch_1",
        providerTransactionId: "trx_1",
        baseAmount: 1_450_000,
        uniqueAmount: 1_450_037,
        status: "paid",
        expiresAt: NOW + 900_000,
        paidAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("paymentEvents", {
        eventId: "evt_1",
        paymentId,
        orderId,
        kind: "settled",
        amount: 1_450_037,
        payload: { provider: "fixture" },
        createdAt: NOW,
      })
      const payoutId = await ctx.db.insert("payouts", {
        teacherId: sellerId,
        periodStart: NOW,
        periodEnd: NOW + 86_400_000,
        gross: 1_450_000,
        teacherShare: 1_015_000,
        platformShare: 217_500,
        communityShare: 217_500,
        status: "approved",
        createdAt: NOW,
        updatedAt: NOW,
      })
      const refundId = await ctx.db.insert("refunds", {
        orderId,
        paymentId,
        requestedBy: buyerId,
        amount: 1_450_037,
        reason: "Tidak sesuai",
        status: "approved",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("ledgerEntries", {
        orderId,
        paymentId,
        payoutId,
        refundId,
        account: "teacher",
        direction: "credit",
        amount: 1_015_000,
        currency: "IDR",
        entryType: "sale",
        reason: "70% share",
        createdAt: NOW,
      })

      expect(
        await ctx.db
          .query("orders")
          .withIndex("by_code", (q) => q.eq("code", "KN-2026-0001"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("payments")
          .withIndex("by_uniqueAmount", (q) => q.eq("uniqueAmount", 1_450_037))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("paymentEvents")
          .withIndex("by_eventId", (q) => q.eq("eventId", "evt_1"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("ledgerEntries")
          .withIndex("by_payoutId", (q) => q.eq("payoutId", payoutId))
          .collect(),
      ).toHaveLength(1)
    })
  })
})

describe("communication schema", () => {
  it("inserts conversations, messages, calls, and recordings", async () => {
    const t = testDb()
    const userId = await baseUser(t, "chat")
    await t.run(async (ctx) => {
      const conversationId = await ctx.db.insert("conversations", {
        kind: "direct",
        title: "Batik",
        createdBy: userId,
        status: "open",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
        role: "owner",
        joinedAt: NOW,
      })
      const storageId = await ctx.storage.store(new Blob(["voice"]))
      const messageId = await ctx.db.insert("messages", {
        conversationId,
        senderId: userId,
        kind: "voice",
        durationMs: 5_000,
        waveform: [0.1, 0.4],
        createdAt: NOW,
      })
      await ctx.db.insert("messageAssets", {
        messageId,
        storageId,
        kind: "audio",
        filename: "voice.webm",
        mimeType: "audio/webm",
        size: 5,
        createdAt: NOW,
      })
      await ctx.db.insert("messageReceipts", {
        messageId,
        userId,
        deliveredAt: NOW,
        readAt: NOW,
      })
      await ctx.db.insert("messageFlags", {
        messageId,
        reportedBy: userId,
        reason: "Spam",
        status: "open",
        createdAt: NOW,
      })
      await ctx.db.insert("blocks", {
        blockerId: userId,
        blockedId: userId,
        createdAt: NOW,
      })
      const callId = await ctx.db.insert("callSessions", {
        roomName: "room-1",
        kind: "voice",
        initiatorId: userId,
        status: "ended",
        startedAt: NOW,
        endedAt: NOW + 60_000,
        recordingConsent: "both",
        createdAt: NOW,
      })
      await ctx.db.insert("callParticipants", {
        callId,
        userId,
        role: "host",
        joinedAt: NOW,
        leftAt: NOW + 60_000,
      })
      await ctx.db.insert("callEvents", {
        callId,
        kind: "ended",
        actorId: userId,
        payload: { durationMs: 60_000 },
        createdAt: NOW,
      })
      const recordingStorageId = await ctx.storage.store(new Blob(["recording"]))
      await ctx.db.insert("callRecordings", {
        callId,
        assetId: recordingStorageId,
        consentedBy: [userId],
        retentionUntil: NOW + 2_592_000_000,
        accessLog: [{ actorId: userId, reason: "Dispute", accessedAt: NOW }],
        createdAt: NOW,
      })

      expect(
        await ctx.db
          .query("messages")
          .withIndex("by_conversation_createdAt", (q) =>
            q.eq("conversationId", conversationId),
          )
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("callSessions")
          .withIndex("by_roomName", (q) => q.eq("roomName", "room-1"))
          .unique(),
      ).not.toBeNull()
      expect(
        await ctx.db
          .query("callRecordings")
          .withIndex("by_callId", (q) => q.eq("callId", callId))
          .collect(),
      ).toHaveLength(1)
    })
  })
})

describe("operations schema", () => {
  it("inserts leads, support, audit, and governance records", async () => {
    const t = testDb()
    const userId = await baseUser(t, "ops")
    await t.run(async (ctx) => {
      const leadId = await ctx.db.insert("leads", {
        intent: "student",
        email: "lead@example.test",
        consent: true,
        status: "new",
        createdAt: NOW,
      })
      await ctx.db.insert("leadNotes", {
        leadId,
        authorId: userId,
        kind: "note",
        body: "Follow up",
        createdAt: NOW,
      })
      await ctx.db.insert("leadAssignments", {
        leadId,
        ownerId: userId,
        assignedBy: userId,
        createdAt: NOW,
      })
      const ticketId = await ctx.db.insert("supportTickets", {
        code: "SUP-1",
        requesterId: userId,
        subject: "Bantuan",
        priority: "normal",
        status: "open",
        channel: "chat",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("supportMessages", {
        ticketId,
        authorId: userId,
        kind: "user",
        body: "Halo",
        createdAt: NOW,
      })
      await ctx.db.insert("auditLogs", {
        actorId: userId,
        action: "users.setRoles",
        entityType: "users",
        entityId: userId,
        reason: "Test",
        before: { roles: ["student"] },
        after: { roles: ["teacher"] },
        severity: "info",
        createdAt: NOW,
      })
      await ctx.db.insert("authLogs", {
        userId,
        kind: "sign_in",
        createdAt: NOW,
      })
      await ctx.db.insert("webhookDeliveries", {
        eventId: "evt-1",
        event: "payment.settled",
        url: "https://example.test/hook",
        status: "pending",
        attempts: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("notificationOutbox", {
        channel: "email",
        recipient: "user@example.test",
        template: "welcome",
        payload: { name: "User" },
        status: "pending",
        attempts: 0,
        scheduledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("featureFlags", {
        key: "seller",
        description: "Seller tools",
        enabled: true,
        rolloutPercent: 100,
        updatedAt: NOW,
      })
      await ctx.db.insert("settings", {
        key: "region",
        value: { base: "Yogyakarta" },
        updatedAt: NOW,
      })
      await ctx.db.insert("integrationHealth", {
        integration: "payment_gateway",
        status: "healthy",
        checkedAt: NOW,
      })
      await ctx.db.insert("dailyMetrics", {
        date: "2026-11-12",
        metricKey: "gmv",
        value: 1_450_000,
        computedAt: NOW,
      })
      await ctx.db.insert("metricDefinitions", {
        key: "gmv",
        label: "GMV",
        definition: "Paid order gross",
        formula: "sum(orders.baseAmount)",
        owner: "admin",
        version: 1,
        active: true,
        updatedAt: NOW,
      })
      await ctx.db.insert("flowDefinitions", {
        key: "order",
        name: "Order",
        owner: "admin",
        description: "Order flow",
        version: 1,
        active: true,
        updatedAt: NOW,
      })
      await ctx.db.insert("flowTransitions", {
        flowKey: "order",
        fromState: "awaiting_payment",
        toState: "paid",
        guard: "payment.settled",
        createdAt: NOW,
      })
      await ctx.db.insert("slaPolicies", {
        key: "assessment-sla",
        flowKey: "assessment",
        name: "Assessment SLA",
        targetMinutes: 1_440,
        owner: "admin",
        active: true,
        updatedAt: NOW,
      })
      await ctx.db.insert("automationRules", {
        key: "remind-grading",
        flowKey: "assessment",
        kind: "reminder",
        trigger: "24h",
        action: "notify",
        enabled: true,
        updatedAt: NOW,
      })
      await ctx.db.insert("notificationTemplates", {
        key: "welcome",
        channel: "email",
        body: "Selamat datang",
        locale: "id",
        updatedAt: NOW,
      })
      await ctx.db.insert("apiKeys", {
        name: "gateway",
        keyHash: "hash",
        scopes: ["payments.write"],
        status: "active",
        createdBy: userId,
        createdAt: NOW,
      })
      await ctx.db.insert("webhookEndpoints", {
        name: "gateway",
        url: "https://example.test/hook",
        secretHash: "hash",
        events: ["payment.settled"],
        status: "active",
        createdBy: userId,
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("privacyRequests", {
        requesterId: userId,
        requesterEmail: "user@example.test",
        kind: "access",
        status: "open",
        createdAt: NOW,
        updatedAt: NOW,
      })
      await ctx.db.insert("impersonationSessions", {
        actorId: userId,
        targetId: userId,
        reason: "Support",
        readOnly: true,
        startedAt: NOW,
        expiresAt: NOW + 900_000,
      })
      await ctx.db.insert("contentLocks", {
        contentKey: "site",
        holderId: userId,
        acquiredAt: NOW,
        expiresAt: NOW + 900_000,
      })

      expect(
        await ctx.db
          .query("leads")
          .withIndex("by_status", (q) => q.eq("status", "new"))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("auditLogs")
          .withIndex("by_action", (q) => q.eq("action", "users.setRoles"))
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("flowTransitions")
          .withIndex("by_flow_from", (q) =>
            q.eq("flowKey", "order").eq("fromState", "awaiting_payment"),
          )
          .collect(),
      ).toHaveLength(1)
      expect(
        await ctx.db
          .query("notificationOutbox")
          .withIndex("by_status_scheduledAt", (q) =>
            q.eq("status", "pending").eq("scheduledAt", NOW),
          )
          .collect(),
      ).toHaveLength(1)
    })
  })

  it("rejects documents that violate the schema", async () => {
    const t = testDb()
    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert("featureFlags", {
          key: "seller",
          description: "Seller tools",
          enabled: true,
          // @ts-expect-error deliberately missing rolloutPercent
          rolloutPercent: undefined,
          updatedAt: NOW,
        })
      }),
    ).rejects.toThrow()
  })
})
