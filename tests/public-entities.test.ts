import { describe, expect, it } from "vitest"

import { api } from "../convex/_generated/api"
import { createTestDb } from "./helpers/convex"
import { seedContent } from "./phase-1/fixtures"

describe("public entity queries", () => {
  it("lists every published path from Convex", async () => {
    const t = createTestDb()
    await seedContent(t)

    const paths = await t.query(api.content.listPublicPaths, {})
    expect(paths.map((path) => path.slug)).toContain("batik-tulis-soga")
    expect(paths.map((path) => path.slug)).toContain("kriya-ukir-bantul")
    expect(paths.every((path) => path.image.length > 0)).toBe(true)
  })

  it("returns path curriculum and cohorts from Convex", async () => {
    const t = createTestDb()
    await seedContent(t)

    const path = await t.query(api.content.getPublicPath, {
      slug: "batik-tulis-soga",
    })
    expect(path).not.toBeNull()
    expect(path?.curriculum.length).toBeGreaterThan(0)
    expect(path?.curriculum[0]?.lessons.length).toBeGreaterThan(0)
    expect(path?.cohorts.length).toBeGreaterThan(0)
    expect(path?.lessons).toBeGreaterThan(0)

    expect(
      await t.query(api.content.getPublicPath, { slug: "tidak-ada" }),
    ).toBeNull()
  })

  it("returns teachers with their paths and works", async () => {
    const t = createTestDb()
    await seedContent(t)

    const teachers = await t.query(api.content.listPublicTeachers, {})
    expect(teachers.length).toBeGreaterThan(0)

    const teacher = await t.query(api.content.getPublicTeacher, {
      slug: "bambang-hardjono",
    })
    expect(teacher?.name).toBe("Bambang Hardjono")
    expect(teacher?.paths.length).toBeGreaterThan(0)
    expect(teacher?.works.length).toBeGreaterThan(0)

    expect(
      await t.query(api.content.getPublicTeacher, { slug: "tidak-ada" }),
    ).toBeNull()
  })

  it("returns the FAQ list independently from the landing selection", async () => {
    const t = createTestDb()
    await seedContent(t)

    const faqs = await t.query(api.content.listPublicFaqs, {})
    expect(faqs.length).toBeGreaterThan(0)
    expect(faqs[0]).toHaveProperty("question")
    expect(faqs[0]).toHaveProperty("answer")
  })
})
