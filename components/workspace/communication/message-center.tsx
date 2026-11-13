"use client"

import { MessageCenterLive } from "./message-center-live"

/** One route, one shell. Every session renders Convex conversations. */
export function MessageCenter() {
  return <MessageCenterLive />
}
