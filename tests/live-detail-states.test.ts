import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

async function source(relativePath: string): Promise<string> {
  return await readFile(path.join(process.cwd(), relativePath), "utf8")
}

/**
 * Regression guard for the "loading forever" class of bug: a Convex query
 * returns `undefined` while loading and `null` when the record is missing.
 * Live drawers must render a not-found state for `null` instead of reusing
 * the loading copy.
 */
describe("live detail drawers distinguish loading from not-found", () => {
  const cases = [
    {
      file: "components/workspace/governance/people-live.tsx",
      marker: "Akun tidak ditemukan",
    },
    {
      file: "components/workspace/governance/leads-live.tsx",
      marker: "Lead tidak ditemukan",
    },
    {
      file: "components/workspace/governance/log-live.tsx",
      marker: "Catatan tidak ditemukan",
    },
    {
      file: "components/workspace/governance/support-inbox-live.tsx",
      marker: "Tiket tidak ditemukan",
    },
    {
      file: "components/workspace/learning/live-learning-board.tsx",
      marker: "Kohort tidak ditemukan",
    },
    {
      file: "components/workspace/content/content-cms-live.tsx",
      marker: "tidak ditemukan",
    },
  ]

  for (const { file, marker } of cases) {
    it(`${file} renders a not-found state for a null query result`, async () => {
      const code = await source(file)
      expect(code, file).toContain("=== null")
      expect(code, file).toContain(marker)
    })
  }

  it("the enrollment drawer also handles a missing enrollment", async () => {
    const code = await source(
      "components/workspace/learning/live-learning-board.tsx",
    )
    expect(code).toContain("Pendaftaran tidak ditemukan")
  })
})

describe("stats refresh action", () => {
  it("does not fake an export timestamp when the operator refreshes", async () => {
    const code = await source(
      "components/workspace/governance/stats-live.tsx",
    )
    // Convex queries are reactive; a refresh button that only rewrites the
    // export timestamp makes the UI claim an export that never happened.
    expect(code).not.toContain("setGeneratedAt(Date.now())")
    expect(code).not.toContain("Segarkan")
  })
})
