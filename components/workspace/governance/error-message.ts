/**
 * Convex errors carry a structured `data.message` for expected failures. When
 * the server throws a raw Error, the message still includes Convex wrappers
 * (`[CONVEX M(...)]`) and request IDs. Toasts should show the human sentence
 * only, never those internal markers.
 */
export function errorMessage(
  error: unknown,
  fallback = "Tindakan belum berhasil. Coba lagi.",
): string {
  if (typeof error === "object" && error !== null) {
    const data = (error as { data?: { message?: unknown } }).data
    if (data && typeof data.message === "string" && data.message.trim()) {
      return clean(data.message)
    }
    const message = (error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) {
      return clean(message)
    }
  }
  if (typeof error === "string" && error.trim()) return clean(error)
  return fallback
}

function clean(message: string): string {
  const lines = message
    .replace(/\[CONVEX[^\]]*\]/gi, "")
    .replace(/\[Request ID:[^\]]*\]/gi, "")
    .replace(/\[WARN[^\]]*\]/gi, "")
    .replace(/Uncaught (?:Error|ConvexError):/gi, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/^Called by client\.?\s*/i, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

  const joined = lines.join(" ").replace(/\s{2,}/g, " ").trim()
  return joined || "Tindakan belum berhasil. Coba lagi."
}
