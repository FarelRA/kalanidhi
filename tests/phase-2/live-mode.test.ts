import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(relative: string) {
  return readFileSync(path.join(root, relative), "utf8")
}

describe("learning / live surface", () => {
  it("[P2-LRN-18] live boards never import preview fixtures", () => {
    const liveFiles = [
      "components/workspace/learning/live-learning-board.tsx",
      "components/workspace/learning/live-task-board.tsx",
      "components/workspace/learning/live-schedule-board.tsx",
      "components/workspace/credentials/live-credential-board.tsx",
    ]

    for (const file of liveFiles) {
      const source = read(file)
      expect(source).not.toContain("mock-data")
      expect(source).not.toContain("lib/workspace/mock-data")
      expect(source).toContain("useQuery")
    }
  })

  it("[P2-LRN-19] learning routes render the live boards directly", () => {
    const routes = {
      "app/ruang/belajar/page.tsx": "LiveLearningBoard",
      "app/ruang/tugas/page.tsx": "LiveTaskBoard",
      "app/ruang/jadwal/page.tsx": "LiveScheduleBoard",
      "app/ruang/kredensial/page.tsx": "LiveCredentialBoard",
    }

    for (const [file, component] of Object.entries(routes)) {
      const source = read(file)
      expect(source, `${file} must render ${component}`).toContain(component)
      expect(source).not.toContain("isPreview")
      expect(source).not.toContain("mock-data")
    }
  })

  it("[P2-LRN-20] live surface copy avoids the forbidden labels", () => {
    const files = [
      "components/workspace/learning/live-learning-board.tsx",
      "components/workspace/learning/live-task-board.tsx",
      "components/workspace/learning/live-schedule-board.tsx",
      "components/workspace/credentials/live-credential-board.tsx",
      "app/(site)/verifikasi/[kode]/page.tsx",
    ]
    const forbidden = ["dummy", "contoh", "prototipe", "sample", "uji coba", "maestro"]
    for (const file of files) {
      const source = read(file).toLowerCase()
      for (const label of forbidden) {
        expect(source).not.toContain(label)
      }
    }
  })

  it("[P2-CRT-14] public verification copy is platform-only and non-indexable", () => {
    const source = read("app/(site)/verifikasi/[kode]/page.tsx")
    expect(source).toContain("Sertifikat platform")
    expect(source).toContain("bukan sertifikasi pemerintah atau BNSP")
    expect(source).toContain("index: false")
    expect(source).not.toContain("BNSP certified")
    expect(source).not.toContain("akreditasi pemerintah")
  })
})
