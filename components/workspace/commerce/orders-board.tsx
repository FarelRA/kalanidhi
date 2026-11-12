"use client"

import { useViewer } from "@/components/workspace/shell/viewer-provider"

import { OrdersLive } from "./orders-live"
import { OrdersPreview } from "./orders-board-preview"

/** Preview mode keeps local records; live sessions use Convex only. */
export function OrdersBoard() {
  const { isPreview } = useViewer()
  return isPreview ? <OrdersPreview /> : <OrdersLive />
}
