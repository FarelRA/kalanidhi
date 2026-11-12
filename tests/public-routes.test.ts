import { readFile, readdir } from "node:fs/promises"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  interestHref,
  pathHref,
  PUBLIC_STATIC_ROUTES,
  publicHref,
  teacherHref,
  verifyHref,
  workHref,
} from "../lib/content/routes"

const root = process.cwd()

async function walk(dir: string, files: string[] = []): Promise<string[]> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full, files)
    } else if (entry.isFile()) {
      files.push(full)
    }
  }
  return files
}

function routeFromPageFile(file: string): string | null {
  const relative = path.relative(root, file).replaceAll("\\", "/")
  if (!relative.startsWith("app/") || !relative.endsWith("/page.tsx")) {
    return null
  }
  const segments = relative
    .slice("app/".length)
    .replace(/\/page\.tsx$/, "")
    .split("/")
    .filter((segment) => segment && !/^\(.+\)$/.test(segment))
  return `/${segments.join("/")}`
}

async function appRoutes(): Promise<Array<{ route: string; pattern: RegExp }>> {
  const files = await walk(path.join(root, "app"))
  return files
    .map(routeFromPageFile)
    .filter((route): route is string => route !== null)
    .map((route) => {
      const source =
        route === "/"
          ? ""
          : route
              .split("/")
              .filter(Boolean)
              .map((segment) =>
                /^\[.+\]$/.test(segment)
                  ? "[^/]+"
                  : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
              )
              .join("/")
      return {
        route,
        pattern: new RegExp(`^/${source}${source ? "/?" : ""}$`),
      }
    })
}

function cleanHref(href: string): string {
  return href.split("#")[0]!.split("?")[0]!
}

function resolves(
  routes: Array<{ route: string; pattern: RegExp }>,
  href: string,
): boolean {
  const target = cleanHref(href) || "/"
  return routes.some(({ pattern }) => pattern.test(target))
}

describe("public routes", () => {
  it("every declared static public route has a page", async () => {
    const routes = await appRoutes()
    for (const href of PUBLIC_STATIC_ROUTES) {
      expect(resolves(routes, href), `${href} should resolve`).toBe(true)
    }
  })

  it("landing CTA and connection helpers point at real pages", async () => {
    const routes = await appRoutes()
    const ctaHrefs = [
      "/",
      pathHref("batik-tulis-soga"),
      teacherHref("bambang-hardjono"),
      workHref("batik-soga-anyaman"),
      verifyHref("KN-2026-0001"),
      interestHref({ intent: "student" }),
      interestHref({ path: "batik-tulis-soga", intent: "student" }),
      interestHref({ teacher: "bambang-hardjono", intent: "consultation" }),
      interestHref({ work: "batik-soga-anyaman", intent: "consultation" }),
      "/masuk?next=%2Fruang%2Fbelajar",
      "/daftar?next=%2Fruang%2Fbelajar",
      "/ruang/belajar",
      "/pesan/batik-soga-anyaman",
    ]

    for (const href of ctaHrefs) {
      expect(resolves(routes, href), `${href} should resolve`).toBe(true)
    }
  })

  it("maps every legacy landing anchor to a real page, never an action-only hash", () => {
    const anchors = [
      "#top",
      "#lingkaran",
      "#indeks",
      "#jalur",
      "#pengajar",
      "#karya",
      "#etika",
      "#institusi",
      "#faq",
      "#mangsa",
    ]
    for (const anchor of anchors) {
      const href = publicHref(anchor)
      expect(href.startsWith("/"), `${anchor} -> ${href}`).toBe(true)
    }
  })

  it("keeps the landing and layout free of generic action dialogs", async () => {
    const files = [
      ...(await walk(path.join(root, "components/landing"))),
      ...(await walk(path.join(root, "components/layout"))),
    ].filter((file) => file.endsWith(".tsx"))

    for (const file of files) {
      const source = await readFile(file, "utf8")
      const relative = path.relative(root, file)
      expect(source, `${relative} must not open a lead dialog`).not.toMatch(
        /openLead|LeadButton|LeadDialog|PathDialog|TeacherDialog/,
      )
      expect(source, `${relative} must not open an info dialog`).not.toMatch(
        /openInfo|InfoButton|InfoLink|InfoDialog|OverlayProvider/,
      )
      expect(source, `${relative} must not use an action-only href`).not.toMatch(
        /href=["']#[^"']*["']/,
      )
    }
  })

  it("finds only real route literals in public markup", async () => {
    const routes = await appRoutes()
    const files = [
      ...(await walk(path.join(root, "components/landing"))),
      ...(await walk(path.join(root, "components/layout"))),
      ...(await walk(path.join(root, "app/(site)"))),
      ...(await walk(path.join(root, "app/(auth)"))),
    ].filter((file) => file.endsWith(".tsx"))

    for (const file of files) {
      const source = await readFile(file, "utf8")
      for (const match of source.matchAll(/href=["'](\/[^"'`]*)["']/g)) {
        const href = match[1]
        if (!href) continue
        expect(
          resolves(routes, href),
          `${path.relative(root, file)} links to unknown route ${href}`,
        ).toBe(true)
      }
    }
  })
})
