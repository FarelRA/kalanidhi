import { convexTest } from "convex-test"

import schema from "../../convex/schema"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

export const NOW = 1_760_000_000_000
export const INTERNAL_KEY = "test-internal-key"
export const WEBHOOK_SECRET = "test-webhook-secret"
export const PAYMENT_SKEW_MS = 60_000

process.env.PAYMENTS_INTERNAL_KEY = INTERNAL_KEY
process.env.PAYMENTS_WEBHOOK_SECRET = WEBHOOK_SECRET

export function createTestDb() {
  return convexTest(schema)
}

export type TestDb = ReturnType<typeof createTestDb>

export async function seedAccount(
  t: TestDb,
  input: {
    authUserId: string
    email?: string
    name?: string
    roles?: ("student" | "teacher" | "admin")[]
    status?: "active" | "suspended" | "invited" | "deleted"
    emailVerified?: boolean
    phone?: string
    province?: string
    whatsappVerified?: boolean
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const roles = input.roles ?? ["student"]
    const userId = await ctx.db.insert("users", {
      authUserId: input.authUserId,
      name: input.name ?? input.authUserId,
      email: input.email ?? `${input.authUserId}@example.test`,
      emailVerified: input.emailVerified ?? true,
      phone: input.phone ?? "6280000000000",
      province: input.province ?? "DI Yogyakarta",
      whatsappVerified: input.whatsappVerified ?? true,
      initials: "TA",
      region: "Yogyakarta",
      roles,
      status: input.status ?? "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    for (const role of roles) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role,
        action: "grant",
        actorId: "system",
        reason: "Test setup",
        createdAt: NOW,
      })
    }
    return userId
  })
}

export async function seedImageAsset(
  t: TestDb,
  filename = "work.jpg",
): Promise<Id<"mediaAssets">> {
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["seed-image"], { type: "image/jpeg" }),
    )
    return await ctx.db.insert("mediaAssets", {
      kind: "image",
      storageId,
      filename,
      mimeType: "image/jpeg",
      size: 10,
      alt: "Foto uji",
      status: "active",
      uploadedBy: "system",
      createdAt: NOW,
    })
  })
}

export async function seedSeller(
  t: TestDb,
  input: {
    authUserId: string
    pathId?: string
    email?: string
    name?: string
    certificate?: boolean
    teacherProfile?: boolean
    sellerStatus?: "pending" | "active" | "suspended"
  },
): Promise<{
  userId: Id<"users">
  certificateId: Id<"certificates"> | null
  sellerProfileId: Id<"sellerProfiles">
  imageAssetId: Id<"mediaAssets">
}> {
  const pathId = input.pathId ?? "batik-tulis-soga"
  const roles: ("student" | "teacher")[] = input.teacherProfile
    ? ["teacher"]
    : ["student"]
  const userId = await seedAccount(t, {
    authUserId: input.authUserId,
    email: input.email,
    name: input.name,
    roles,
  })

  const teacherId = await seedAccount(t, {
    authUserId: `teacher-of-${input.authUserId}`,
    email: `teacher-of-${input.authUserId}@example.test`,
    name: "Pengajar Uji",
    roles: ["teacher"],
  })

  const imageAssetId = await seedImageAsset(t, `work-${input.authUserId}.jpg`)

  if (input.teacherProfile) {
    await t.run(async (ctx) => {
      await ctx.db.insert("teachers", {
        order: 1,
        slug: `teacher-${input.authUserId}`,
        name: input.name ?? input.authUserId,
        initials: "T",
        specialty: "Batik",
        region: "Yogyakarta",
        experience: "10 years",
        quote: "Practice",
        focus: "Soga",
        path: "Batik",
        community: "Giriloyo",
        verified: true,
        userId,
        pathIds: [pathId],
        status: "active",
      })
    })
  }

  let certificateId: Id<"certificates"> | null = null
  if (input.certificate !== false && !input.teacherProfile) {
    certificateId = await t.run(async (ctx) => {
      const cohortId = await ctx.db.insert("cohorts", {
        code: `KOH-${input.authUserId}`,
        pathId,
        teacherId,
        title: "Kohort",
        startDate: NOW,
        endDate: NOW + 86_400_000,
        capacity: 12,
        timezone: "Asia/Jakarta",
        status: "completed",
        createdAt: NOW,
        updatedAt: NOW,
      })
      const enrollmentId = await ctx.db.insert("enrollments", {
        studentId: userId,
        pathId,
        cohortId,
        status: "completed",
        enrolledAt: NOW,
        completedAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const submissionId = await ctx.db.insert("submissions", {
        code: `TUG-${input.authUserId}`,
        studentId: userId,
        enrollmentId,
        cohortId,
        pathId,
        taskTitle: "Kain",
        status: "approved",
        submittedAt: NOW,
        dueAt: NOW,
        assetIds: [],
        revisionCount: 0,
        createdAt: NOW,
        updatedAt: NOW,
      })
      const assessmentId = await ctx.db.insert("assessments", {
        submissionId,
        assessorId: teacherId,
        status: "completed",
        rubric: [{ criterion: "Teknik", weight: 1, score: 90 }],
        score: 90,
        createdAt: NOW,
        updatedAt: NOW,
      })
      return await ctx.db.insert("certificates", {
        serial: `KN-${input.authUserId}`,
        publicCode: `PUB-${input.authUserId}`,
        studentId: userId,
        pathId,
        teacherId,
        assessmentId,
        status: "issued",
        issuedAt: NOW,
        snapshot: {
          studentName: input.name ?? input.authUserId,
          pathTitle: "Batik Tulis Soga",
          teacherName: "Pengajar Uji",
          assessmentScore: 90,
          issuedAt: NOW,
        },
        createdAt: NOW,
        updatedAt: NOW,
      })
    })
  }

  const sellerProfileId = await t.run(async (ctx) =>
    ctx.db.insert("sellerProfiles", {
      userId,
      displayName: input.name ?? input.authUserId,
      status: input.sellerStatus ?? "active",
      onboardingChecklist: {
        payoutAccount: true,
        consent: true,
        firstWorkCard: true,
        taxDetails: true,
      },
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )

  return { userId, certificateId, sellerProfileId, imageAssetId }
}

export async function seedSellerPayoutAccount(
  t: TestDb,
  userId: Id<"users">,
  status: "pending" | "verified" | "rejected" | "suspended" = "verified",
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("payoutAccounts", {
      userId,
      provider: "bank",
      bankCode: "BRIN",
      accountName: "Penjual Uji",
      accountNumberMasked: "****1234",
      accountRef: "vault:test",
      status,
      verifiedBy: status === "verified" ? "admin" : undefined,
      verifiedAt: status === "verified" ? NOW : undefined,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export async function seedPublishedWork(
  t: TestDb,
  input: {
    makerId: Id<"users">
    pathId?: string
    price?: number
    title?: string
    certificateId?: Id<"certificates"> | null
    status?: "draft" | "review" | "published" | "paused" | "sold_out"
  },
): Promise<Id<"works">> {
  const pathId = input.pathId ?? "batik-tulis-soga"
  const title = input.title ?? "Kain Soga Anyaman"
  return await t.run(async (ctx) => {
    const storageId = await ctx.storage.store(
      new Blob(["seed-image"], { type: "image/jpeg" }),
    )
    const imageAssetId = await ctx.db.insert("mediaAssets", {
      kind: "image",
      storageId,
      filename: `work-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      size: 10,
      alt: "Foto uji",
      status: "active",
      uploadedBy: "system",
      createdAt: NOW,
    })
    const slug = `kain-${input.makerId}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const workId = await ctx.db.insert("works", {
      order: 90,
      slug,
      title,
      category: "batik",
      kind: "product",
      maker: "Penjual Uji",
      makerRole: "Peserta bersertifikat",
      teacher: "Pengajar Uji",
      region: "Yogyakarta",
      price: input.price ?? 1_450_000,
      unit: "per helai",
      technique: "Batik tulis",
      techniqueNote: "Soga",
      workCard: `KK-${slug}`,
      description: "Kain soga dengan provenans lengkap.",
      imageAssetId,
      makerId: input.makerId,
      pathId,
      certificateId: input.certificateId ?? undefined,
      status: input.status ?? "published",
      permission: "Izin komunitas Giriloyo",
      createdAt: NOW,
    })
    await ctx.db.insert("workCards", {
      workId,
      certificateId: input.certificateId ?? undefined,
      makerId: input.makerId,
      serial: `KK-${slug}`,
      title,
      technique: "Batik tulis",
      materials: "Katun primisima, soga alam",
      provenance: "Giriloyo, Yogyakarta",
      permission: "Izin komunitas Giriloyo",
      accessLevel: "public",
      status: (input.status ?? "published") === "published" ? "published" : "draft",
      createdAt: NOW,
      updatedAt: NOW,
    })
    return workId
  })
}

export async function workSlug(t: TestDb, workId: Id<"works">): Promise<string> {
  return await t.run(async (ctx) => {
    const work = await ctx.db.get(workId)
    return work?.slug ?? ""
  })
}

export type Checkout = {
  orderId: Id<"orders">
  code: string
  token: string
  baseAmount: number
}

export async function seedPath(
  t: TestDb,
  input: {
    teacherId: Id<"users">
    slug?: string
    title?: string
    price?: number | null
    comingSoon?: boolean
    status?: "open" | "archived" | "mapping" | "planned"
  },
): Promise<string> {
  const slug = input.slug ?? "batik-tulis-soga"
  await t.run(async (ctx) => {
    await ctx.db.insert("paths", {
      order: 1,
      slug,
      code: "Jalur 01",
      title: input.title ?? "Batik Tulis Soga",
      subtitle: "Dari canting pertama sampai kain siap karya",
      teacher: "Pengajar Uji",
      teacherRole: "Pengajar batik",
      region: "Giriloyo, Yogyakarta",
      level: "Pemula",
      modules: 1,
      weeks: 1,
      tasks: 1,
      price: input.price === undefined ? 1_450_000 : input.price,
      tags: [],
      outcome: "Sepotong kain batik tulis.",
      includes: [],
      comingSoon: input.comingSoon,
      teacherId: input.teacherId,
      status: input.status ?? "open",
      createdAt: NOW,
    })
  })
  return slug
}

export async function createCheckout(
  t: TestDb,
  input: {
    workId?: Id<"works">
    pathSlug?: string
    buyerAuth?: string
    buyerEmail?: string
    idempotencyKey?: string
    note?: string
  },
): Promise<Checkout> {
  const buyerEmail = input.buyerEmail ?? "bayu@example.test"
  const authUserId =
    input.buyerAuth ?? `buyer-${buyerEmail.replace(/[^a-z0-9]/gi, "-")}`
  const existing = await t.run(async (ctx) =>
    ctx.db
      .query("users")
      .withIndex("by_authUserId", (q) => q.eq("authUserId", authUserId))
      .unique(),
  )
  if (!existing) {
    await seedAccount(t, { authUserId, email: buyerEmail })
  }

  const identity = t.withIdentity({ subject: authUserId })
  if (input.workId) {
    return await identity.mutation(api.commerce.createOrder, {
      kind: "work",
      slug: await workSlug(t, input.workId),
      consentTransactional: true,
      idempotencyKey: input.idempotencyKey,
      note: input.note,
    })
  }
  if (!input.pathSlug) {
    throw new Error("createCheckout requires workId or pathSlug")
  }
  return await identity.mutation(api.commerce.createOrder, {
    kind: "path",
    slug: input.pathSlug,
    consentTransactional: true,
    idempotencyKey: input.idempotencyKey,
    note: input.note,
  })
}

export type CheckoutWithCharge = Checkout & {
  paymentId: Id<"payments">
  chargeId: string
  uniqueAmount: number
  paymentCreatedAt: number
  expiresAt: number
}

export async function createChargeForCheckout(
  t: TestDb,
  checkout: Checkout,
  uniqueOffsetAmount = 37,
): Promise<CheckoutWithCharge> {
  const intent = await t.mutation(api.payments.createIntent, {
    orderId: checkout.orderId,
    token: checkout.token,
  })
  const uniqueAmount = checkout.baseAmount + uniqueOffsetAmount
  const chargeId = `ch_${checkout.code}`
  const attached = await t.mutation(api.payments.attachCharge, {
    orderId: checkout.orderId,
    token: checkout.token,
    chargeId,
    baseAmount: checkout.baseAmount,
    uniqueAmount,
    qrString: "00020101021226",
    expiresAt: intent.expiresAt,
  })
  return {
    ...checkout,
    paymentId: attached.id as Id<"payments">,
    chargeId,
    uniqueAmount,
    paymentCreatedAt: attached.createdAt,
    expiresAt: attached.expiresAt,
  }
}

export async function settleViaWebhook(
  t: TestDb,
  input: {
    eventId?: string
    chargeId: string
    orderCode: string
    providerTransactionId?: string
    amount: number
    paidAt: number
    gatewayFee?: number
  },
) {
  return await t.mutation(api.payments.settleFromWebhook, {
    internalKey: INTERNAL_KEY,
    eventId: input.eventId ?? `evt_${input.chargeId}`,
    chargeId: input.chargeId,
    orderCode: input.orderCode,
    providerTransactionId: input.providerTransactionId ?? `TRX-${input.chargeId}`,
    amount: input.amount,
    paidAt: input.paidAt,
    gatewayFee: input.gatewayFee,
  })
}
