import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const RUNTIME_DIRECTORIES = ["app", "components", "lib", "hooks", "convex"]

function sourceFiles(directory: string): string[] {
  const absolute = path.join(ROOT, directory)
  if (!existsSync(absolute)) return []
  return readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(relative)
    if (!entry.isFile()) return []
    return /\.(ts|tsx)$/.test(entry.name) ? [relative] : []
  })
}

const RUNTIME_FILES = RUNTIME_DIRECTORIES.flatMap(sourceFiles)

describe("no mock workspace data", () => {
  it("deletes the mock data module", () => {
    expect(existsSync(path.join(ROOT, "lib/workspace/mock-data.ts"))).toBe(false)
  })

  it("never imports the deleted mock data module", () => {
    for (const file of RUNTIME_FILES) {
      const source = readFileSync(path.join(ROOT, file), "utf8")
      expect(source, `${file} must not import mock-data`).not.toContain(
        "mock-data",
      )
    }
  })

  it("keeps no preview components", () => {
    const previews = RUNTIME_FILES.filter((file) =>
      file.endsWith("-preview.tsx"),
    )
    expect(previews).toEqual([])
  })

  it("keeps no preview mode switches or env plumbing", () => {
    for (const file of RUNTIME_FILES) {
      const source = readFileSync(path.join(ROOT, file), "utf8")
      expect(source, `${file} must not branch on isPreview`).not.toContain(
        "isPreview",
      )
      expect(
        source,
        `${file} must not read the workspace preview flag`,
      ).not.toContain("WORKSPACE_PREVIEW")
      expect(source, `${file} must not use preview personas`).not.toContain(
        "previewProfiles",
      )
    }
  })
})
