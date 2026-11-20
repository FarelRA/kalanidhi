import { mkdtemp, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

type Guard = {
  RUNTIME_ONLY_TEXT: string[]
  bakedRuntimeBranches: (html: string, phrases?: string[]) => string[]
  findBakedRuntimeBranches: (
    appDirectory?: string,
  ) => Promise<Array<{ file: string; phrases: string[] }>>
}

const guard = (await import("../scripts/check-prerender.mjs")) as Guard

async function fixture(files: Record<string, string>): Promise<string> {
  const base = await mkdtemp(path.join("/tmp/opencode", "prerender-guard-"))
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(base, name)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, content, "utf8")
  }
  return base
}

describe("prerender guard", () => {
  it("flags a page that baked a runtime-only branch", async () => {
    const base = await fixture({
      "pesan/kelas/batik-bambu.html": "<main>Masuk belum tersambung.</main>",
      "kelas/batik-bambu.html": "<main>Batik Bambu</main>",
    })

    const hits = await guard.findBakedRuntimeBranches(base)

    expect(hits).toHaveLength(1)
    expect(hits[0]?.file).toContain("pesan/kelas/batik-bambu.html")
    expect(hits[0]?.phrases).toEqual(["Masuk belum tersambung"])
  })

  it("accepts a page that defers the branch to the browser", async () => {
    const base = await fixture({
      "pesan/kelas/batik-bambu.html":
        "<main>Memuat identitas pembeli. Lanjut ke pembayaran.</main>",
    })

    await expect(guard.findBakedRuntimeBranches(base)).resolves.toEqual([])
  })

  it("keeps the list anchored to the shipped fallbacks", () => {
    expect(guard.RUNTIME_ONLY_TEXT).toEqual(
      expect.arrayContaining([
        "Masuk belum tersambung",
        "Checkout belum tersambung",
        "Status pesanan belum tersedia",
      ]),
    )
    expect(guard.bakedRuntimeBranches("bersih", ["Checkout belum tersambung"]))
      .toEqual([])
  })
})
