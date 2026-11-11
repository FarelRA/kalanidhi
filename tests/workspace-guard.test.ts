import { describe, expect, it } from "vitest"

import {
  isPreviewAllowed,
  resolveWorkspaceGuard,
  safeNextPath,
} from "@/lib/access/guard"

describe("workspace guard", () => {
  it("redirects an unauthenticated request to /masuk with the original path", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: true,
        previewAllowed: false,
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
        previewAllowed: false,
        authenticated: true,
        viewerResolved: true,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "live" })
  })

  it("uses the preview shell only when Convex is absent and preview is allowed", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: false,
        previewAllowed: true,
        authenticated: false,
        viewerResolved: false,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "preview" })
  })

  it("never falls back to preview in production", () => {
    expect(isPreviewAllowed("production", undefined)).toBe(false)
    expect(isPreviewAllowed("production", "0")).toBe(false)
    expect(
      resolveWorkspaceGuard({
        convexConfigured: false,
        previewAllowed: isPreviewAllowed("production", undefined),
        authenticated: false,
        viewerResolved: false,
        nextPath: "/ruang",
      }),
    ).toEqual({ kind: "unavailable", reason: "convex" })
  })

  it("allows an explicit production preview flag for staged verification only", () => {
    expect(isPreviewAllowed("production", "1")).toBe(true)
    expect(isPreviewAllowed("development", undefined)).toBe(true)
    expect(isPreviewAllowed("test", undefined)).toBe(true)
  })

  it("reports a forbidden profile when the session has no application account", () => {
    expect(
      resolveWorkspaceGuard({
        convexConfigured: true,
        previewAllowed: false,
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
