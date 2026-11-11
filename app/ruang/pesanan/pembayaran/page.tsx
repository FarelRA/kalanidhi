import type { Metadata } from "next"

import { PaymentConsole } from "@/components/workspace/commerce/payment-console"

export const metadata: Metadata = {
  title: "Pembayaran",
}

export default function Page() {
  return <PaymentConsole />
}
