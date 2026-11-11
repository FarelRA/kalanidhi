export type WorkspaceGuardInput = {
  convexConfigured: boolean
  previewAllowed: boolean
  authenticated: boolean
  viewerResolved: boolean
  nextPath: string
}

export type WorkspaceGuardResult =
  | { kind: "preview" }
  | { kind: "live" }
  | { kind: "redirect"; to: string }
  | { kind: "unavailable"; reason: "convex" }
  | { kind: "forbidden"; reason: "profile" }

/**
 * Pure workspace guard decision, testable without Next.js request context.
 * Production never falls back to the preview shell.
 */
export function resolveWorkspaceGuard(
  input: WorkspaceGuardInput,
): WorkspaceGuardResult {
  if (!input.convexConfigured) {
    return input.previewAllowed
      ? { kind: "preview" }
      : { kind: "unavailable", reason: "convex" }
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

export function isPreviewAllowed(
  nodeEnv: string | undefined,
  explicitFlag: string | undefined,
): boolean {
  return nodeEnv !== "production" || explicitFlag === "1"
}

/** Prevents an open redirect through the `next` query parameter. */
export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/ruang"
  }
  return value
}
