/**
 * LiveKit server configuration. Server-only: the API secret must never reach a
 * client bundle, a log line, or an error response.
 */
export type LiveKitConfig = {
  url: string
  apiKey: string
  apiSecret: string
  clientUrl: string
}

export type LiveKitConfigResult =
  | { ok: true; config: LiveKitConfig }
  | { ok: false; missing: string[] }

export const LIVEKIT_ENV_KEYS = [
  "LIVEKIT_URL",
  "LIVEKIT_API_KEY",
  "LIVEKIT_API_SECRET",
  "NEXT_PUBLIC_LIVEKIT_URL",
] as const

export function readLiveKitConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): LiveKitConfigResult {
  const missing = LIVEKIT_ENV_KEYS.filter((key) => !env[key]?.trim())
  if (missing.length > 0) return { ok: false, missing: [...missing] }

  return {
    ok: true,
    config: {
      url: env.LIVEKIT_URL!.trim(),
      apiKey: env.LIVEKIT_API_KEY!.trim(),
      apiSecret: env.LIVEKIT_API_SECRET!.trim(),
      clientUrl: env.NEXT_PUBLIC_LIVEKIT_URL!.trim(),
    },
  }
}
