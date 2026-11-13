export type WorkspaceGuardInput = {
  convexConfigured: boolean
  authenticated: boolean
  viewerResolved: boolean
  nextPath: string
}

export type WorkspaceGuardResult =
  | { kind: "live" }
  | { kind: "redirect"; to: string }
  | { kind: "unavailable"; reason: "convex" }
  | { kind: "forbidden"; reason: "profile" }

/**
 * Pure workspace guard decision, testable without Next.js request context.
 * The workspace renders only real Convex data, never a local fallback shell.
 */
export function resolveWorkspaceGuard(
  input: WorkspaceGuardInput,
): WorkspaceGuardResult {
  if (!input.convexConfigured) {
    return { kind: "unavailable", reason: "convex" }
  }

  if (!input.authenticated) {
    const next = input.nextPath.startsWith("/") ? input.nextPath : "/ruang"
    return {
      kind: "redirect",
      to: `/masuk?next=${encodeURIComponent(next)}`,
    }
  }

  if (!input.viewerResolved) {
    return { kind: "forbidden", reason: "profile" }
  }

  return { kind: "live" }
}

/** Prevents an open redirect through the `next` query parameter. */
export function safeNextPath(value: string | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return "/ruang"
  }

  try {
    const base = "https://kalanidhi.site"
    const url = new URL(value, base)
    if (url.origin !== base) return "/ruang"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/ruang"
  }
}
