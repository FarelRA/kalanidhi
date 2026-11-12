"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { PayoutLedgerLive } from "./payout-ledger-live"
import { PayoutLedgerPreview } from "./payout-ledger-preview"

/** Preview mode keeps local records; live sessions use Convex only. */
export function PayoutLedger() {
  const { isPreview } = useViewer()
  return isPreview ? <PayoutLedgerPreview /> : <PayoutLedgerLive />
}
