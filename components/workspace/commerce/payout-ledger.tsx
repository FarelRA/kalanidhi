"use client"

import { PayoutLedgerLive } from "./payout-ledger-live"

/** Every session renders the Convex ledger only. */
export function PayoutLedger() {
  return <PayoutLedgerLive />
}
