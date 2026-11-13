import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

async function source(relativePath: string): Promise<string> {
  return await readFile(path.join(process.cwd(), relativePath), "utf8")
}

const LIVE_COMPONENTS = [
  "components/workspace/governance/flow-board-live.tsx",
  "components/workspace/governance/support-inbox-live.tsx",
  "components/workspace/governance/settings-panel-live.tsx",
  "components/workspace/governance/governance-board-live.tsx",
]

describe("phase 6 / live data only", () => {
  it("[P6-SHL-01] live governance components read Convex and never import mock data", async () => {
    for (const file of LIVE_COMPONENTS) {
      const code = await source(file)
      expect(code, file).toContain("@/convex/_generated/api")
      expect(code, file).toContain('from "convex/react"')
      expect(code, file).toContain("useQuery")
      expect(code, file).not.toContain("lib/workspace/mock-data")
      expect(code, file).not.toContain("mock-data")
    }
  })

  it("[P6-SHL-02] no governance preview board or gate remains", async () => {
    for (const file of [
      "components/workspace/governance/flow-board.tsx",
      "components/workspace/governance/support-inbox.tsx",
      "components/workspace/governance/settings-panel.tsx",
      "components/workspace/governance/flow-board-gate.tsx",
      "components/workspace/governance/support-inbox-gate.tsx",
      "components/workspace/governance/settings-panel-gate.tsx",
      "components/workspace/governance/governance-board-gate.tsx",
    ]) {
      await expect(source(file)).rejects.toThrow()
    }
  })

  it("[P6-SHL-03] workspace routes render the live governance boards, not role dashboards", async () => {
    const routes = {
      "app/ruang/alur/page.tsx": "FlowBoardLive",
      "app/ruang/dukungan/page.tsx": "SupportInboxLive",
      "app/ruang/pengaturan/page.tsx": "SettingsPanelLive",
      "app/ruang/tata-kelola/page.tsx": "GovernanceBoardLive",
    }
    for (const [file, component] of Object.entries(routes)) {
      const code = await source(file)
      expect(code, file).toContain(component)
      expect(code, file).not.toContain("isPreview")
      expect(code, file).not.toContain("mock-data")
      expect(code, file).not.toContain("/admin")
    }
  })

  it("[P6-SHL-04] governance live view hides itself without the capability", async () => {
    const code = await source(
      "components/workspace/governance/governance-board-live.tsx",
    )
    expect(code).toContain('can("governance.manage")')
    expect(code).toContain("Ruang tata kelola terkunci")
  })
})
