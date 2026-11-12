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

describe("phase 6 / live versus preview data", () => {
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

  it("[P6-SHL-02] preview boards stay isolated behind the explicit preview switch", async () => {
    const gates = [
      "components/workspace/governance/flow-board-gate.tsx",
      "components/workspace/governance/support-inbox-gate.tsx",
      "components/workspace/governance/settings-panel-gate.tsx",
      "components/workspace/governance/governance-board-gate.tsx",
    ]
    for (const file of gates) {
      const code = await source(file)
      expect(code, file).toContain("useViewer")
      expect(code, file).toContain("isPreview")
    }

    const previewSupport = await source(
      "components/workspace/governance/support-inbox.tsx",
    )
    expect(previewSupport).toContain("lib/workspace/mock-data")
    const previewFlows = await source(
      "components/workspace/governance/flow-board.tsx",
    )
    expect(previewFlows).toContain("lib/workspace/mock-data")
    const previewSettings = await source(
      "components/workspace/governance/settings-panel.tsx",
    )
    expect(previewSettings).toContain("lib/workspace/mock-data")
  })

  it("[P6-SHL-03] workspace routes render the shared gates, not role dashboards", async () => {
    const routes = {
      "app/ruang/alur/page.tsx": "FlowBoardGate",
      "app/ruang/dukungan/page.tsx": "SupportInboxGate",
      "app/ruang/pengaturan/page.tsx": "SettingsPanelGate",
      "app/ruang/tata-kelola/page.tsx": "GovernanceBoardGate",
    }
    for (const [file, gate] of Object.entries(routes)) {
      const code = await source(file)
      expect(code, file).toContain(gate)
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
