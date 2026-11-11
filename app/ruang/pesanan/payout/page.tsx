import type { Metadata } from "next"

import { PayoutLedger } from "@/components/workspace/commerce/payout-ledger"

export const metadata: Metadata = {
  title: "Payout & pendapatan",
}

export default function Page() {
  return <PayoutLedger />
}
