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

  it("[P0-SHL-05] non-operators never subscribe to the admin overview query", () => {
    const source = readFileSync(
      path.join(ROOT, "components/workspace/overview/overview-live.tsx"),
      "utf8",
    )
    const gate = source.slice(
      source.indexOf("export function OverviewLive"),
      source.indexOf("function RoleOverviewNotice"),
    )
    expect(gate).toContain('can("operate")')
    expect(gate).not.toContain("useQuery")

    const admin = source.slice(source.indexOf("function AdminOverviewLive"))
    expect(admin).toContain("useQuery(api.stats.overview)")
  })

  it("[P0-SHL-06] the Convex client exists during server rendering", () => {
    const source = readFileSync(
      path.join(ROOT, "components/providers/convex-client-provider.tsx"),
      "utf8",
    )
    expect(source).not.toContain('typeof window !== "undefined"')
    expect(source).toContain("new ConvexReactClient(url)")
  })
})
