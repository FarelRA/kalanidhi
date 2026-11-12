import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { errorCode, seedAdmin, seedContent } from "./fixtures"

async function adminDb() {
  const t = createTestDb()
  await seedAdmin(t, "auth-admin")
  return t
}

const assetInput = {
  kind: "image" as const,
  externalUrl: "https://cdn.example.test/plate.png",
  filename: "plate.png",
  mimeType: "image/png",
  size: 2_048,
  width: 1408,
  height: 768,
  alt: "Piring canting",
}

describe("media library", () => {
  it("[P1-MED-03] alt, credit, permission, and focal point persist", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const id = await identity.mutation(api.media.saveAsset, {
      ...assetInput,
      caption: "Piring di bangku",
      credit: "Sanggar Soga",
      permission: "Izin 2026",
      focalX: 0.4,
      focalY: 0.6,
    })

    const asset = await identity.query(api.media.getAsset, { id })
    expect(asset?.alt).toBe("Piring canting")
    expect(asset?.credit).toBe("Sanggar Soga")
    expect(asset?.permission).toBe("Izin 2026")
    expect(asset?.focalX).toBe(0.4)
    expect(asset?.focalY).toBe(0.6)
  })

  it("[P1-MED-05] usage lists the public content reference", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const id = await identity.mutation(api.media.saveAsset, assetInput)

    const before = await identity.query(api.media.getUsage, { id })
    expect(before.inUse).toBe(false)

    await seedContent(t)
    await t.run(async (ctx) => {
      const site = await ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", "site"))
        .unique()
      if (!site) return
      const value = site.value as Record<string, unknown>
      const hero = value.hero as Record<string, unknown>
      const plate = hero.plate as Record<string, unknown>
      plate.imageAssetId = id
      await ctx.db.patch(site._id, { value })
    })

    const after = await identity.query(api.media.getUsage, { id })
    expect(after.inUse).toBe(true)
    expect(after.references[0]?.label).toBe("Landing publik")
  })

  it("[P1-MED-07] deleting an asset in use is blocked until references are removed", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const id = await identity.mutation(api.media.saveAsset, assetInput)
    const replacementId = await identity.mutation(api.media.saveAsset, {
      ...assetInput,
      externalUrl: "https://cdn.example.test/replacement.png",
      filename: "replacement.png",
    })
    await seedContent(t)
    await t.run(async (ctx) => {
      const site = await ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", "site"))
        .unique()
      if (!site) return
      const value = site.value as Record<string, unknown>
      const hero = value.hero as Record<string, unknown>
      const plate = hero.plate as Record<string, unknown>
      plate.imageAssetId = id
      await ctx.db.patch(site._id, { value })
    })

    const error = await identity
      .mutation(api.media.removeAsset, { id, reason: "Ganti aset" })
      .catch((caught: unknown) => caught)
    expect(errorCode(error)).toBe("MEDIA_IN_USE")

    await t.run(async (ctx) => {
      const site = await ctx.db
        .query("siteContent")
        .withIndex("by_key", (q) => q.eq("key", "site"))
        .unique()
      if (!site) return
      const value = site.value as Record<string, unknown>
      const hero = value.hero as Record<string, unknown>
      const plate = hero.plate as Record<string, unknown>
      plate.imageAssetId = replacementId
      await ctx.db.patch(site._id, { value })
    })
    await identity.mutation(api.media.removeAsset, { id, reason: "Tidak dipakai" })
    const asset = await identity.query(api.media.getAsset, { id })
    expect(asset?.status).toBe("archived")
  })

  it("[P1-MED-01] MIME type, extension, size, and alt are enforced server-side", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })

    await expect(
      identity.mutation(api.media.saveAsset, {
        ...assetInput,
        filename: "plate.svg",
        mimeType: "image/svg+xml",
      }),
    ).rejects.toThrow()

    await expect(
      identity.mutation(api.media.saveAsset, {
        ...assetInput,
        filename: "plate.jpg",
      }),
    ).rejects.toThrow()

    await expect(
      identity.mutation(api.media.saveAsset, {
        ...assetInput,
        alt: "   ",
      }),
    ).rejects.toThrow()
  })

  it("[P1-MED-06] replacing an asset keeps the same record and metadata", async () => {
    const t = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const id = await identity.mutation(api.media.saveAsset, {
      ...assetInput,
      caption: "Piring lama",
      credit: "Sanggar Soga",
    })

    await identity.mutation(api.media.replaceAsset, {
      id,
      externalUrl: "https://cdn.example.test/plate-v2.png",
      filename: "plate-v2.png",
      mimeType: "image/png",
      size: 4_096,
      width: 1600,
      height: 900,
      reason: "Gambar diperbarui",
    })

    const asset = await identity.query(api.media.getAsset, { id })
    expect(asset?.caption).toBe("Piring lama")
    expect(asset?.credit).toBe("Sanggar Soga")
    expect(asset?.size).toBe(4_096)
    expect(asset?.width).toBe(1600)
  })

  it("requires content.publish to manage media", async () => {
    const t = createTestDb()
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        authUserId: "auth-student",
        name: "Siswa",
        email: "siswa@example.test",
        emailVerified: true,
        phone: "6280000000000",
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: "SI",
        region: "Yogyakarta",
        roles: ["student"],
        status: "active",
        createdAt: 1_760_000_000_000,
        updatedAt: 1_760_000_000_000,
      })
    })
    await expect(
      t
        .withIdentity({ subject: "auth-student" })
        .mutation(api.media.generateUploadUrl, {}),
    ).rejects.toThrow()
  })
})
