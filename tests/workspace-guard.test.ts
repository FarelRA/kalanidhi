import { describe, expect, it } from "vitest"

import { resolveWorkspaceGuard, safeNextPath } from "@/lib/access/guard"

describe("workspace guard", () => {
  it("redirects an unauthenticated request to /masuk with the original path", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: true,
        authenticated: false,
        viewerResolved: false,
        nextPath: "/ruang/tugas",
      }),
    ).toEqual({
      kind: "redirect",
      to: "/masuk?next=%2Fruang%2Ftugas",
    })
  })

  it("accepts a resolved viewer", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: true,
        authenticated: true,
        viewerResolved: true,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "live" })
  })

  it("shows the unavailable notice when Convex is absent", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: false,
        authenticated: false,
        viewerResolved: false,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "unavailable", reason: "convex" })
  })

  it("reports a forbidden profile when the session has no application account", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: true,
        authenticated: true,
        viewerResolved: false,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "forbidden", reason: "profile" })
  })

  it("does not allow an open redirect through the next parameter", () => {
    expect(safeNextPath("/ruang/tugas")).toBe("/ruang/tugas")
    expect(safeNextPath("//evil.example")).toBe("/ruang")
    expect(safeNextPath("https://evil.example")).toBe("/ruang")
    expect(safeNextPath(undefined)).toBe("/ruang")
  })
})
