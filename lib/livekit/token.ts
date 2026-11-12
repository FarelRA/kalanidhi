import { AccessToken } from "livekit-server-sdk"

import { CALL_TOKEN_TTL_SECONDS } from "@/lib/calls/policy"

export type RoomTokenInput = {
  apiKey: string
  apiSecret: string
  roomName: string
  identity: string
  name: string
  metadata?: Record<string, unknown>
  ttlSeconds?: number
}

/**
 * Builds a short-lived room-scoped token with publish, subscribe, and data
 * grants. The API secret is only used as an HMAC key and is never serialised.
 */
export async function createRoomToken(input: RoomTokenInput): Promise<string> {
  const ttl = Math.min(
    Math.max(Math.trunc(input.ttlSeconds ?? CALL_TOKEN_TTL_SECONDS), 30),
    900,
  )
  const at = new AccessToken(input.apiKey, input.apiSecret, {
    identity: input.identity,
    name: input.name,
    ttl,
    metadata: JSON.stringify(input.metadata ?? {}),
  })
  at.addGrant({
    roomJoin: true,
    room: input.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  })
  return await at.toJwt()
}
