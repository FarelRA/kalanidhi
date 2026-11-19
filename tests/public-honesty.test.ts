import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { publishedTeacherName } from "../lib/content/people"
import {
  CULTURAL_SOURCE_NOTE,
  CULTURAL_SOURCE_STATUS_LABELS,
  summarizeCulturalSource,
} from "../lib/content/sources"
import type { PublicCulturalSource } from "../lib/content/types"

const baseSource: PublicCulturalSource = {
  community: "Paguyuban Batik Tulis Giriloyo (Koperasi Jasa), Desa Wukirsari",
  sourceName: "Materi Batik Giriloyo",
  pathSlug: "batik-bambu",
  workSlug: null,
  permissionReference: "Arsip dokumen pengelola platform",
  permissionDate: Date.UTC(2026, 0, 12),
  permissionStatus: "granted",
  accessLevel: "public",
  attribution: "Materi disusun Paguyuban Batik Tulis Giriloyo.",
  notes: null,
}

const read = (file: string) => readFileSync(path.resolve(__dirname, "..", file), "utf8")

describe("per-source cultural permissions", () => {
  it("prints a permission date only on a granted row", () => {
    const granted = summarizeCulturalSource(baseSource, () => "12 Januari 2026")
    expect(granted.statusLabel).toBe(CULTURAL_SOURCE_STATUS_LABELS.granted)
    expect(granted.dateLabel).toBe("12 Januari 2026")
    expect(granted.referenceLabel).toBe("Arsip pengelola")

    const pending = summarizeCulturalSource(
      { ...baseSource, permissionStatus: "pending" },
      () => "12 Januari 2026",
    )
    expect(pending.statusLabel).toBe(CULTURAL_SOURCE_STATUS_LABELS.pending)
    expect(pending.dateLabel).toBeNull()

    const withdrawn = summarizeCulturalSource(
      { ...baseSource, permissionStatus: "withdrawn" },
      () => "12 Januari 2026",
    )
    expect(withdrawn.dateLabel).toBeNull()
  })

  it("does not invent a date when the source has none", () => {
    const summary = summarizeCulturalSource(
      { ...baseSource, permissionDate: undefined },
      () => {
        throw new Error("formatter must not be called")
      },
    )
    expect(summary.statusLabel).toBe(CULTURAL_SOURCE_STATUS_LABELS.granted)
    expect(summary.dateLabel).toBeNull()
  })

  it("renders a citation as Rujukan publik, not Izin tercatat", () => {
    const summary = summarizeCulturalSource(
      {
        ...baseSource,
        permissionStatus: "public_reference",
        permissionReference: "https://fitinline.com/article/read/batik-bambu/",
      },
      () => "12 Januari 2026",
    )
    expect(summary.statusLabel).toBe("Rujukan publik")
    expect(summary.dateLabel).toBeNull()
    expect(summary.referenceLabel).toBe("Rujukan publik")
    expect(summary.referenceKind).toBe("public")
  })

  it("recognises a public reference stored as a granted permission", () => {
    const summary = summarizeCulturalSource({
      ...baseSource,
      permissionReference: "Arsip rujukan publik pengelola platform",
    })
    expect(summary.statusLabel).toBe("Rujukan publik")
    expect(summary.dateLabel).toBeNull()
  })

  it("keeps the compact community name for the footer", () => {
    const summary = summarizeCulturalSource(baseSource)
    expect(summary.shortCommunity).toBe("Paguyuban Batik Tulis Giriloyo")
    expect(CULTURAL_SOURCE_NOTE).toContain("Kartu Sumber Budaya")
  })
})

describe("public source rendering never borrows one row for the site", () => {
  it("footer leaves the source list to the class and work pages", () => {
    const source = read("components/layout/site-footer.tsx")
    expect(source).not.toContain("summarizeCulturalSource")
    expect(source).not.toContain("culturalSources")
  })

  it("source panel renders every source instead of the last one", () => {
    const source = read("components/landing/cultural-sources.tsx")
    expect(source).not.toMatch(/sources\.at\(-1\)/)
    expect(source).not.toMatch(/latest/)
    expect(source).toMatch(/summarizeCulturalSource/)
  })
})

describe("published teacher visibility", () => {
  it("keeps a name only when the profile is published", () => {
    const published = ["Sri Sriningsih", "Bambang Hardjono"]
    expect(publishedTeacherName("Sri Sriningsih", published)).toBe(
      "Sri Sriningsih",
    )
    expect(publishedTeacherName("Sutrisno Wibowo", published)).toBeNull()
    expect(publishedTeacherName("Pengajar belum ditautkan", published)).toBeNull()
    expect(publishedTeacherName("", published)).toBeNull()
  })

  it("path pages leave out an unpublished teacher line", () => {
    const detail = read("app/(site)/kelas/[slug]/page.tsx")
    expect(detail).toMatch(/publishedTeacherName/)
    expect(detail).not.toContain("Pengajar sedang diverifikasi")
    const card = read("components/landing/path-card.tsx")
    expect(card).toMatch(/publishedTeacherName/)
    expect(card).not.toContain("Pengajar sedang diverifikasi")
  })
})
