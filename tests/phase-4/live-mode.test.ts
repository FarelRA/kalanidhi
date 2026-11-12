import { readFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

async function source(relativePath: string): Promise<string> {
  return await readFile(path.join(process.cwd(), relativePath), "utf8")
}

describe("messaging / live mode data source", () => {
  it("[P4-MSG-50] the live message centre reads Convex and never imports mock data", async () => {
    const live = await source(
      "components/workspace/communication/message-center-live.tsx",
    )
    expect(live).toContain("@/convex/_generated/api")
    expect(live).toContain('from "convex/react"')
    expect(live).toContain("useQuery")
    expect(live).not.toContain("mock-data")
    expect(live).not.toContain("chatMessages")
    expect(live).not.toContain("lib/workspace/mock")
  })

  it("[P4-MSG-51] preview data is isolated behind the explicit preview switch", async () => {
    const wrapper = await source(
      "components/workspace/communication/message-center.tsx",
    )
    expect(wrapper).toContain("useViewer")
    expect(wrapper).toContain("isPreview")
    expect(wrapper).toContain("MessageCenterPreview")
    expect(wrapper).toContain("MessageCenterLive")

    const preview = await source(
      "components/workspace/communication/message-center-preview.tsx",
    )
    expect(preview).toContain("lib/workspace/mock-data")
  })

  it("[P4-MSG-52] the route renders the shared message centre, not a role dashboard", async () => {
    const page = await source("app/ruang/pesan/page.tsx")
    expect(page).toContain("MessageCenter")
    expect(page).not.toContain("/admin")
    expect(page).not.toContain("mock-data")
  })
})
