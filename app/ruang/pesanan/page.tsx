import type { Metadata } from "next"

import { OrdersBoard } from "@/components/workspace/commerce/orders-board"

export const metadata: Metadata = {
  title: "Pesanan",
}

export default function Page() {
  return <OrdersBoard />
}
