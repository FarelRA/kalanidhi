import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { NOW } from "./fixtures"

describe("content / SEO overrides", () => {
  it("returns the override for a route and null when absent", async () => {
    const t = createTestDb()
    await t.run(async (ctx) => {
      await ctx.db.insert("seoOverrides", {
        route: "/karya/batik-soga",
        title: "Batik Soga — Judul Khusus",
        description: "Deskripsi khusus untuk halaman karya.",
        ogTitle: "Batik Soga",
        ogDescription: "Kartu bagikan khusus.",
        canonical: "https://kalanidhi.site/karya/batik-soga",
        keywords: ["batik", "soga"],
        robots: "index, follow",
        updatedAt: NOW,
      })
    })

    const override = await t.query(api.content.getSeoOverride, {
      route: "/karya/batik-soga",
    })
    expect(override).toMatchObject({
      route: "/karya/batik-soga",
      title: "Batik Soga — Judul Khusus",
      description: "Deskripsi khusus untuk halaman karya.",
      ogTitle: "Batik Soga",
      ogDescription: "Kartu bagikan khusus.",
      canonical: "https://kalanidhi.site/karya/batik-soga",
      keywords: ["batik", "soga"],
      robots: "index, follow",
    })

    expect(
      await t.query(api.content.getSeoOverride, { route: "/karya/lain" }),
    ).toBeNull()
    expect(await t.query(api.content.getSeoOverride, { route: "  " })).toBeNull()
  })

  it("keeps optional fields null when the override omits them", async () => {
    const t = createTestDb()
    await t.run(async (ctx) => {
      await ctx.db.insert("seoOverrides", {
        route: "/",
        title: "Beranda",
        description: "Deskripsi beranda.",
        updatedAt: NOW,
      })
    })

    const override = await t.query(api.content.getSeoOverride, { route: "/" })
    expect(override?.ogTitle).toBeNull()
    expect(override?.ogDescription).toBeNull()
    expect(override?.canonical).toBeNull()
    expect(override?.keywords).toBeNull()
    expect(override?.robots).toBeNull()
  })
})
