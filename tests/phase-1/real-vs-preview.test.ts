import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const LIVE_COMPONENTS = [
  "components/workspace/overview/overview-live.tsx",
  "components/workspace/content/content-cms-live.tsx",
  "components/workspace/governance/people-live.tsx",
  "components/workspace/governance/leads-live.tsx",
  "components/workspace/governance/stats-live.tsx",
  "components/workspace/governance/log-live.tsx",
]

describe("workspace / real versus preview data", () => {
  it("[P0-SHL-04] live admin components never import local mock data", () => {
    for (const file of LIVE_COMPONENTS) {
      const source = readFileSync(path.join(ROOT, file), "utf8")
      expect(source, `${file} must not import mock data`).not.toContain(
        "lib/workspace/mock-data",
      )
    }
  })

  it("live components talk to Convex queries instead", () => {
    for (const file of LIVE_COMPONENTS) {
      const source = readFileSync(path.join(ROOT, file), "utf8")
      expect(source, `${file} should use Convex`).toContain("useQuery")
    }
  })

  it("workspace routes remain noindex through the layout metadata", () => {
    const source = readFileSync(
      path.join(ROOT, "app/ruang/layout.tsx"),
      "utf8",
    )
    expect(source).toContain("index: false")
    expect(source).toContain("follow: false")
  })
})
