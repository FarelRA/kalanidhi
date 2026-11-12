/**
 * Pure messaging policy. The Convex mutations and the client recorder/input
 * both use these rules so a limit is never enforced in only one place.
 */

export const MAX_TEXT_LENGTH = 4_000
export const MAX_VOICE_BYTES = 25 * 1024 * 1024
export const MAX_VOICE_DURATION_MS = 10 * 60 * 1000
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_WAVEFORM_PEAKS = 128
export const DEFAULT_RETENTION_DAYS = 730
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 20
export const DEFAULT_UPLOAD_LIMIT_PER_MINUTE = 10
export const DEFAULT_GRANT_MINUTES = 15
export const MAX_GRANT_MINUTES = 60
export const MIN_REASON_LENGTH = 8

export const VOICE_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
] as const

export const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const

export const FILE_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const

const EXTENSIONS: Record<string, string[]> = {
  "audio/webm": [".webm", ".weba"],
  "audio/ogg": [".ogg", ".oga", ".opus"],
  "audio/mp4": [".m4a", ".mp4"],
  "audio/mpeg": [".mp3", ".mpeg"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt", ".text"],
  "application/zip": [".zip"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
}

/** Strips parameters such as `;codecs=opus` before an allowlist check. */
export function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0]?.trim().toLowerCase() ?? ""
}

export function extensionForMime(mimeType: string): string {
  switch (baseMimeType(mimeType)) {
    case "audio/ogg":
      return ".ogg"
    case "audio/mp4":
      return ".m4a"
    case "audio/mpeg":
      return ".mp3"
    default:
      return ".webm"
  }
}

export function hasExternalLink(text: string): boolean {
  return /(?:https?:\/\/|www\.)[^\s]+/i.test(text)
}

export function countExternalLinks(text: string): number {
  return text.match(/(?:https?:\/\/|www\.)[^\s]+/gi)?.length ?? 0
}

/**
 * Repeated near-identical messages or a burst of links is treated as spam.
 * The caller passes the recent bodies plus the candidate as the last item.
 */
export function looksLikeSpam(recentBodies: string[]): boolean {
  if (recentBodies.length === 0) return false
  const candidate = recentBodies[recentBodies.length - 1]?.trim().toLowerCase()
  if (!candidate) return false
  const duplicates = recentBodies.filter(
    (body) => body.trim().toLowerCase() === candidate,
  ).length
  return duplicates >= 5 || countExternalLinks(candidate) >= 4
}

export type AttachmentInput = {
  filename: string
  mimeType: string
  size: number
  durationMs?: number
  waveform?: number[]
  width?: number
  height?: number
  transcript?: string
}

function extensionOf(filename: string): string {
  const index = filename.lastIndexOf(".")
  return index >= 0 ? filename.slice(index).toLowerCase() : ""
}

function hasValidExtension(filename: string, mimeType: string): boolean {
  const allowed = EXTENSIONS[mimeType]
  if (!allowed) return false
  return allowed.includes(extensionOf(filename))
}

/**
 * Returns a human-readable problem, or null when the attachment is allowed.
 * `kind` is the message kind, not the storage kind, so a voice note cannot be
 * smuggled in as a generic file.
 */
export function attachmentProblem(
  kind: "voice" | "image" | "file",
  input: AttachmentInput,
): string | null {
  const mimeType = baseMimeType(input.mimeType)

  if (!Number.isFinite(input.size) || input.size <= 0) {
    return "Ukuran berkas tidak sah."
  }
  if (!hasValidExtension(input.filename, mimeType)) {
    return "Jenis berkas dan ekstensi tidak cocok."
  }

  if (kind === "voice") {
    if (!(VOICE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return "Catatan suara harus Opus, WebM, Ogg, M4A, atau MP3."
    }
    if (input.size > MAX_VOICE_BYTES) {
      return "Catatan suara maksimal 25 MB."
    }
    if (
      typeof input.durationMs !== "number" ||
      !Number.isFinite(input.durationMs) ||
      input.durationMs <= 0 ||
      input.durationMs > MAX_VOICE_DURATION_MS
    ) {
      return "Catatan suara maksimal 10 menit."
    }
    if (
      input.waveform &&
      (input.waveform.length > MAX_WAVEFORM_PEAKS ||
        input.waveform.some(
          (peak) => !Number.isFinite(peak) || peak < 0 || peak > 1,
        ))
    ) {
      return "Bentuk gelombang tidak sah."
    }
    if (input.transcript && input.transcript.length > 8_000) {
      return "Transkrip terlalu panjang."
    }
    return null
  }

  if (kind === "image") {
    if (!(IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)) {
      return "Gambar harus PNG, JPEG, WebP, atau GIF."
    }
    if (input.size > MAX_IMAGE_BYTES) {
      return "Gambar maksimal 10 MB."
    }
    return null
  }

  if (!(FILE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    return "Jenis berkas ini tidak diizinkan."
  }
  if (input.size > MAX_FILE_BYTES) {
    return "Berkas maksimal 25 MB."
  }
  return null
}

/** Chat retention is a read-time boundary; expired rows stay for audit. */
export function retentionCutoff(now: number, days?: number): number {
  const effective = days && days > 0 ? days : DEFAULT_RETENTION_DAYS
  return now - effective * 86_400_000
}

export function normalizeReason(reason: string | undefined): string {
  return reason?.trim() ?? ""
}

export function reasonProblem(reason: string | undefined): string | null {
  if (normalizeReason(reason).length < MIN_REASON_LENGTH) {
    return `Alasan minimal ${MIN_REASON_LENGTH} karakter.`
  }
  return null
}
