import type { StatusTone } from "../workspace/types"
import type {
  DisputeView,
  OrderStatus,
  PaymentIntentView,
  PayoutStatus,
  RefundView,
  WorkStatus,
} from "./types"

/**
 * Closed commerce enums shared by the Convex validators, the workspace forms,
 * and the public surfaces. A form must never restate one of these lists.
 */

export const WORK_KINDS = ["product", "service"] as const
export type WorkKind = (typeof WORK_KINDS)[number]

export const WORK_CATEGORIES = ["batik", "layanan"] as const
export type WorkCategory = (typeof WORK_CATEGORIES)[number]

export const WORK_KIND_LABELS: Record<WorkKind, string> = {
  product: "Barang",
  service: "Layanan",
}

export const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  batik: "Batik",
  layanan: "Layanan",
}

export const WORK_ACCESS_LEVELS = ["public", "community", "restricted"] as const
export type WorkAccessLevel = (typeof WORK_ACCESS_LEVELS)[number]

export const WORK_ACCESS_LEVEL_LABELS: Record<WorkAccessLevel, string> = {
  public: "Publik",
  community: "Komunitas",
  restricted: "Terbatas",
}

export const WORK_STATUSES = [
  "draft",
  "review",
  "published",
  "paused",
  "sold_out",
] as const satisfies readonly WorkStatus[]

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  draft: "Draf",
  review: "Tinjauan",
  published: "Terbit",
  paused: "Dijeda",
  sold_out: "Habis",
}

export const WORK_STATUS_TONES: Record<WorkStatus, StatusTone> = {
  draft: "muted",
  review: "wait",
  published: "done",
  paused: "wait",
  sold_out: "muted",
}

export const ORDER_STATUSES = [
  "draft",
  "awaiting_payment",
  "paid",
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
] as const satisfies readonly OrderStatus[]

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
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

export const ORDER_CHANNELS = [
  "web",
  "whatsapp",
  "institution",
] as const

export type OrderChannel = (typeof ORDER_CHANNELS)[number]

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  institution: "Institusi",
}

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  draft: "muted",
  awaiting_payment: "wait",
  paid: "done",
  in_progress: "progress",
  delivered: "progress",
  completed: "done",
  cancelled: "muted",
  refunded: "muted",
  disputed: "danger",
}

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "expired",
  "failed",
  "cancelled",
  "refunded",
] as const satisfies readonly PaymentIntentView["status"][]

export const PAYMENT_STATUS_LABELS: Record<
  PaymentIntentView["status"],
  string
> = {
  pending: "Menunggu",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
}

export const PAYMENT_STATUS_TONES: Record<
  PaymentIntentView["status"],
  StatusTone
> = {
  pending: "wait",
  paid: "done",
  expired: "muted",
  failed: "danger",
  cancelled: "muted",
  refunded: "muted",
}

export const PAYOUT_STATUSES = [
  "pending",
  "held",
  "approved",
  "paid",
  "reversed",
] as const satisfies readonly PayoutStatus[]

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  pending: "Menunggu",
  held: "Ditahan",
  approved: "Disetujui",
  paid: "Dibayar",
  reversed: "Dibalik",
}

export const PAYOUT_STATUS_TONES: Record<PayoutStatus, StatusTone> = {
  pending: "wait",
  held: "danger",
  approved: "progress",
  paid: "done",
  reversed: "danger",
}

export const PAYOUT_KIND_LABELS: Record<"sale" | "reversal", string> = {
  sale: "Penjualan",
  reversal: "Pembalik",
}

export const PAYMENT_EVENT_LABELS: Record<
  | "created"
  | "settled"
  | "expired"
  | "failed"
  | "cancelled"
  | "refunded"
  | "reconciled",
  string
> = {
  created: "Dibuat",
  settled: "Settled",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  reconciled: "Direkonsiliasi",
}

export const LEDGER_ACCOUNT_LABELS: Record<
  "teacher" | "platform" | "community" | "gateway_fee" | "negative_balance",
  string
> = {
  teacher: "Pengajar",
  platform: "Platform",
  community: "Komunitas",
  gateway_fee: "Biaya gerbang",
  negative_balance: "Saldo negatif",
}

export const LEDGER_DIRECTION_LABELS: Record<"debit" | "credit", string> = {
  debit: "Debit",
  credit: "Kredit",
}

export const LEDGER_ENTRY_TYPE_LABELS: Record<
  "sale" | "payout" | "refund" | "reversal" | "adjustment",
  string
> = {
  sale: "Penjualan",
  payout: "Pencairan",
  refund: "Refund",
  reversal: "Pembalik",
  adjustment: "Penyesuaian",
}

export const GATEWAY_HEALTH_LABELS: Record<
  "healthy" | "degraded" | "down" | "unknown",
  string
> = {
  healthy: "Sehat",
  degraded: "Menurun",
  down: "Mati",
  unknown: "Belum diketahui",
}

export const REFUND_STATUSES = [
  "requested",
  "reviewing",
  "approved",
  "rejected",
  "paid",
] as const satisfies readonly RefundView["status"][]

export const REFUND_STATUS_LABELS: Record<RefundView["status"], string> = {
  requested: "Diminta",
  reviewing: "Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
}

export const REFUND_STATUS_TONES: Record<RefundView["status"], StatusTone> = {
  requested: "wait",
  reviewing: "wait",
  approved: "progress",
  rejected: "danger",
  paid: "done",
}

export const DISPUTE_STATUSES = [
  "open",
  "reviewing",
  "resolved",
  "closed",
] as const satisfies readonly DisputeView["status"][]

export const DISPUTE_STATUS_LABELS: Record<DisputeView["status"], string> = {
  open: "Terbuka",
  reviewing: "Ditinjau",
  resolved: "Selesai",
  closed: "Ditutup",
}

export const DISPUTE_STATUS_TONES: Record<DisputeView["status"], StatusTone> = {
  open: "wait",
  reviewing: "wait",
  resolved: "done",
  closed: "done",
}

/** Statuses an operator may set through the audited manual correction. */
export const ORDER_CORRECTION_STATUSES = [
  "in_progress",
  "delivered",
  "completed",
  "cancelled",
  "disputed",
] as const satisfies readonly OrderStatus[]

/** Statuses an operator may choose when closing a dispute. */
export const ORDER_DISPUTE_RESOLUTION_STATUSES = [
  "delivered",
  "completed",
] as const satisfies readonly OrderStatus[]

/** The single readiness checklist, shared by the Convex gate and the form. */
export const WORK_READINESS_LABELS = {
  image: "Foto karya",
  title: "Judul",
  price: "Harga lebih dari 0",
  unit: "Satuan",
  technique: "Teknik",
  maker: "Pembuat",
  teacher: "Pengajar",
  path: "Jalur",
  permission: "Izin sumber",
  provenance: "Provenans",
  materials: "Bahan",
} as const

export const WORK_STAGES = [
  { id: "draft", label: "Draf" },
  { id: "submitted", label: "Diajukan" },
  { id: "teacher_confirmed", label: "Konfirmasi pengajar" },
  { id: "admin_review", label: "Moderasi admin" },
  { id: "published", label: "Terbit" },
] as const

/** The seller onboarding checklist mirrors the Convex sellerProfiles object. */
export const SELLER_CHECKLIST_KEYS = [
  "payoutAccount",
  "consent",
  "firstWorkCard",
  "taxDetails",
] as const

export type SellerChecklistKey = (typeof SELLER_CHECKLIST_KEYS)[number]

export const SELLER_CHECKLIST_LABELS: Record<SellerChecklistKey, string> = {
  payoutAccount: "Rekening pencairan terverifikasi",
  consent: "Persetujuan bagi hasil dan ketentuan",
  firstWorkCard: "Kartu Karya pertama siap",
  taxDetails: "Data pajak lengkap",
}

export function emptySellerChecklist(): Record<SellerChecklistKey, boolean> {
  return Object.fromEntries(
    SELLER_CHECKLIST_KEYS.map((key) => [key, false]),
  ) as Record<SellerChecklistKey, boolean>
}
