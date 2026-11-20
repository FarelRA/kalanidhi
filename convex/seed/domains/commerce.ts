import { v } from "convex/values"

import type { Id } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import {
  buildPaidOrder,
  buildPayoutAllocation,
  buildRefundReversal,
} from "../lib/builders"
import { orderCode, pathSlug, workSlug } from "../lib/codes"
import { createSeedClock, DAY, HOUR } from "../lib/clock"
import { seedAdmin, userByEmail, workBySlug } from "../lib/lookup"
import { seedEmail } from "../content/identities"

export const seedCommerce = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const admin = await seedAdmin(ctx)
    const orders = [
      {
        key: "order-1",
        code: orderCode("order1"),
        buyerKey: "sari",
        sellerKey: "anisa",
        workSlug: workSlug("nampanBatikBambu"),
        baseAmount: 385_000,
        uniqueAmount: 385_037,
        status: "completed" as const,
        paidDaysAgo: 24,
        completedDaysAgo: 18,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 3_850,
      },
      {
        key: "order-2",
        code: orderCode("order2"),
        buyerKey: "dwi",
        sellerKey: "dimas",
        workSlug: workSlug("boxTisuBatikBambu"),
        baseAmount: 275_000,
        uniqueAmount: 275_014,
        status: "delivered" as const,
        paidDaysAgo: 16,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 2_750,
      },
      {
        key: "order-3",
        code: orderCode("order3"),
        buyerKey: "bayu",
        sellerKey: "purnomo",
        workSlug: workSlug("hiasanDindingBatikBambu"),
        baseAmount: 650_000,
        uniqueAmount: 650_021,
        status: "paid" as const,
        paidDaysAgo: 6,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 6_500,
      },
      {
        key: "order-4",
        code: orderCode("order4"),
        buyerKey: "nanda",
        sellerKey: "rani",
        workSlug: workSlug("pranatacaraSiraman"),
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_009,
        status: "awaiting_payment" as const,
        paidDaysAgo: undefined,
        createdDaysAgo: 0.005,
        completedDaysAgo: undefined,
        paymentStatus: "pending" as const,
        payoutStatus: undefined,
        gatewayFee: undefined,
      },
      {
        key: "order-5",
        code: orderCode("order5"),
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: workSlug("nampanBatikBambu"),
        baseAmount: 385_000,
        uniqueAmount: 385_042,
        status: "refunded" as const,
        paidDaysAgo: 40,
        completedDaysAgo: undefined,
        paymentStatus: "refunded" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 3_850,
      },
      {
        key: "order-6",
        code: orderCode("order6"),
        buyerKey: "yusuf",
        sellerKey: "dimas",
        workSlug: workSlug("boxTisuBatikBambu"),
        baseAmount: 275_000,
        uniqueAmount: 275_033,
        status: "disputed" as const,
        paidDaysAgo: 9,
        completedDaysAgo: undefined,
        paymentStatus: "paid" as const,
        payoutStatus: "held" as const,
        gatewayFee: 2_750,
      },
      {
        key: "order-7",
        code: orderCode("order7"),
        buyerKey: "dewi",
        sellerKey: "anisa",
        workSlug: workSlug("nampanBatikBambu"),
        baseAmount: 385_000,
        uniqueAmount: 385_058,
        status: "completed" as const,
        paidDaysAgo: 320,
        completedDaysAgo: 310,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 3_850,
      },
      {
        key: "order-8",
        code: orderCode("order8"),
        buyerKey: "arif",
        sellerKey: "purnomo",
        workSlug: workSlug("hiasanDindingBatikBambu"),
        baseAmount: 650_000,
        uniqueAmount: 650_046,
        status: "completed" as const,
        paidDaysAgo: 210,
        completedDaysAgo: 200,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 6_500,
      },
      {
        key: "order-9",
        code: orderCode("order9"),
        buyerKey: "melati",
        sellerKey: "rani",
        workSlug: workSlug("pranatacaraSiraman"),
        baseAmount: 2_500_000,
        uniqueAmount: 2_500_072,
        status: "completed" as const,
        paidDaysAgo: 155,
        completedDaysAgo: 148,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 25_000,
      },
      {
        key: "order-10",
        code: orderCode("order10"),
        buyerKey: "fajar",
        sellerKey: "dimas",
        workSlug: workSlug("boxTisuBatikBambu"),
        baseAmount: 275_000,
        uniqueAmount: 275_061,
        status: "completed" as const,
        paidDaysAgo: 148,
        completedDaysAgo: 140,
        paymentStatus: "paid" as const,
        payoutStatus: "paid" as const,
        gatewayFee: 2_750,
      },
      {
        key: "order-11",
        code: orderCode("order11"),
        buyerKey: "ratih",
        sellerKey: "anisa",
        workSlug: workSlug("nampanBatikBambu"),
        baseAmount: 385_000,
        uniqueAmount: 385_083,
        status: "completed" as const,
        paidDaysAgo: 112,
        completedDaysAgo: 104,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 3_850,
      },
      {
        key: "order-12",
        code: orderCode("order12"),
        buyerKey: "nanda",
        sellerKey: "dimas",
        workSlug: workSlug("boxTisuBatikBambu"),
        baseAmount: 275_000,
        uniqueAmount: 275_094,
        status: "completed" as const,
        paidDaysAgo: 58,
        completedDaysAgo: 50,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 2_750,
      },
      {
        key: "order-13",
        code: orderCode("order13"),
        buyerKey: "melati",
        sellerKey: "galuh",
        workSlug: workSlug("jasaTulisAksara"),
        baseAmount: 275_000,
        uniqueAmount: 275_037,
        status: "completed" as const,
        paidDaysAgo: 2,
        completedDaysAgo: 0.5,
        paymentStatus: "paid" as const,
        payoutStatus: "approved" as const,
        gatewayFee: 2_750,
      },
    ]
    const orderNotes: Record<string, string> = {
      "order-1":
        "Mohon dibungkus kertas bebas asam, kirim ke Mergangsan, Kota Yogyakarta.",
      "order-2":
        "Untuk hadiah pernikahan, mohon sertakan kartu perawatan produk bambu.",
      "order-3":
        "Kirim ke alamat kantor di Mlati, terima Senin sampai Jumat pukul 09.00 sampai 16.00.",
      "order-4":
        "Booking untuk akad 12 Desember 2026, prosesi pagi di Banguntapan.",
      "order-7": "Pesanan pertama, mohon dipotret proses pewarnaan terakhir.",
      "order-8": "Panel untuk dipajang di galeri, mohon sertakan Kartu Karya.",
      "order-9": "Acara keluarga di Kotagede, butuh gladi resik sehari sebelumnya.",
      "order-10": "Hadiah untuk ibu, mohon dibungkus rapi.",
      "order-11": "Pesanan ulang setelah nampan pertama dipakai untuk pameran.",
      "order-12": "Warna diminta sedikit lebih terang dari contoh foto.",
      "order-13":
        "Empat puluh undangan, ejaan nama keluarga mohon dicek sebelum ditulis.",
    }

    const orderIds = new Map<string, Id<"orders">>()
    const paymentIds = new Map<string, Id<"payments">>()
    const payoutIds = new Map<string, Id<"payouts">>()

    for (const seed of orders) {
      const buyer = await userByEmail(ctx, seedEmail(seed.buyerKey))
      const seller = await userByEmail(ctx, seedEmail(seed.sellerKey))
      const work = await workBySlug(ctx, seed.workSlug)
      const createdAt = clock.ago(
        "createdDaysAgo" in seed && seed.createdDaysAgo !== undefined
          ? seed.createdDaysAgo
          : (seed.paidDaysAgo ?? 2),
      )
      const paidAt =
        seed.paidDaysAgo !== undefined ? clock.ago(seed.paidDaysAgo) : undefined
      // Delivery falls between payment and completion, and never in the future.
      const paidDaysAgo = seed.paidDaysAgo ?? 0
      const deliveredDaysAgo =
        seed.completedDaysAgo !== undefined
          ? Math.min(
              paidDaysAgo,
              Math.max(paidDaysAgo - 3, seed.completedDaysAgo),
            )
          : Math.max(0, paidDaysAgo - 3)
      const order = await buildPaidOrder(ctx, {
        now: clock.now,
        code: seed.code,
        buyer,
        sellerId: seller._id,
        workId: work._id,
        itemKind: work.kind === "service" ? "service" : "work",
        pathId: work.pathId,
        title: work.title,
        baseAmount: seed.baseAmount,
        uniqueAmount: seed.uniqueAmount,
        createdAt,
        paidAt,
        status: seed.status,
        gatewayFee: seed.gatewayFee,
        note:
          orderNotes[seed.key] ??
          (seed.status === "disputed"
            ? "Pembeli meminta peninjauan kondisi produk bambu."
            : undefined),
        tokenSeed: `seed-order-token-${seed.key}`,
        providerKey: seed.key.replace("order-", "26"),
        orderIdempotencyKey: `seed-idem-${seed.key}`,
        paymentIdempotencyKey: `idem_${seed.key.replace("order-", "26")}`,
        deliveredAt:
          seed.status === "delivered" || seed.status === "completed"
            ? clock.ago(deliveredDaysAgo)
            : undefined,
        completedAt:
          seed.completedDaysAgo !== undefined
            ? clock.ago(seed.completedDaysAgo)
            : undefined,
        updatedAt: clock.now,
      })
      orderIds.set(seed.key, order.orderId)
      paymentIds.set(seed.key, order.paymentId)

      if (seed.status === "refunded") {
        await ctx.db.insert("paymentEvents", {
          eventId: `evt_refunded_${seed.key.replace("order-", "26")}`,
          paymentId: order.paymentId,
          orderId: order.orderId,
          kind: "refunded",
          amount: seed.baseAmount,
          providerReference: `QRIS-${seed.code}`,
          payload: { provider: "gopay_qris", stage: "refunded" },
          createdAt: clock.ago(35),
        })
      }

      if (seed.payoutStatus) {
        const payoutPaidAt =
          seed.payoutStatus === "paid"
            ? seed.key === "order-5"
              ? // The original sale was paid out before the refund reversed it.
                clock.ago(37)
              : seed.completedDaysAgo !== undefined
                ? clock.ago(Math.max(0, seed.completedDaysAgo - 3))
                : paidAt
                  ? paidAt + 7 * DAY
                  : undefined
            : undefined
        const allocation = await buildPayoutAllocation(ctx, {
          now: clock.now,
          orderId: order.orderId,
          paymentId: order.paymentId,
          teacherId: seller._id,
          baseAmount: seed.baseAmount,
          gatewayFee: seed.gatewayFee ?? 0,
          orderPaidAt: paidAt ?? createdAt,
          status: seed.payoutStatus,
          payoutPaidAt,
          dueAt: createdAt + 7 * DAY,
          createdAt: Math.min(clock.now - HOUR, createdAt + DAY),
          updatedAt: clock.now,
          approvedBy:
            seed.payoutStatus === "approved" || seed.payoutStatus === "paid"
              ? admin._id
              : undefined,
          reason:
            seed.payoutStatus === "held"
              ? "Ditahan sampai pesanan selesai atau sengketa ditutup."
              : undefined,
          holdReason:
            seed.payoutStatus === "held"
              ? "Menunggu penyelesaian pesanan."
              : undefined,
          reference: `PAYOUT-${seed.code}`,
          periodStart: createdAt,
          periodEnd: createdAt + 7 * DAY,
        })
        payoutIds.set(seed.key, allocation.payoutId)
      }
    }

    const refundOrder = orderIds.get("order-5")
    const refundPayment = paymentIds.get("order-5")
    if (refundOrder && refundPayment) {
      const ratih = await userByEmail(ctx, seedEmail("ratih"))
      await buildRefundReversal(ctx, {
        now: clock.now,
        orderId: refundOrder,
        paymentId: refundPayment,
        baseAmount: 385_000,
        amount: 385_000,
        requestedBy: ratih._id,
        reason: "Ukuran nampan tidak sesuai deskripsi.",
        status: "paid",
        decidedBy: admin._id,
        decisionReason: "Bukti foto mendukung permintaan pembeli.",
        evidence: "Foto ukuran nampan dan percakapan dengan penjual.",
        reviewedAt: clock.ago(36),
        paidAt: clock.ago(35),
        createdAt: clock.ago(38),
        updatedAt: clock.now,
        originalPayoutId: payoutIds.get("order-5"),
      })
    }

    const disputeOrder = orderIds.get("order-6")
    if (disputeOrder) {
      const yusuf = await userByEmail(ctx, seedEmail("yusuf"))
      await ctx.db.insert("disputes", {
        subjectType: "order",
        subjectId: disputeOrder,
        openedBy: yusuf._id,
        status: "open",
        reason:
          "Warna nampan lebih gelap dari foto. Saya minta peninjauan sebelum pesanan diselesaikan.",
        createdAt: clock.ago(2),
        updatedAt: clock.now,
      })
    }

    // Base-seeded enrollments predate commerce, so they need their own class
    // order and payment. Pending-payment enrollments are intentionally unpaid.
    const [baseEnrollments, cohorts, paths] = await Promise.all([
      ctx.db.query("enrollments").collect(),
      ctx.db.query("cohorts").collect(),
      ctx.db.query("paths").collect(),
    ])
    const cohortById = new Map(cohorts.map((row) => [row._id as string, row]))
    const pathBySlug = new Map(paths.map((row) => [row.slug, row]))
    let enrollmentOrders = 0
    for (const [index, enrollment] of baseEnrollments.entries()) {
      if (enrollment.status === "pending_payment") continue
      const cohort = enrollment.cohortId
        ? cohortById.get(enrollment.cohortId as string)
        : undefined
      const path = pathBySlug.get(enrollment.pathId)
      const student = await ctx.db.get(enrollment.studentId)
      if (!cohort || !path || !student) continue
      const paidAt = enrollment.enrolledAt
      await buildPaidOrder(ctx, {
        now: clock.now,
        code: `KN-2026-${String(900_001 + index).padStart(6, "0")}`,
        buyer: student,
        sellerId: cohort.teacherId,
        itemKind: "path",
        pathId: enrollment.pathId,
        title: `Kelas ${path.title}`,
        baseAmount: path.price ?? 500_000,
        createdAt: paidAt,
        paidAt,
        status:
          enrollment.status === "completed" && enrollment.completedAt !== undefined
            ? "completed"
            : "paid",
        deliveredAt:
          enrollment.status === "completed" && enrollment.completedAt !== undefined
            ? paidAt
            : undefined,
        completedAt:
          enrollment.status === "completed" ? enrollment.completedAt : undefined,
        gatewayFee: Math.round((path.price ?? 500_000) * 0.01),
        note: `Pendaftaran ${cohort.code}.`,
        tokenSeed: `seed-enrollment-token-${enrollment._id}`,
        providerKey: `enrollment_${enrollment._id}`,
        orderIdempotencyKey: `seed-enrollment-idem-${enrollment._id}`,
        paymentIdempotencyKey: `idem_enrollment_${enrollment._id}`,
        updatedAt: clock.now,
      })
      enrollmentOrders += 1
    }

    const bambang = await userByEmail(ctx, seedEmail("bambang"))
    const bambangCohort = cohorts.find(
      (row) => row.teacherId === bambang._id,
    )
    if (!bambangCohort) {
      const startDate = clock.ahead(30)
      const endDate = clock.ahead(90)
      const cohortId = await ctx.db.insert("cohorts", {
        code: "BTS-2026-01",
        pathId: pathSlug("batikTulisSoga"),
        teacherId: bambang._id,
        title: "Batik Tulis Giriloyo, Angkatan Perdana",
        startDate,
        endDate,
        capacity: 8,
        timezone: "Asia/Jakarta",
        // This cohort exists so the coming-soon teacher has a real teaching
        // record. It stays internal until the curriculum is published.
        status: "draft",
        createdAt: clock.ago(20),
        updatedAt: clock.now,
      })
      const assessmentAt = startDate + 45 * DAY
      await ctx.db.insert("cohortSessions", {
        cohortId,
        title: "Penilaian akhir batik tulis",
        kind: "assessment",
        startsAt: assessmentAt,
        endsAt: assessmentAt + 2 * HOUR,
        timezone: "Asia/Jakarta",
        roomId: "kalanidhi-bts-2026-01-1",
        status: "scheduled",
        createdAt: clock.ago(18),
      })
    }

    return {
      orders: orderIds.size + enrollmentOrders,
      payments: paymentIds.size + enrollmentOrders,
      payouts: payoutIds.size,
      enrollmentOrders,
    }
  },
})
