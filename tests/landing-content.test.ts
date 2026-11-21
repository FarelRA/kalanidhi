import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { siteSeed, pathsSeed } from "../convex/seed/content/data"
import { SPLIT_PERCENTAGES } from "../lib/commerce/money"
import { orderCatalogFields, pathMatchesField } from "../lib/content/catalog"
import { fieldHref, PUBLIC_ROUTES } from "../lib/content/routes"
import type { LearningPath } from "../lib/content/types"

describe("landing content sources", () => {
  it("stores traction labels without invented numbers", () => {
    expect(siteSeed.traction.figures.length).toBeGreaterThan(0)
    for (const figure of siteSeed.traction.figures) {
      expect(figure.metric).toBeTruthy()
      expect(figure).not.toHaveProperty("value")
    }
  })

  it("keeps the loop caveat editable in siteContent", () => {
    expect(siteSeed.loop.returnCaveat.length).toBeGreaterThan(20)
    expect(siteSeed.loop).not.toHaveProperty("diagram")
  })

  it("draws the loop with type and rules, not an illustration", () => {
    const source = readFileSync(
      path.resolve(__dirname, "../components/landing/bench-loop.tsx"),
      "utf8",
    )
    expect(source).not.toContain("<svg")
    expect(source).not.toContain("diagram")
  })

  it("derives the revenue split from the shared money constant", () => {
    const values = siteSeed.ethics.share.map((item) => item.value)
    expect(values).toEqual([
      SPLIT_PERCENTAGES.teacher,
      SPLIT_PERCENTAGES.community,
      SPLIT_PERCENTAGES.platform,
    ])
  })

  it("points footer and navigation links at real routes", () => {
    const links = [
      ...siteSeed.footer.columns.flatMap((column) => column.links),
      ...siteSeed.navigation,
    ]
    for (const link of links) {
      expect(link.href.startsWith("/"), `${link.label} -> ${link.href}`).toBe(
        true,
      )
    }
    const about = siteSeed.footer.columns
      .flatMap((column) => column.links)
      .find((link) => link.label === "Tentang KalaNidhi Digital")
    expect(about?.href).toBe(PUBLIC_ROUTES.about)
  })

  it("builds a field filter URL and matches paths honestly", () => {
    expect(fieldHref("Batik tulis")).toBe("/kelas?bidang=Batik%20tulis")

    const bamboo = {
      ...pathsSeed[0],
      modules: 0,
      image: "",
    } as LearningPath
    expect(bamboo.slug).toBe("batik-bambu")
    expect(pathMatchesField(bamboo, "Batik bambu")).toBe(true)
    expect(pathMatchesField(bamboo, "Batik tulis")).toBe(false)
    expect(pathMatchesField(bamboo, "Kriya gerabah")).toBe(false)
    const aksara = { ...pathsSeed[2], modules: 0, image: "" } as LearningPath
    expect(pathMatchesField(aksara, "Aksara Jawa")).toBe(true)
    const tariKreasi = { ...pathsSeed[4], modules: 0, image: "" } as LearningPath
    expect(pathMatchesField(tariKreasi, "Tari Kreasi")).toBe(true)
    const gerabah = { ...pathsSeed[1], modules: 0, image: "" } as LearningPath
    expect(pathMatchesField(gerabah, "Kriya gerabah")).toBe(true)
    const batikTulis = {
      ...pathsSeed[3],
      modules: 0,
      image: "",
    } as LearningPath
    expect(batikTulis.slug).toBe("batik-tulis-soga")
    expect(batikTulis.comingSoon).toBe(true)
    expect(pathMatchesField(batikTulis, "Batik tulis")).toBe(true)
    for (const field of [
      "Karawitan",
      "Tari tradisi",
      "Keramik",
      "Kuliner tradisi",
      "Jamu",
      "Wayang",
    ]) {
      expect(pathMatchesField(bamboo, field), field).toBe(false)
      expect(pathMatchesField(aksara, field), field).toBe(false)
      expect(pathMatchesField(tariKreasi, field), field).toBe(false)
      expect(pathMatchesField(gerabah, field), field).toBe(false)
    }
  })

  it("orders field selectors by readiness", () => {
    expect(
      orderCatalogFields([
        {
          name: "Wayang",
          region: "Bantul",
          status: "Direncanakan",
          note: "Belum ada pengajar",
        },
        {
          name: "Kriya gerabah",
          region: "Bantul",
          status: "Sedang dipetakan",
          note: "Kurikulum disusun",
        },
        {
          name: "Batik bambu",
          region: "Bantul",
          status: "Terbuka",
          note: "Kelas aktif",
        },
      ]).map((field) => field.name),
    ).toEqual(["Batik bambu", "Kriya gerabah", "Wayang"])
  })
})
