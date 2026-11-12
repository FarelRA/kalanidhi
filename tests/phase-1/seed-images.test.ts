import { describe, expect, it } from "vitest"

import { api, internal } from "../../convex/_generated/api"
import {
  pathsSeed,
  siteSeed,
  teachersSeed,
  worksSeed,
} from "../../convex/seedData"
import { createTestDb } from "../helpers/convex"

const NOW = 1_760_000_000_000

function seedFilenames(): string[] {
  return Array.from(
    new Set([
      siteSeed.hero.plate.imageFile,
      siteSeed.metadata.image.imageFile,
      ...pathsSeed.map((path) => path.imageFile),
      ...teachersSeed.map((teacher) => teacher.imageFile),
      ...worksSeed.map((work) => work.imageFile),
    ]),
  )
}

async function registerImages(
  t: ReturnType<typeof createTestDb>,
  filenames: string[],
) {
  await t.run(async (ctx) => {
    for (const filename of filenames) {
      const storageId = await ctx.storage.store(
        new Blob([`image:${filename}`], { type: "image/jpeg" }),
      )
      await ctx.db.insert("mediaAssets", {
        kind: "image",
        storageId,
        filename,
        mimeType: "image/jpeg",
        size: 10,
        alt: filename,
        status: "active",
        uploadedBy: "system",
        createdAt: NOW,
      })
    }
  })
}

describe("seed images resolve through Convex storage", () => {
  it("seeds paths, teachers, and works with storage URLs", async () => {
    const t = createTestDb()
    await registerImages(t, seedFilenames())

    await t.mutation(internal.seed.run, {})

    const site = await t.query(api.content.getSite, {})
    expect(site).not.toBeNull()
    expect(site?.paths.length).toBeGreaterThan(0)
    expect(site?.teachers.length).toBeGreaterThan(0)
    expect(site?.works.length).toBeGreaterThan(0)

    const images = [
      site?.hero.plate.image,
      site?.metadata.image.url,
      ...(site?.paths ?? []).map((path) => path.image),
      ...(site?.teachers ?? []).map((teacher) => teacher.image),
      ...(site?.works ?? []).map((work) => work.image),
    ]

    for (const image of images) {
      expect(image).toBeTruthy()
      expect(image?.startsWith("/images/")).toBe(false)
      expect(image).toMatch(/^https?:\/\//)
    }
  })

  it("fails the seed loudly when an image asset is missing", async () => {
    const t = createTestDb()
    const filenames = seedFilenames()
    await registerImages(t, filenames.slice(1))

    await expect(t.mutation(internal.seed.run, {})).rejects.toThrow(
      /belum ada di mediaAssets/,
    )
  })
})
