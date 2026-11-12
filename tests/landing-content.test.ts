import { describe, expect, it } from "vitest"

import { siteSeed, pathsSeed } from "../convex/seedData"
import { SPLIT_PERCENTAGES } from "../lib/commerce/money"
import { pathMatchesField } from "../lib/content/catalog"
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
    expect(fieldHref("Batik tulis")).toBe("/jalur?bidang=Batik%20tulis")

    const path = {
      ...pathsSeed[0],
      modules: 0,
      image: "",
    } as LearningPath
    expect(pathMatchesField(path, "Batik tulis")).toBe(true)
    expect(pathMatchesField(path, "Tenun")).toBe(false)
  })
})
