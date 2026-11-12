/**
 * Serializable commerce contracts shared by Convex functions, server routes,
 * and the workspace UI. These are deliberately plain objects: no Convex
 * documents cross the client boundary.
 */

export type MoneySplit = {
  baseAmount: number
  teacherShare: number
  platformShare: number
  communityShare: number
}

export type WorkStatus =
  | "draft"
  | "review"
  | "published"
  | "paused"
  | "sold_out"

export type WorkCardStatus =
  | "draft"
  | "submitted"
  | "teacher_confirmed"
  | "admin_review"
  | "published"
  | "paused"
  | "sold_out"

export type WorkReadiness = {
  ready: boolean
  missing: string[]
}

export type WorkListingView = {
  id: string
  slug: string
  title: string
  kind: "product" | "service"
  category: "batik" | "layanan"
  maker: string
  makerId: string | null
  makerRole: string
  teacher: string
  region: string
  price: number
  priceLabel: string | null
  unit: string
  technique: string
  techniqueNote: string
  workCard: string
  description: string
  image: string
  imageAssetId: string | null
  pathId: string | null
  certificateId: string | null
  certificateCode: string | null
  permission: string | null
  provenance: string | null
  materials: string | null
  accessLevel: "public" | "community" | "restricted" | null
  status: WorkStatus | null
  cardStatus: WorkCardStatus | null
  createdAt: number
  split: MoneySplit | null
  readiness: WorkReadiness
  canReview: boolean
  canModerate: boolean
  canEdit: boolean
  isOwner: boolean
}

export type PublicWorkView = {
  id: string
  slug: string
  title: string
  kind: "product" | "service"
  category: "batik" | "layanan"
  maker: string
  makerRole: string
  teacher: string
  region: string
  price: number
  priceLabel: string | null
  unit: string
  technique: string
  techniqueNote: string
  workCard: string
  description: string
  image: string
  permission: string | null
  split: MoneySplit
  /** False for curated seed works without a linked seller account. */
  purchasable: boolean
}

export type OrderStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "in_progress"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed"

export type OrderTimelineEntry = {
  status: OrderStatus
  label: string
  at: number | null
}

export type OrderItemView = {
  id: string
  kind: "work" | "path" | "service"
  refId: string | null
  pathId: string | null
  title: string
  quantity: number
  unitAmount: number
  totalAmount: number
}

export type OrderView = {
  id: string
  code: string
  buyerUserId: string | null
  buyerName: string
  buyerEmail: string
  buyerWhatsapp?: string
  sellerId: string
  sellerName: string
  workId: string | null
  workTitle: string
  workSlug: string | null
  pathId: string | null
  baseAmount: number
  uniqueAmount: number | null
  status: OrderStatus
  channel: "web" | "whatsapp" | "institution"
  note?: string
  createdAt: number
  updatedAt: number
  paidAt: number | null
  deliveredAt: number | null
  completedAt: number | null
  cancelledAt: number | null
  cancelReason: string | null
  consentVersion: string | null
  consentAt: number | null
  claimedAt: number | null
  paymentId: string | null
  paymentStatus: string | null
  payoutId: string | null
  refundId: string | null
  disputeId: string | null
  split: MoneySplit
  items: OrderItemView[]
}

export type OrderStatusView = {
  code: string
  status: OrderStatus
  buyerName: string
  buyerEmailMasked: string
  workTitle: string
  sellerName: string
  baseAmount: number
  uniqueAmount: number | null
  createdAt: number
  paidAt: number | null
  timeline: OrderTimelineEntry[]
}

export type CreateOrderResult = {
  orderId: string
  code: string
  token: string
  baseAmount: number
}

export type PaymentIntentView = {
  id: string
  orderId: string
  orderCode: string
  buyerName: string
  sellerName: string
  workTitle: string
  provider: "gopay_qris" | "manual_transfer" | "other"
  providerChargeId: string
  providerReference: string | null
  providerTransactionId: string | null
  baseAmount: number
  uniqueAmount: number
  gatewayFee: number | null
  qrString: string | null
  qrImageUrl: string | null
  status: "pending" | "paid" | "expired" | "failed" | "cancelled" | "refunded"
  reconciliationState: "none" | "late" | "unmatched" | "duplicate"
  reconciliationReason: string | null
  expiresAt: number
  paidAt: number | null
  createdAt: number
  lastReconciledAt: number | null
  settledEventId: string | null
  idempotencyKey: string | null
  isLate: boolean
}

export type PaymentEventView = {
  id: string
  eventId: string
  kind:
    | "created"
    | "settled"
    | "expired"
    | "failed"
    | "cancelled"
    | "refunded"
    | "reconciled"
  orderCode: string | null
  amount: number | null
  providerReference: string | null
  createdAt: number
}

export type ReconciliationSummary = {
  intents: PaymentIntentView[]
  pendingCount: number
  lateCount: number
  unmatchedCount: number
  paidCount: number
  expiredCount: number
  paidTotal: number
  baseTotal: number
}

export type GatewayHealthView = {
  integration: "payment_gateway"
  status: "healthy" | "degraded" | "down" | "unknown"
  message: string | null
  latencyMs: number | null
  checkedAt: number | null
  pendingIntents: number
  lastSettledAt: number | null
}

export type PayoutStatus =
  | "pending"
  | "held"
  | "approved"
  | "paid"
  | "reversed"

export type PayoutView = {
  id: string
  teacherId: string
  teacherName: string
  orderId: string | null
  orderCode: string | null
  workTitle: string | null
  reference: string | null
  periodStart: number
  periodEnd: number
  dueAt: number | null
  gross: number
  teacherShare: number
  platformShare: number
  communityShare: number
  paidAmount: number | null
  status: PayoutStatus
  kind: "sale" | "reversal"
  reversalOf: string | null
  holdReason: string | null
  reason: string | null
  approvedBy: string | null
  paidAt: number | null
  createdAt: number
}

export type LedgerEntryView = {
  id: string
  orderId: string | null
  orderCode: string | null
  payoutId: string | null
  refundId: string | null
  teacherId: string | null
  account: "teacher" | "platform" | "community" | "gateway_fee" | "negative_balance"
  direction: "debit" | "credit"
  amount: number
  entryType: "sale" | "payout" | "refund" | "reversal" | "adjustment"
  reversalOf: string | null
  reason: string
  createdAt: number
}

export type SellerStatement = {
  teacherId: string
  teacherName: string
  from: number | null
  to: number | null
  grossSales: number
  teacherEarned: number
  teacherPaid: number
  teacherReversed: number
  teacherNegativeBalance: number
  teacherBalance: number
  platformShare: number
  communityShare: number
  gatewayFees: number
  payoutCount: number
  entries: LedgerEntryView[]
  payouts: PayoutView[]
}

export type RefundView = {
  id: string
  orderId: string
  orderCode: string
  buyerName: string
  sellerName: string
  workTitle: string
  amount: number
  baseAmount: number
  reason: string
  evidence: string | null
  status: "requested" | "reviewing" | "approved" | "rejected" | "paid"
  requestedBy: string | null
  decidedBy: string | null
  decisionReason: string | null
  payoutReleased: boolean
  createdAt: number
  reviewedAt: number | null
  paidAt: number | null
}

export type DisputeView = {
  id: string
  orderId: string
  orderCode: string
  openedBy: string
  openerName: string
  assignedTo: string | null
  assigneeName: string | null
  status: "open" | "reviewing" | "resolved" | "closed"
  reason: string
  resolution: string | null
  createdAt: number
  resolvedAt: number | null
}

export type SettlementResult = {
  status: "settled" | "duplicate" | "late" | "rejected"
  orderId: string
  paymentId: string
  reason?: string
}
