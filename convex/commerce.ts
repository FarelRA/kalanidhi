import { v } from "convex/values"

import { assertRupiah, MoneyError, splitAmount } from "../lib/commerce/money"
import type {
  DisputeView,
  GuestOrderView,
  OrderStatus,
  OrderTimelineEntry,
  OrderView,
  PublicWorkView,
  WorkCardStatus,
  WorkListingView,
  WorkStatus,
} from "../lib/commerce/types"
import type { Viewer } from "../lib/access/viewer"
import { assertScope } from "./access"
import {
  assertEmail,
  assertReason,
  assertSellerScope,
  commerceError,
  CONSENT_VERSION,
  currentViewer,
  findByToken,
  hashToken,
  maskEmail,
  notFound,
  now,
  optionalViewer,
  ORDER_TOKEN_BYTES,
  orderCode,
  randomToken,
  requireViewer,
  writeAudit,
} from "./commerce_shared"
import type { Doc, Id } from "./_generated/dataModel"
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server"

type ReadCtx = Pick<QueryCtx, "db" | "auth" | "storage"> | MutationCtx

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Draf",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Dibayar",
  in_progress: "Diproses",
  delivered: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  disputed: "Sengketa",
}

function workStatusOf(work: Doc<"works">): WorkStatus {
  return (work.status ?? "draft") as WorkStatus
}

function cardStatusOf(card: Doc<"workCards"> | null): WorkCardStatus {
  return (card?.status ?? "draft") as WorkCardStatus
}

function safeSplit(baseAmount: number) {
  try {
    return splitAmount(baseAmount)
  } catch {
    return null
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72)
}

async function uniqueSlug(ctx: ReadCtx, title: string): Promise<string> {
  const base = slugify(title) || `karya-${Date.now()}`
  let candidate = base
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const existing = await ctx.db
      .query("works")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .unique()
    if (!existing) return candidate
    candidate = `${base}-${randomToken(2)}`
  }
  return `${base}-${randomToken(4)}`
}

async function nextWorkOrder(ctx: ReadCtx): Promise<number> {
  const latest = await ctx.db
    .query("works")
    .withIndex("by_order")
    .order("desc")
    .first()
  return (latest?.order ?? 0) + 1
}

async function workCardFor(
  ctx: ReadCtx,
  workId: Id<"works">,
): Promise<Doc<"workCards"> | null> {
  return await ctx.db
    .query("workCards")
    .withIndex("by_workId", (q) => q.eq("workId", workId))
    .unique()
}

async function workImageUrl(
  ctx: ReadCtx,
  work: Doc<"works">,
): Promise<string> {
  if (!work.imageAssetId) return ""
  const asset = await ctx.db.get(work.imageAssetId)
  if (!asset) return ""
  if (asset.storageId) return (await ctx.storage.getUrl(asset.storageId)) ?? ""
  return asset.externalUrl ?? ""
}

async function assetIdForImageUrl(
  ctx: ReadCtx,
  url: string | undefined,
): Promise<Id<"mediaAssets"> | undefined> {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  const assets = await ctx.db.query("mediaAssets").collect()
  for (const asset of assets) {
    const candidate = asset.storageId
      ? await ctx.storage.getUrl(asset.storageId)
      : asset.externalUrl
    if (candidate && candidate === trimmed) return asset._id
  }
  commerceError(
    "MEDIA_NOT_FOUND",
    "Foto karya harus berasal dari penyimpanan Convex.",
  )
}

function workComplete(work: Doc<"works">, card: Doc<"workCards"> | null): boolean {
  return Boolean(
    work.imageAssetId &&
      work.title &&
      work.price > 0 &&
      work.unit &&
      work.technique &&
      work.maker &&
      work.teacher &&
      work.pathId &&
      card &&
      card.permission &&
      card.provenance &&
      card.materials,
  )
}

function assertWorkInput(input: {
  title: string
  price: number
  unit: string
  technique: string
}): void {
  if (input.title.trim().length < 3) {
    commerceError("INVALID_WORK", "Judul karya minimal tiga karakter.")
  }
  if (!input.unit.trim() || !input.technique.trim()) {
    commerceError("INVALID_WORK", "Satuan dan teknik wajib diisi.")
  }
  try {
    assertRupiah(input.price, "Harga")
  } catch (error) {
    if (error instanceof MoneyError) commerceError(error.code, error.message)
    throw error
  }
}

async function cardForView(
  ctx: ReadCtx,
  work: Doc<"works">,
  viewer: Viewer,
): Promise<WorkListingView> {
  const card = await workCardFor(ctx, work._id)
  return {
    id: work._id,
    slug: work.slug,
    title: work.title,
    kind: work.kind,
    category: work.category,
    maker: work.maker,
    makerId: work.makerId ?? null,
    makerRole: work.makerRole,
    teacher: work.teacher,
    region: work.region,
    price: work.price,
    priceLabel: work.priceLabel,
    unit: work.unit,
    technique: work.technique,
    techniqueNote: work.techniqueNote,
    workCard: work.workCard,
    description: work.description,
    image: await workImageUrl(ctx, work),
    pathId: work.pathId ?? null,
    certificateId: work.certificateId ?? null,
    permission: card?.permission ?? work.permission ?? "",
    provenance: card?.provenance ?? "",
    materials: card?.materials ?? "",
    status: workStatusOf(work),
    cardStatus: cardStatusOf(card),
    createdAt: work.createdAt ?? work._creationTime,
    split: safeSplit(work.price),
    canReview: Boolean(
      work.pathId &&
        viewer.capabilities.includes("works.review") &&
        viewer.teachScopes.includes(work.pathId),
    ),
    canModerate: viewer.capabilities.includes("works.moderate"),
    canEdit:
      work.makerId === viewer.userId &&
      ["draft", "review"].includes(workStatusOf(work)),
  }
}

async function assertWorkVisibility(
  ctx: ReadCtx,
  viewer: Viewer,
  work: Doc<"works">,
): Promise<void> {
  if (viewer.capabilities.includes("works.moderate")) return
  if (work.makerId === viewer.userId) return
  if (
    viewer.capabilities.includes("works.review") &&
    work.pathId &&
    viewer.teachScopes.includes(work.pathId)
  ) {
    return
  }
  notFound()
}

async function publicWork(
  ctx: ReadCtx,
  work: Doc<"works">,
): Promise<PublicWorkView | null> {
  if (workStatusOf(work) !== "published") return null
  if (!work.pathId || !work.makerId) return null
  try {
    await assertSellerScope(ctx, work.makerId, work.pathId)
  } catch {
    return null
  }
  let split
  try {
    split = splitAmount(work.price)
  } catch {
    return null
  }
  return {
    id: work._id,
    slug: work.slug,
    title: work.title,
    kind: work.kind,
    category: work.category,
    maker: work.maker,
    makerRole: work.makerRole,
    teacher: work.teacher,
    region: work.region,
    price: work.price,
    priceLabel: work.priceLabel,
    unit: work.unit,
    technique: work.technique,
    techniqueNote: work.techniqueNote,
    workCard: work.workCard,
    description: work.description,
    image: await workImageUrl(ctx, work),
    permission: work.permission ?? "",
    split,
  }
}

async function findUser(ctx: ReadCtx, userId: Id<"users">) {
  return await ctx.db.get(userId)
}

async function toOrderView(
  ctx: ReadCtx,
  order: Doc<"orders">,
): Promise<OrderView> {
  const [work, seller, payments, payouts, refunds, disputes] = await Promise.all([
    order.workId ? ctx.db.get(order.workId) : null,
    findUser(ctx, order.sellerId),
    ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect(),
    ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect(),
    ctx.db
      .query("refunds")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect(),
    ctx.db
      .query("disputes")
      .withIndex("by_subject", (q) =>
        q.eq("subjectType", "order").eq("subjectId", order._id),
      )
      .collect(),
  ])

  const payment = [...payments].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  const payout =
    [...payouts]
      .filter((row) => (row.kind ?? "sale") === "sale")
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  const refund = [...refunds].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null
  const dispute =
    [...disputes].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null

  return {
    id: order._id,
    code: order.code,
    buyerUserId: order.buyerUserId ?? null,
    buyerName: order.buyerName,
    buyerEmail: order.buyerEmail,
    buyerWhatsapp: order.buyerWhatsapp,
    sellerId: order.sellerId,
    sellerName: seller?.name ?? "Penjual",
    workId: order.workId ?? null,
    workTitle: work?.title ?? "Karya",
    workSlug: work?.slug ?? null,
    pathId: order.pathId ?? null,
    baseAmount: order.baseAmount,
    uniqueAmount: order.uniqueAmount ?? null,
    status: order.status,
    channel: order.channel,
    note: order.note,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt ?? null,
    deliveredAt: order.deliveredAt ?? null,
    completedAt: order.completedAt ?? null,
    claimedAt: order.claimedAt ?? null,
    paymentId: payment?._id ?? null,
    paymentStatus: payment?.status ?? null,
    payoutId: payout?._id ?? null,
    refundId: refund?._id ?? null,
    disputeId: dispute?._id ?? null,
    split: splitAmount(order.baseAmount),
  }
}

function hasOrderRelation(viewer: Viewer | null, order: Doc<"orders">): boolean {
  if (!viewer) return false
  return (
    order.buyerUserId === viewer.userId || order.sellerId === viewer.userId
  )
}

async function visibleOrder(
  ctx: ReadCtx,
  viewer: Viewer,
  orderId: Id<"orders">,
): Promise<Doc<"orders">> {
  const order = await ctx.db.get(orderId)
  if (!order) notFound("Pesanan tidak ditemukan.")
  if (viewer.capabilities.includes("orders.read.all")) return order
  if (hasOrderRelation(viewer, order)) return order
  notFound("Pesanan tidak ditemukan.")
}

function isOpenPayoutStatus(status: string): boolean {
  return ["pending", "held", "approved"].includes(status)
}

/* ------------------------------------------------------------------ works */

export const getPublicWork = query({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<PublicWorkView | null> => {
    const work = await ctx.db
      .query("works")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique()
    if (!work) return null
    return await publicWork(ctx, work)
  },
})

export const listPublicWorks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<PublicWorkView[]> => {
    const works = await ctx.db
      .query("works")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("asc")
      .take(Math.min(Math.max(args.limit ?? 24, 1), 60))
    const result: PublicWorkView[] = []
    for (const work of works) {
      const view = await publicWork(ctx, work)
      if (view) result.push(view)
    }
    return result
  },
})

export const listWorks = query({
  args: {},
  handler: async (ctx): Promise<WorkListingView[]> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current

    const works: Doc<"works">[] = []
    const seen = new Set<string>()
    const push = (rows: Doc<"works">[]) => {
      for (const row of rows) {
        if (seen.has(row._id)) continue
        seen.add(row._id)
        works.push(row)
      }
    }

    if (viewer.capabilities.includes("works.moderate")) {
      push(await ctx.db.query("works").withIndex("by_order").collect())
    } else {
      if (viewer.capabilities.includes("works.own")) {
        push(
          await ctx.db
            .query("works")
            .withIndex("by_makerId", (q) =>
              q.eq("makerId", viewer.userId as Id<"users">),
            )
            .collect(),
        )
      }
      if (viewer.capabilities.includes("works.review")) {
        for (const pathId of viewer.teachScopes) {
          push(
            await ctx.db
              .query("works")
              .withIndex("by_pathId", (q) => q.eq("pathId", pathId))
              .collect(),
          )
        }
      }
    }

    const views = await Promise.all(works.map((work) => cardForView(ctx, work, viewer)))
    return views.sort((a, b) => b.createdAt - a.createdAt)
  },
})

export const getWorkDetail = query({
  args: { workId: v.id("works") },
  handler: async (ctx, args): Promise<WorkListingView> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const work = await ctx.db.get(args.workId)
    if (!work) notFound("Karya tidak ditemukan.")
    await assertWorkVisibility(ctx, current.viewer, work)
    return await cardForView(ctx, work, current.viewer)
  },
})

export const createWork = mutation({
  args: {
    title: v.string(),
    pathId: v.string(),
    certificateId: v.optional(v.id("certificates")),
    price: v.number(),
    unit: v.string(),
    technique: v.string(),
    techniqueNote: v.optional(v.string()),
    description: v.string(),
    image: v.optional(v.string()),
    imageAssetId: v.optional(v.id("mediaAssets")),
    kind: v.union(v.literal("product"), v.literal("service")),
    category: v.union(v.literal("batik"), v.literal("layanan")),
    permission: v.optional(v.string()),
    provenance: v.optional(v.string()),
    materials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user, viewer } = await requireViewer(ctx, "sell")
    assertScope(viewer, "sell", args.pathId)
    assertWorkInput(args)

    if (!viewer.entitlements.teach) {
      if (!args.certificateId) {
        commerceError(
          "CERTIFICATE_REQUIRED",
          "Penjual peserta wajib menyertakan sertifikat jalur.",
        )
      }
      const certificate = await ctx.db.get(args.certificateId)
      if (
        !certificate ||
        certificate.studentId !== user._id ||
        certificate.status !== "issued" ||
        certificate.pathId !== args.pathId
      ) {
        commerceError(
          "CERTIFICATE_REQUIRED",
          "Sertifikat tidak sah atau berada di jalur lain.",
        )
      }
    }

    const teacherDoc = user.roles.includes("teacher")
      ? await ctx.db
          .query("teachers")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique()
      : null

    let teacherName = teacherDoc?.name ?? "Belum ditentukan"
    if (args.certificateId) {
      const certificate = await ctx.db.get(args.certificateId)
      if (certificate) {
        const certTeacher = await ctx.db.get(certificate.teacherId)
        if (certTeacher) teacherName = certTeacher.name
      }
    }

    const timestamp = now()
    const slug = await uniqueSlug(ctx, args.title)
    const order = await nextWorkOrder(ctx)
    const serial = `KK-${new Date(timestamp).getUTCFullYear()}-${randomToken(3).toUpperCase()}`
    const status: WorkStatus = "draft"

    const workId = await ctx.db.insert("works", {
      order,
      slug,
      title: args.title.trim(),
      category: args.category,
      kind: args.kind,
      maker: viewer.name,
      makerRole: viewer.entitlements.teach ? "Pengajar" : "Peserta bersertifikat",
      teacher: teacherName,
      region: viewer.region,
      price: args.price,
      unit: args.unit.trim(),
      technique: args.technique.trim(),
      techniqueNote: args.techniqueNote?.trim() ?? "",
      workCard: serial,
      description: args.description.trim(),
      imageAssetId:
        args.imageAssetId ?? (await assetIdForImageUrl(ctx, args.image)),
      makerId: user._id,
      pathId: args.pathId,
      certificateId: args.certificateId,
      status,
      permission: args.permission?.trim() ?? "",
      createdAt: timestamp,
    })

    const workCardId = await ctx.db.insert("workCards", {
      workId,
      certificateId: args.certificateId,
      makerId: user._id,
      serial,
      title: args.title.trim(),
      technique: args.technique.trim(),
      materials: args.materials?.trim() ?? "",
      provenance: args.provenance?.trim() ?? "",
      permission: args.permission?.trim() ?? "",
      accessLevel: "public",
      status: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.create",
      entityType: "works",
      entityId: workId,
      reason: "Karya baru dibuat.",
      after: { title: args.title, pathId: args.pathId, price: args.price },
    })

    return { workId, workCardId, slug, serial }
  },
})

export const updateWork = mutation({
  args: {
    workId: v.id("works"),
    title: v.optional(v.string()),
    price: v.optional(v.number()),
    unit: v.optional(v.string()),
    technique: v.optional(v.string()),
    techniqueNote: v.optional(v.string()),
    description: v.optional(v.string()),
    image: v.optional(v.string()),
    imageAssetId: v.optional(v.id("mediaAssets")),
    permission: v.optional(v.string()),
    provenance: v.optional(v.string()),
    materials: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "sell")
    const work = await ctx.db.get(args.workId)
    if (!work || work.makerId !== viewer.userId) notFound("Karya tidak ditemukan.")
    if (!["draft", "review"].includes(workStatusOf(work))) {
      commerceError(
        "INVALID_STATE",
        "Karya yang sudah tayang tidak dapat diedit langsung.",
      )
    }
    if (work.pathId) assertScope(viewer, "sell", work.pathId)
    if (args.price !== undefined) {
      try {
        assertRupiah(args.price, "Harga")
      } catch (error) {
        if (error instanceof MoneyError) commerceError(error.code, error.message)
        throw error
      }
    }

    const patch: Partial<Doc<"works">> = {}
    if (args.title !== undefined) patch.title = args.title.trim()
    if (args.price !== undefined) patch.price = args.price
    if (args.unit !== undefined) patch.unit = args.unit.trim()
    if (args.technique !== undefined) patch.technique = args.technique.trim()
    if (args.techniqueNote !== undefined) patch.techniqueNote = args.techniqueNote.trim()
    if (args.description !== undefined) patch.description = args.description.trim()
    if (args.imageAssetId !== undefined) {
      patch.imageAssetId = args.imageAssetId
    } else if (args.image !== undefined) {
      patch.imageAssetId = await assetIdForImageUrl(ctx, args.image)
    }
    if (args.permission !== undefined) patch.permission = args.permission.trim()
    await ctx.db.patch(work._id, patch)

    const card = await workCardFor(ctx, work._id)
    if (card) {
      const cardPatch: Partial<Doc<"workCards">> = { updatedAt: now() }
      if (args.title !== undefined) cardPatch.title = args.title.trim()
      if (args.technique !== undefined) cardPatch.technique = args.technique.trim()
      if (args.materials !== undefined) cardPatch.materials = args.materials.trim()
      if (args.provenance !== undefined) cardPatch.provenance = args.provenance.trim()
      if (args.permission !== undefined) cardPatch.permission = args.permission.trim()
      await ctx.db.patch(card._id, cardPatch)
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.update",
      entityType: "works",
      entityId: work._id,
      reason: "Karya diperbarui sebelum moderasi.",
      before: { title: work.title, price: work.price },
      after: patch,
    })

    return null
  },
})

export const submitWork = mutation({
  args: { workId: v.id("works") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "sell")
    const work = await ctx.db.get(args.workId)
    if (!work || work.makerId !== viewer.userId) notFound("Karya tidak ditemukan.")
    const card = await workCardFor(ctx, work._id)
    if (!card) notFound("Kartu Karya tidak ditemukan.")
    if (card.status !== "draft" && card.status !== "paused") {
      commerceError("INVALID_STATE", "Karya ini sudah diajukan.")
    }
    if (!work.pathId) commerceError("INVALID_WORK", "Jalur karya wajib diisi.")
    assertScope(viewer, "sell", work.pathId)
    if (!workComplete(work, card)) {
      commerceError(
        "INCOMPLETE_WORK",
        "Foto, izin sumber, provenans, dan atribusi wajib lengkap sebelum pengajuan.",
      )
    }

    const timestamp = now()
    await ctx.db.patch(work._id, { status: "review" })
    await ctx.db.patch(card._id, {
      status: "submitted",
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.submit",
      entityType: "works",
      entityId: work._id,
      reason: "Karya diajukan untuk konfirmasi pengajar.",
    })
    return null
  },
})

export const confirmWork = mutation({
  args: { workId: v.id("works") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "works.review")
    const work = await ctx.db.get(args.workId)
    if (!work) notFound("Karya tidak ditemukan.")
    if (!work.pathId) commerceError("INVALID_WORK", "Jalur karya tidak tercatat.")
    assertScope(viewer, "teach", work.pathId)
    const card = await workCardFor(ctx, work._id)
    if (!card || card.status !== "submitted") {
      commerceError("INVALID_STATE", "Karya belum menunggu konfirmasi pengajar.")
    }

    await ctx.db.patch(card._id, { status: "teacher_confirmed", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.confirm",
      entityType: "works",
      entityId: work._id,
      reason: "Pengajar mengonfirmasi karya dalam jalur yang diampu.",
      after: { pathId: work.pathId },
    })
    return null
  },
})

export const beginWorkReview = mutation({
  args: { workId: v.id("works") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "works.moderate")
    const card = await workCardFor(ctx, args.workId)
    if (!card || card.status !== "teacher_confirmed") {
      commerceError("INVALID_STATE", "Karya belum dikonfirmasi pengajar.")
    }
    await ctx.db.patch(card._id, { status: "admin_review", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.review",
      entityType: "works",
      entityId: args.workId,
      reason: "Karya masuk antrean moderasi pengelola.",
    })
    return null
  },
})

export const publishWork = mutation({
  args: { workId: v.id("works"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "works.moderate")
    const reason = assertReason(args.reason, "Alasan penerbitan")
    const work = await ctx.db.get(args.workId)
    if (!work) notFound("Karya tidak ditemukan.")
    const card = await workCardFor(ctx, work._id)
    if (!card || card.status !== "admin_review") {
      commerceError(
        "INVALID_STATE",
        "Karya harus melewati konfirmasi pengajar dan moderasi.",
      )
    }
    if (!workComplete(work, card)) {
      commerceError(
        "INCOMPLETE_WORK",
        "Karya belum lengkap: foto, izin, provenans, dan atribusi wajib terisi.",
      )
    }
    if (!work.pathId) commerceError("INVALID_WORK", "Jalur karya wajib diisi.")
    if (!work.makerId) commerceError("INVALID_WORK", "Pembuat karya tidak tercatat.")
    await assertSellerScope(ctx, work.makerId, work.pathId)

    const timestamp = now()
    await ctx.db.patch(work._id, { status: "published" })
    await ctx.db.patch(card._id, { status: "published", updatedAt: timestamp })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.publish",
      entityType: "works",
      entityId: work._id,
      reason,
      before: { status: work.status, cardStatus: card.status },
      after: { status: "published", cardStatus: "published" },
    })
    return null
  },
})

export const pauseWork = mutation({
  args: { workId: v.id("works"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current
    const work = await ctx.db.get(args.workId)
    if (!work) notFound("Karya tidak ditemukan.")

    const isAdmin = viewer.capabilities.includes("works.moderate")
    const isOwner = work.makerId === viewer.userId
    if (!isAdmin && !isOwner) notFound("Karya tidak ditemukan.")
    if (workStatusOf(work) === "paused") return null

    const reason = isAdmin
      ? assertReason(args.reason, "Alasan penjedaan")
      : (args.reason?.trim() || "Dijeda oleh pemilik karya.")

    const timestamp = now()
    await ctx.db.patch(work._id, { status: "paused" })
    const card = await workCardFor(ctx, work._id)
    if (card && ["published", "admin_review", "teacher_confirmed"].includes(card.status)) {
      await ctx.db.patch(card._id, { status: "paused", updatedAt: timestamp })
    }
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.pause",
      entityType: "works",
      entityId: work._id,
      reason,
      before: { status: work.status },
      after: { status: "paused" },
    })
    return null
  },
})

export const resumeWork = mutation({
  args: { workId: v.id("works"), reason: v.string() },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "works.moderate")
    const reason = assertReason(args.reason, "Alasan penerbitan ulang")
    const work = await ctx.db.get(args.workId)
    if (!work) notFound("Karya tidak ditemukan.")
    if (workStatusOf(work) !== "paused") {
      commerceError("INVALID_STATE", "Hanya karya yang dijeda dapat diterbitkan ulang.")
    }
    const card = await workCardFor(ctx, work._id)
    if (!workComplete(work, card)) {
      commerceError("INCOMPLETE_WORK", "Karya belum lengkap untuk tayang kembali.")
    }
    if (!work.pathId) commerceError("INVALID_WORK", "Jalur karya wajib diisi.")
    if (!work.makerId) commerceError("INVALID_WORK", "Pembuat karya tidak tercatat.")
    await assertSellerScope(ctx, work.makerId, work.pathId)

    await ctx.db.patch(work._id, { status: "published" })
    if (card) await ctx.db.patch(card._id, { status: "published", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.resume",
      entityType: "works",
      entityId: work._id,
      reason,
      after: { status: "published" },
    })
    return null
  },
})

export const markWorkSoldOut = mutation({
  args: { workId: v.id("works") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "sell")
    const work = await ctx.db.get(args.workId)
    if (!work || work.makerId !== viewer.userId) notFound("Karya tidak ditemukan.")
    if (workStatusOf(work) !== "published") {
      commerceError("INVALID_STATE", "Hanya karya tayang dapat ditandai habis.")
    }
    await ctx.db.patch(work._id, { status: "sold_out" })
    const card = await workCardFor(ctx, work._id)
    if (card) await ctx.db.patch(card._id, { status: "sold_out", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.work.soldOut",
      entityType: "works",
      entityId: work._id,
      reason: "Karya ditandai habis oleh penjual.",
    })
    return null
  },
})

export const bulkPauseWorks = mutation({
  args: {
    pathId: v.optional(v.string()),
    makerId: v.optional(v.id("users")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "works.moderate")
    const reason = assertReason(args.reason, "Alasan penjedaan massal")
    if (!args.pathId && !args.makerId) {
      commerceError("INVALID_INPUT", "Sebutkan jalur atau pembuat karya.")
    }

    const rows = args.makerId
      ? await ctx.db
          .query("works")
          .withIndex("by_makerId", (q) => q.eq("makerId", args.makerId))
          .collect()
      : await ctx.db
          .query("works")
          .withIndex("by_pathId", (q) => q.eq("pathId", args.pathId ?? ""))
          .collect()

    const affected = rows.filter(
      (work) => work.status === "published" || work.status === "review",
    )
    for (const work of affected) {
      await ctx.db.patch(work._id, { status: "paused" })
      const card = await workCardFor(ctx, work._id)
      if (card) await ctx.db.patch(card._id, { status: "paused", updatedAt: now() })
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.works.bulkPause",
      entityType: "works",
      entityId: args.pathId ?? args.makerId,
      reason,
      after: { affected: affected.length, pathId: args.pathId, makerId: args.makerId },
      severity: "warning",
    })
    return { affected: affected.length }
  },
})

/* ----------------------------------------------------------------- orders */

export const createGuestOrder = mutation({
  args: {
    workSlug: v.string(),
    buyerName: v.string(),
    buyerEmail: v.string(),
    buyerWhatsapp: v.optional(v.string()),
    note: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    consentTransactional: v.boolean(),
    consentVersion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.consentTransactional) {
      commerceError(
        "CONSENT_REQUIRED",
        "Persetujuan kontak transaksional diperlukan.",
      )
    }
    const buyerEmail = assertEmail(args.buyerEmail)
    const buyerName = args.buyerName.trim()
    if (buyerName.length < 2) {
      commerceError("INVALID_BUYER", "Nama pembeli wajib diisi.")
    }

    const work = await ctx.db
      .query("works")
      .withIndex("by_slug", (q) => q.eq("slug", args.workSlug))
      .unique()
    if (!work) notFound("Karya tidak ditemukan.")
    if (!["published"].includes(workStatusOf(work)) || !work.pathId) {
      commerceError("WORK_UNAVAILABLE", "Karya ini tidak sedang dijual.")
    }
    if (!work.makerId) {
      commerceError("WORK_UNAVAILABLE", "Penjual karya belum terhubung ke akun.")
    }

    const seller = await findUser(ctx, work.makerId)
    if (!seller) notFound("Penjual tidak ditemukan.")
    // A revoked certificate or suspended seller profile removes the path scope.
    // The listing is hidden from public reads and cannot be ordered; Phase 2
    // revocation should also run the bulk pause for an immediate takedown.
    await assertSellerScope(ctx, work.makerId, work.pathId)

    const current = await optionalViewer(ctx)
    if (current && current.viewer.userId === seller._id) {
      commerceError("SELF_DEALING", "Tidak dapat membeli karya sendiri.")
    }
    if (current && current.viewer.email.toLowerCase() === seller.email.toLowerCase()) {
      commerceError("SELF_DEALING", "Tidak dapat membeli karya sendiri.")
    }
    if (buyerEmail === seller.email.toLowerCase()) {
      commerceError("SELF_DEALING", "Tidak dapat membeli karya sendiri.")
    }

    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("orders")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey),
        )
        .unique()
      if (existing) {
        if (existing.buyerEmail.toLowerCase() !== buyerEmail) {
          commerceError("INVALID_IDEMPOTENCY", "Kunci idempotensi tidak cocok.")
        }
        const token = randomToken()
        await ctx.db.patch(existing._id, {
          tokenHash: await hashToken(token),
          updatedAt: now(),
        })
        return {
          orderId: existing._id,
          code: existing.code,
          token,
          baseAmount: existing.baseAmount,
        }
      }
    }

    const timestamp = now()
    let code = orderCode()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const clash = await ctx.db
        .query("orders")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique()
      if (!clash) break
      code = orderCode()
    }

    const token = randomToken(ORDER_TOKEN_BYTES)
    const tokenHash = await hashToken(token)
    const orderId = await ctx.db.insert("orders", {
      code,
      buyerUserId: current?.user._id,
      buyerName,
      buyerEmail,
      buyerWhatsapp: args.buyerWhatsapp?.trim() || undefined,
      sellerId: seller._id,
      workId: work._id,
      pathId: work.pathId,
      baseAmount: work.price,
      status: "draft",
      channel: "web",
      note: args.note?.trim() || undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      tokenHash,
      idempotencyKey: args.idempotencyKey,
      consentVersion: CONSENT_VERSION,
      consentAt: timestamp,
    })

    await ctx.db.insert("orderItems", {
      orderId,
      kind: work.kind === "service" ? "service" : "work",
      refId: work._id,
      pathId: work.pathId,
      title: work.title,
      quantity: 1,
      unitAmount: work.price,
      totalAmount: work.price,
    })

    await writeAudit(ctx, {
      actorId: current?.viewer.userId ?? "guest",
      actorRole: current?.viewer.roleLabel ?? "Tamu",
      action: "commerce.order.create",
      entityType: "orders",
      entityId: orderId,
      reason: "Pesanan tamu dibuat melalui checkout publik.",
      after: { code, workId: work._id, baseAmount: work.price },
    })

    return { orderId, code, token, baseAmount: work.price }
  },
})

export const getOrderByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<GuestOrderView | null> => {
    const order = await findByToken(ctx, args.token)
    if (!order) return null

    const [work, seller] = await Promise.all([
      order.workId ? ctx.db.get(order.workId) : null,
      findUser(ctx, order.sellerId),
    ])
    if (!work) return null

    const timeline: OrderTimelineEntry[] = [
      { status: "draft", label: ORDER_STATUS_LABELS.draft, at: order.createdAt },
      {
        status: "awaiting_payment",
        label: ORDER_STATUS_LABELS.awaiting_payment,
        at: order.uniqueAmount ? order.createdAt : null,
      },
      { status: "paid", label: ORDER_STATUS_LABELS.paid, at: order.paidAt ?? null },
      {
        status: "in_progress",
        label: ORDER_STATUS_LABELS.in_progress,
        at: order.paidAt ?? null,
      },
      {
        status: "delivered",
        label: ORDER_STATUS_LABELS.delivered,
        at: order.deliveredAt ?? null,
      },
      {
        status: "completed",
        label: ORDER_STATUS_LABELS.completed,
        at: order.completedAt ?? null,
      },
    ]

    return {
      code: order.code,
      status: order.status,
      buyerName: order.buyerName,
      buyerEmailMasked: maskEmail(order.buyerEmail),
      workTitle: work.title,
      sellerName: seller?.name ?? "Penjual",
      baseAmount: order.baseAmount,
      uniqueAmount: order.uniqueAmount ?? null,
      createdAt: order.createdAt,
      paidAt: order.paidAt ?? null,
      claimed: Boolean(order.buyerUserId),
      timeline,
    }
  },
})

export const claimOrder = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const { user, viewer } = await requireViewer(ctx, "orders.read.own")
    if (!user.emailVerified) {
      commerceError("EMAIL_UNVERIFIED", "Verifikasi email sebelum mengklaim pesanan.")
    }
    const order = await findByToken(ctx, args.token)
    if (!order) notFound("Pesanan tidak ditemukan.")

    if (order.buyerUserId) {
      if (order.buyerUserId === user._id) {
        return { claimed: true, orderId: order._id }
      }
      notFound("Pesanan tidak ditemukan.")
    }
    if (order.sellerId === user._id) {
      commerceError("SELF_DEALING", "Penjual tidak dapat mengklaim pesanannya sendiri.")
    }
    if (order.buyerEmail.toLowerCase() !== user.email.toLowerCase()) {
      notFound("Pesanan tidak ditemukan.")
    }

    const timestamp = now()
    await ctx.db.patch(order._id, {
      buyerUserId: user._id,
      claimedAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.claim",
      entityType: "orders",
      entityId: order._id,
      reason: "Pesanan tamu diklaim oleh akun dengan email terverifikasi.",
    })
    return { claimed: true, orderId: order._id }
  },
})

export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<OrderView> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const order = await visibleOrder(ctx, current.viewer, args.orderId)
    return await toOrderView(ctx, order)
  },
})

export const listOrders = query({
  args: {},
  handler: async (ctx): Promise<OrderView[]> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current

    let rows: Doc<"orders">[] = []
    if (viewer.capabilities.includes("orders.read.all")) {
      rows = await ctx.db
        .query("orders")
        .withIndex("by_createdAt")
        .order("desc")
        .take(200)
    } else if (viewer.capabilities.includes("orders.sell")) {
      rows = await ctx.db
        .query("orders")
        .withIndex("by_sellerId", (q) =>
          q.eq("sellerId", viewer.userId as Id<"users">),
        )
        .collect()
    } else if (
      viewer.capabilities.includes("orders.buy") ||
      viewer.capabilities.includes("orders.read.own")
    ) {
      rows = await ctx.db
        .query("orders")
        .withIndex("by_buyerUserId", (q) =>
          q.eq("buyerUserId", viewer.userId as Id<"users">),
        )
        .collect()
    } else {
      commerceError("FORBIDDEN", "Akun ini tidak memiliki akses pesanan.")
    }

    const views = await Promise.all(rows.map((order) => toOrderView(ctx, order)))
    return views
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 200)
  },
})

async function assertOrderActor(
  ctx: ReadCtx,
  viewer: Viewer,
  order: Doc<"orders">,
  role: "buyer" | "seller",
): Promise<void> {
  const matches =
    role === "buyer"
      ? order.buyerUserId === viewer.userId
      : order.sellerId === viewer.userId
  if (!matches && !viewer.capabilities.includes("orders.read.all")) notFound()
  if (!matches && viewer.capabilities.includes("orders.read.all")) {
    // Admins may observe but not act as the buyer or seller.
    commerceError(
      "FORBIDDEN",
      role === "buyer"
        ? "Hanya pembeli yang dapat menyelesaikan langkah ini."
        : "Hanya penjual yang dapat menyelesaikan langkah ini.",
    )
  }
  if (!matches) notFound()
}

export const startOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.sell")
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    await assertOrderActor(ctx, viewer, order, "seller")
    if (order.status !== "paid") {
      commerceError("INVALID_STATE", "Pesanan harus lunas sebelum diproses.")
    }
    await ctx.db.patch(order._id, { status: "in_progress", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.start",
      entityType: "orders",
      entityId: order._id,
      reason: "Penjual mulai memproses pesanan.",
      before: { status: order.status },
      after: { status: "in_progress" },
    })
    return null
  },
})

export const deliverOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.sell")
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    await assertOrderActor(ctx, viewer, order, "seller")
    if (order.status !== "in_progress") {
      commerceError("INVALID_STATE", "Pesanan harus sedang diproses.")
    }
    const timestamp = now()
    await ctx.db.patch(order._id, {
      status: "delivered",
      deliveredAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.deliver",
      entityType: "orders",
      entityId: order._id,
      reason: "Penjual menandai pesanan terkirim.",
      before: { status: order.status },
      after: { status: "delivered" },
    })
    return null
  },
})

export const completeOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.buy")
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    await assertOrderActor(ctx, viewer, order, "buyer")
    if (order.status !== "delivered") {
      commerceError(
        "INVALID_STATE",
        "Pesanan hanya dapat diselesaikan setelah dikirim.",
      )
    }
    const timestamp = now()
    await ctx.db.patch(order._id, {
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.complete",
      entityType: "orders",
      entityId: order._id,
      reason: "Pembeli mengonfirmasi pesanan selesai.",
      before: { status: order.status },
      after: { status: "completed" },
    })
    return null
  },
})

export const cancelOrder = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  handler: async (ctx, args) => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    if (
      !hasOrderRelation(viewer, order) &&
      !viewer.capabilities.includes("orders.read.all")
    ) {
      notFound("Pesanan tidak ditemukan.")
    }
    if (!["draft", "awaiting_payment"].includes(order.status)) {
      commerceError(
        "INVALID_STATE",
        "Pesanan yang sudah dibayar diselesaikan melalui refund.",
      )
    }
    const reason = assertReason(args.reason, "Alasan pembatalan")
    const timestamp = now()
    await ctx.db.patch(order._id, {
      status: "cancelled",
      cancelledAt: timestamp,
      cancelReason: reason,
      updatedAt: timestamp,
    })

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    for (const payment of payments) {
      if (payment.status === "pending") {
        await ctx.db.patch(payment._id, { status: "cancelled", updatedAt: timestamp })
        await ctx.db.insert("paymentEvents", {
          eventId: `cancel_${payment._id}`,
          paymentId: payment._id,
          orderId: order._id,
          kind: "cancelled",
          amount: payment.uniqueAmount,
          payload: { reason },
          createdAt: timestamp,
        })
      }
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.cancel",
      entityType: "orders",
      entityId: order._id,
      reason,
      before: { status: order.status },
      after: { status: "cancelled" },
    })
    return null
  },
})

export const correctOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("in_progress"),
      v.literal("delivered"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("disputed"),
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.read.all")
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    const reason = assertReason(args.reason, "Alasan koreksi")

    // A manual correction can never mark an order paid: only a verified
    // payment settlement can do that.
    if (order.status === args.status) return null
    if (order.status === "cancelled" && args.status === "completed") {
      commerceError("INVALID_STATE", "Pesanan batal tidak dapat diselesaikan.")
    }

    const timestamp = now()
    const patch: Partial<Doc<"orders">> = {
      status: args.status,
      updatedAt: timestamp,
    }
    if (args.status === "delivered") patch.deliveredAt = timestamp
    if (args.status === "completed") patch.completedAt = timestamp
    if (args.status === "cancelled") {
      patch.cancelledAt = timestamp
      patch.cancelReason = reason
    }
    await ctx.db.patch(order._id, patch)
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.correct",
      entityType: "orders",
      entityId: order._id,
      reason,
      before: { status: order.status },
      after: { status: args.status },
      severity: "warning",
    })
    return null
  },
})

/* ---------------------------------------------------------------- dispute */

export const openOrderDispute = mutation({
  args: { orderId: v.id("orders"), reason: v.string() },
  handler: async (ctx, args) => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { user, viewer } = current
    const order = await ctx.db.get(args.orderId)
    if (!order) notFound("Pesanan tidak ditemukan.")
    if (!hasOrderRelation(viewer, order)) notFound("Pesanan tidak ditemukan.")
    if (!["paid", "in_progress", "delivered", "completed"].includes(order.status)) {
      commerceError("INVALID_STATE", "Pesanan ini belum dapat disengketakan.")
    }
    const reason = assertReason(args.reason, "Alasan sengketa")
    const timestamp = now()

    const disputeId = await ctx.db.insert("disputes", {
      subjectType: "order",
      subjectId: order._id,
      openedBy: user._id,
      status: "open",
      reason,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.patch(order._id, { status: "disputed", updatedAt: timestamp })

    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_orderId", (q) => q.eq("orderId", order._id))
      .collect()
    for (const payout of payouts) {
      if (payout.kind === "sale" && isOpenPayoutStatus(payout.status)) {
        await ctx.db.patch(payout._id, {
          status: "held",
          holdReason: "Sengketa pesanan terbuka.",
          updatedAt: timestamp,
        })
      }
    }

    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.order.dispute",
      entityType: "disputes",
      entityId: disputeId,
      reason,
      after: { orderId: order._id },
      severity: "warning",
    })
    return { disputeId }
  },
})

async function requireOrderDispute(
  ctx: MutationCtx,
  disputeId: Id<"disputes">,
): Promise<{ dispute: Doc<"disputes">; order: Doc<"orders"> }> {
  const dispute = await ctx.db.get(disputeId)
  if (!dispute || dispute.subjectType !== "order") notFound("Sengketa tidak ditemukan.")
  const order = await ctx.db.get(dispute.subjectId as Id<"orders">)
  if (!order) notFound("Pesanan tidak ditemukan.")
  return { dispute, order }
}

export const reviewOrderDispute = mutation({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const { user, viewer } = await requireViewer(ctx, "orders.read.all")
    const { dispute } = await requireOrderDispute(ctx, args.disputeId)
    if (dispute.status !== "open") {
      commerceError("INVALID_STATE", "Sengketa tidak berada pada status terbuka.")
    }
    await ctx.db.patch(dispute._id, {
      status: "reviewing",
      assignedTo: user._id,
      updatedAt: now(),
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.dispute.review",
      entityType: "disputes",
      entityId: dispute._id,
      reason: "Sengketa mulai ditinjau pengelola.",
    })
    return null
  },
})

export const resolveOrderDispute = mutation({
  args: {
    disputeId: v.id("disputes"),
    resolution: v.string(),
    orderStatus: v.union(v.literal("delivered"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.read.all")
    const { dispute, order } = await requireOrderDispute(ctx, args.disputeId)
    if (dispute.status !== "reviewing") {
      commerceError("INVALID_STATE", "Sengketa belum ditinjau.")
    }
    const resolution = assertReason(args.resolution, "Keputusan sengketa")
    const timestamp = now()
    await ctx.db.patch(dispute._id, {
      status: "resolved",
      resolution,
      resolvedAt: timestamp,
      updatedAt: timestamp,
    })
    await ctx.db.patch(order._id, {
      status: args.orderStatus,
      updatedAt: timestamp,
    })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.dispute.resolve",
      entityType: "disputes",
      entityId: dispute._id,
      reason: resolution,
      before: { status: dispute.status, orderStatus: order.status },
      after: { status: "resolved", orderStatus: args.orderStatus },
      severity: "warning",
    })
    return null
  },
})

export const closeOrderDispute = mutation({
  args: { disputeId: v.id("disputes") },
  handler: async (ctx, args) => {
    const { viewer } = await requireViewer(ctx, "orders.read.all")
    const { dispute } = await requireOrderDispute(ctx, args.disputeId)
    if (dispute.status !== "resolved") {
      commerceError("INVALID_STATE", "Hanya sengketa selesai dapat ditutup.")
    }
    await ctx.db.patch(dispute._id, { status: "closed", updatedAt: now() })
    await writeAudit(ctx, {
      actorId: viewer.userId,
      actorRole: viewer.roleLabel,
      action: "commerce.dispute.close",
      entityType: "disputes",
      entityId: dispute._id,
      reason: "Sengketa ditutup.",
    })
    return null
  },
})

export const listOrderDisputes = query({
  args: {},
  handler: async (ctx): Promise<DisputeView[]> => {
    const current = await currentViewer(ctx)
    if (!current) commerceError("UNAUTHENTICATED", "Masuk diperlukan.")
    const { viewer } = current
    const isAdmin = viewer.capabilities.includes("orders.read.all")

    const rows = (await ctx.db.query("disputes").collect()).filter(
      (row) => row.subjectType === "order",
    )
    const views: DisputeView[] = []
    for (const dispute of rows) {
      const order = await ctx.db.get(dispute.subjectId as Id<"orders">)
      if (!order) continue
      if (!isAdmin && !hasOrderRelation(viewer, order)) continue
      const opener = await findUser(ctx, dispute.openedBy)
      views.push({
        id: dispute._id,
        orderId: order._id,
        orderCode: order.code,
        openedBy: dispute.openedBy,
        openerName: opener?.name ?? "Pengguna",
        status: dispute.status,
        reason: dispute.reason,
        resolution: dispute.resolution ?? null,
        createdAt: dispute.createdAt,
        resolvedAt: dispute.resolvedAt ?? null,
      })
    }
    return views.sort((a, b) => b.createdAt - a.createdAt)
  },
})
