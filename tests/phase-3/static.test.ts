import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = path.resolve(__dirname, "../..")

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

const LIVE_COMPONENTS = [
  "components/workspace/commerce/works-live.tsx",
  "components/workspace/commerce/orders-live.tsx",
  "components/workspace/commerce/payment-console-live.tsx",
  "components/workspace/commerce/payout-ledger-live.tsx",
]

const PREVIEW_COMPONENTS = [
  "components/workspace/commerce/works-board-preview.tsx",
  "components/workspace/commerce/orders-board-preview.tsx",
  "components/workspace/commerce/payment-console-preview.tsx",
  "components/workspace/commerce/payout-ledger-preview.tsx",
]

describe("live data boundary", () => {
  it("[P3-STAT-01] live commerce surfaces never import local mock data", () => {
    for (const file of LIVE_COMPONENTS) {
      const source = read(file)
      expect(source).not.toContain("lib/workspace/mock-data")
      expect(source).not.toContain("adminMetrics")
      expect(source).not.toContain("gatewayHealth,")
      expect(source).toContain("@/convex/_generated/api")
    }
  })

  it("[P3-STAT-02] preview mode remains the only place that renders local records", () => {
    for (const file of PREVIEW_COMPONENTS) {
      expect(read(file)).toContain("lib/workspace/mock-data")
    }
  })

  it("[P3-STAT-03] page wrappers choose live data outside preview mode", () => {
    const wrappers = [
      ["components/workspace/commerce/works-board.tsx", "WorksLive"],
      ["components/workspace/commerce/orders-board.tsx", "OrdersLive"],
      ["components/workspace/commerce/payment-console.tsx", "PaymentConsoleLive"],
      ["components/workspace/commerce/payout-ledger.tsx", "PayoutLedgerLive"],
    ] as const
    for (const [file, live] of wrappers) {
      const source = read(file)
      expect(source).toContain("isPreview")
      expect(source).toContain(live)
    }
  })
})

describe("ledger and money invariants", () => {
  it("[P3-PAY-63] no exported mutation updates or deletes a ledger row", () => {
    for (const file of ["convex/payments.ts", "convex/payouts.ts", "convex/commerce.ts"]) {
      const source = read(file)
      expect(source).not.toMatch(/patch\(\s*entry\._id/)
      expect(source).not.toMatch(/patch\(\s*ledger/)
      expect(source).not.toMatch(/delete\(\s*ledger/)
      expect(source).not.toMatch(/\.delete\(\s*entry/)
    }
  })

  it("[P3-PAY-11] no admin mutation accepts a share amount or percentage", () => {
    for (const file of ["convex/payments.ts", "convex/payouts.ts"]) {
      const source = read(file)
      expect(source).not.toMatch(/teacherShare:\s*v\./)
      expect(source).not.toMatch(/platformShare:\s*v\./)
      expect(source).not.toMatch(/communityShare:\s*v\./)
      expect(source).not.toMatch(/percentage:\s*v\./)
    }
  })

  it("[P3-PAY-12] one split function is shared by settlement and refunds", () => {
    expect(read("convex/payments.ts")).toContain("splitAmount")
    expect(read("convex/payouts.ts")).toContain("reverseSplit")
    expect(read("lib/commerce/money.ts")).toContain("export function splitAmount")
  })

  it("[P3-PAY-55] buyer status surfaces never import the gateway client", () => {
    for (const file of [
      "components/commerce/order-status.tsx",
      "app/(site)/pesanan/[token]/page.tsx",
    ]) {
      const source = read(file)
      expect(source).not.toContain("lib/commerce/gateway")
      expect(source).not.toContain("PAYMENTS_INTERNAL_KEY")
    }
    expect(read("app/api/payments/webhook/route.ts")).toContain("settlePayment")
  })

  it("[P3-RFD-09] the app exposes no typed provider refund call", () => {
    for (const file of LIVE_COMPONENTS) {
      expect(read(file)).not.toContain("refundCharge")
    }
    expect(read("lib/commerce/gateway.ts")).not.toContain("/refund")
    expect(read("app/api/payments/webhook/route.ts")).toContain(
      "verifyWebhookSignature",
    )
  })
})
