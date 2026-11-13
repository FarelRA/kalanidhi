"use client"

import { OrdersLive } from "./orders-live"

/** Every session renders Convex orders only. */
export function OrdersBoard() {
  return <OrdersLive />
}
