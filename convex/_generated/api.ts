import { anyApi, componentsGeneric, type FunctionReference } from "convex/server"

import type { createClient } from "@convex-dev/better-auth"
import type { WorkspaceRole } from "../../lib/access/capabilities"
import type { Viewer } from "../../lib/access/viewer"
import type { SiteData } from "../../lib/content/types"
import type { LeadArgs } from "../../lib/convex/types"
import type { Id } from "./dataModel"


export type SeedResult = {
  seeded: true
  fields: number
  paths: number
  teachers: number
  works: number
  testimonials: number
  faqs: number
}

export type PublicApiType = {
  content: {
    getSite: FunctionReference<"query", "public", Record<string, never>, SiteData | null>
  }
  leads: {
    create: FunctionReference<"mutation", "public", LeadArgs, Id<"leads">>
  }
  access: {
    getViewer: FunctionReference<"query", "public", Record<string, never>, Viewer | null>
  }
  users: {
    current: FunctionReference<"query", "public", Record<string, never>, Viewer | null>
    invite: FunctionReference<
      "mutation",
      "public",
      {
        email: string
        name?: string
        roles: WorkspaceRole[]
        reason: string
        ttlDays?: number
      },
      { inviteId: Id<"invites">; token: string; expiresAt: number }
    >
    acceptInvite: FunctionReference<
      "mutation",
      "public",
      { token?: string },
      Viewer
    >
    setRoles: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; roles: WorkspaceRole[]; reason: string },
      null
    >
    suspend: FunctionReference<
      "mutation",
      "public",
      { userId: Id<"users">; reason: string },
      { revokedSessions: number }
    >
    bootstrapAdmin: FunctionReference<
      "mutation",
      "internal",
      { authUserId: string; email: string; name: string; region?: string },
      Id<"users">
    >
  }
  seed: {
    run: FunctionReference<"mutation", "internal", Record<string, never>, SeedResult>
    runIfEmpty: FunctionReference<
      "mutation",
      "internal",
      Record<string, never>,
      SeedResult | { seeded: false }
    >
  }
  commerce: {
    getPublicWork: FunctionReference<
      "query",
      "public",
      { slug: string },
      PublicWorkView | null
    >
    listPublicWorks: FunctionReference<
      "query",
      "public",
      { limit?: number },
      PublicWorkView[]
    >
    listWorks: FunctionReference<"query", "public", Record<string, never>, WorkListingView[]>
    getWorkDetail: FunctionReference<
      "query",
      "public",
      { workId: Id<"works"> },
      WorkListingView
    >
    createWork: FunctionReference<
      "mutation",
      "public",
      {
        title: string
        pathId: string
        certificateId?: Id<"certificates">
        price: number
        unit: string
        technique: string
        techniqueNote?: string
        description: string
        image?: string
        kind: "product" | "service"
        category: "batik" | "layanan"
        permission?: string
        provenance?: string
        materials?: string
      },
      {
        workId: Id<"works">
        workCardId: Id<"workCards">
        slug: string
        serial: string
      }
    >
    updateWork: FunctionReference<
      "mutation",
      "public",
      {
        workId: Id<"works">
        title?: string
        price?: number
        unit?: string
        technique?: string
        techniqueNote?: string
        description?: string
        image?: string
        permission?: string
        provenance?: string
        materials?: string
      },
      null
    >
    submitWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    confirmWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    beginWorkReview: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    publishWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason: string },
      null
    >
    pauseWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason?: string },
      null
    >
    resumeWork: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works">; reason: string },
      null
    >
    markWorkSoldOut: FunctionReference<
      "mutation",
      "public",
      { workId: Id<"works"> },
      null
    >
    bulkPauseWorks: FunctionReference<
      "mutation",
      "public",
      { pathId?: string; makerId?: Id<"users">; reason: string },
      { affected: number }
    >
    createGuestOrder: FunctionReference<
      "mutation",
      "public",
      {
        workSlug: string
        buyerName: string
        buyerEmail: string
        buyerWhatsapp?: string
        note?: string
        idempotencyKey?: string
        consentTransactional: boolean
        consentVersion?: string
      },
      {
        orderId: Id<"orders">
        code: string
        token: string
        baseAmount: number
      }
    >
    getOrderByToken: FunctionReference<
      "query",
      "public",
      { token: string },
      GuestOrderView | null
    >
    claimOrder: FunctionReference<
      "mutation",
      "public",
      { token: string },
      { claimed: boolean; orderId: Id<"orders"> }
    >
    getOrder: FunctionReference<"query", "public", { orderId: Id<"orders"> }, OrderView>
    listOrders: FunctionReference<"query", "public", Record<string, never>, OrderView[]>
    startOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    deliverOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    completeOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders"> },
      null
    >
    cancelOrder: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; reason: string },
      null
    >
    correctOrderStatus: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        status:
          | "in_progress"
          | "delivered"
          | "completed"
          | "cancelled"
          | "disputed"
        reason: string
      },
      null
    >
    openOrderDispute: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; reason: string },
      { disputeId: Id<"disputes"> }
    >
    reviewOrderDispute: FunctionReference<
      "mutation",
      "public",
      { disputeId: Id<"disputes"> },
      null
    >
    resolveOrderDispute: FunctionReference<
      "mutation",
      "public",
      {
        disputeId: Id<"disputes">
        resolution: string
        orderStatus: "delivered" | "completed"
      },
      null
    >
    closeOrderDispute: FunctionReference<
      "mutation",
      "public",
      { disputeId: Id<"disputes"> },
      null
    >
    listOrderDisputes: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      DisputeView[]
    >
  }
  payments: {
    createIntent: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; token?: string },
      PaymentIntentView
    >
    attachCharge: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        token?: string
        chargeId: string
        baseAmount: number
        uniqueAmount: number
        qrString?: string
        qrImageUrl?: string
        expiresAt: number
        providerReference?: string
      },
      PaymentIntentView
    >
    markManualFallback: FunctionReference<
      "mutation",
      "public",
      { orderId: Id<"orders">; token?: string; reason: string },
      PaymentIntentView
    >
    getIntentForOrder: FunctionReference<
      "query",
      "public",
      { orderId: Id<"orders"> },
      PaymentIntentView | null
    >
    getIntentByToken: FunctionReference<
      "query",
      "public",
      { token: string },
      PaymentIntentView | null
    >
    listIntents: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PaymentIntentView[]
    >
    getReconciliation: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      ReconciliationSummary
    >
    listPaymentEvents: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PaymentEventView[]
    >
    getGatewayHealth: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      GatewayHealthView
    >
    recordHealth: FunctionReference<
      "mutation",
      "public",
      {
        internalKey: string
        status: "healthy" | "degraded" | "down" | "unknown"
        message?: string
        latencyMs?: number
      },
      null
    >
    settleFromWebhook: FunctionReference<
      "mutation",
      "public",
      {
        internalKey: string
        eventId: string
        chargeId: string
        orderCode: string
        providerTransactionId: string
        amount: number
        paidAt: number
        gatewayFee?: number
      },
      SettlementResult
    >
    manualMatch: FunctionReference<
      "mutation",
      "public",
      {
        paymentId: Id<"payments">
        providerTransactionId: string
        amount: number
        paidAt?: number
        reason: string
      },
      SettlementResult
    >
    expireIntents: FunctionReference<
      "mutation",
      "public",
      Record<string, never>,
      { expired: number }
    >
  }
  payouts: {
    listPayouts: FunctionReference<"query", "public", Record<string, never>, PayoutView[]>
    getPayout: FunctionReference<
      "query",
      "public",
      { payoutId: Id<"payouts"> },
      PayoutView
    >
    listLedger: FunctionReference<
      "query",
      "public",
      { teacherId?: Id<"users">; from?: number; to?: number },
      LedgerEntryView[]
    >
    getSellerStatement: FunctionReference<
      "query",
      "public",
      { teacherId?: Id<"users">; from?: number; to?: number },
      SellerStatement
    >
    holdPayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts">; reason: string },
      null
    >
    approvePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts"> },
      null
    >
    releasePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts"> },
      { paidAmount: number; carryApplied: number }
    >
    reversePayout: FunctionReference<
      "mutation",
      "public",
      { payoutId: Id<"payouts">; reason: string },
      { reversalId: Id<"payouts"> }
    >
    requestPayoutAccount: FunctionReference<
      "mutation",
      "public",
      {
        provider: "bank" | "gopay" | "other"
        bankCode: string
        accountName: string
        accountNumberMasked: string
        accountRef: string
      },
      { accountId: Id<"payoutAccounts"> }
    >
    verifyPayoutAccount: FunctionReference<
      "mutation",
      "public",
      { accountId: Id<"payoutAccounts">; reason: string },
      null
    >
    requestRefund: FunctionReference<
      "mutation",
      "public",
      {
        orderId: Id<"orders">
        amount?: number
        reason: string
        evidence?: string
      },
      { refundId: Id<"refunds"> }
    >
    reviewRefund: FunctionReference<
      "mutation",
      "public",
      {
        refundId: Id<"refunds">
        decision: "reviewing" | "approved" | "rejected"
        reason: string
      },
      null
    >
    payRefund: FunctionReference<
      "mutation",
      "public",
      { refundId: Id<"refunds">; reason: string },
      { paid: number; negativeCarry: number }
    >
    listRefunds: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      RefundView[]
    >
    listDuePayouts: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      PayoutView[]
    >
  }
}

export const api: PublicApiType = anyApi as unknown as PublicApiType
export const internal = api

/**
 * Component references are normally generated by `convex codegen`. The
 * checked-in registry keeps the repository buildable without a deployment;
 * `npx convex codegen` replaces this with the exact generated shape.
 */
export const components = componentsGeneric() as unknown as {
  betterAuth: Parameters<typeof createClient>[0]
}

/* -------------------------------------------------------------------------
 * Phase 3 commerce modules. Hand-maintained until `npx convex codegen` runs.
 * Appended only; existing module references above are unchanged.
 * ---------------------------------------------------------------------- */

import type {
  DisputeView,
  GatewayHealthView,
  GuestOrderView,
  LedgerEntryView,
  OrderView,
  PaymentEventView,
  PaymentIntentView,
  PayoutView,
  PublicWorkView,
  ReconciliationSummary,
  RefundView,
  SellerStatement,
  SettlementResult,
  WorkListingView,
} from "../../lib/commerce/types"
