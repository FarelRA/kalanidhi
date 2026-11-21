import { describe, expect, it } from "vitest"

import { resolveMinat } from "../app/(site)/minat/resolve"
import type { PublicWorkView } from "../lib/commerce/types"
import type {
  LearningPath,
  PublicTeacherDetail,
} from "../lib/content/types"
import {
  buyHref,
  consultHref,
  enrollHref,
  interestHref,
} from "../lib/content/routes"

function path(overrides: Partial<LearningPath> = {}): LearningPath {
  return {
    slug: "batik-bambu",
    code: "JLR-01",
    title: "Batik Bambu",
    subtitle: "Belajar batik bambu dari perajin Krebet.",
    teacher: "Zadira Ahmada",
    teacherRole: "Pembatik",
    region: "Krebet, Bantul, Yogyakarta",
    level: "Dasar",
    modules: 4,
    weeks: 6,
    tasks: 8,
    price: 850_000,
    image: "https://example.test/batik.jpg",
    tags: ["Batik"],
    outcome: "Bisa membatik bambu.",
    includes: ["Modul"],
    ...overrides,
  }
}

function work(overrides: Partial<PublicWorkView> = {}): PublicWorkView {
  return {
    id: "work-1",
    slug: "nampan-batik-bambu",
    title: "Nampan Batik Bambu",
    kind: "product",
    category: "batik",
    maker: "Sari",
    makerRole: "Pengrajin",
    teacher: "Zadira Ahmada",
    region: "Krebet, Bantul",
    price: 450_000,
    priceLabel: null,
    pathId: "batik-bambu",
    unit: "nampan",
    technique: "Batik bambu",
    techniqueNote: "Canting pada bambu",
    workCard: "KN-2026-0001",
    description: "Nampan bambu batik.",
    image: "https://example.test/bambu.jpg",
    permission: "Izin komunitas",
    split: {
      baseAmount: 450_000,
      teacherShare: 315_000,
      platformShare: 67_500,
      communityShare: 67_500,
    },
    purchasable: true,
    ...overrides,
  }
}

function teacher(
  overrides: Partial<PublicTeacherDetail> = {},
): PublicTeacherDetail {
  return {
    slug: "zadira-ahmada",
    name: "Zadira Ahmada",
    initials: "SS",
    specialty: "Batik bambu",
    region: "Krebet, Bantul",
    experience: "Belasan tahun",
    quote: "Membatik bambu mengajarkan sabar.",
    focus: "Batik bambu",
    path: "Batik Bambu",
    community: "Giriloyo",
    image: "https://example.test/teacher.jpg",
    verified: true,
    paths: [
      {
        slug: "batik-bambu",
        code: "JLR-01",
        title: "Batik Bambu",
        level: "Dasar",
        region: "Krebet, Bantul",
        price: 850_000,
        priceLabel: undefined,
        comingSoon: false,
      },
    ],
    works: [],
    ...overrides,
  }
}

describe("/minat smart routing", () => {
  it("sends a path with student intent to the path checkout", () => {
    const result = resolveMinat({
      params: { path: "batik-bambu", intent: "student" },
      paths: [path()],
      works: [],
      teacher: null,
    })
    expect(result).toEqual({
      kind: "redirect",
      href: enrollHref("batik-bambu"),
    })
  })

  it("sends a work without intent to the work checkout", () => {
    const result = resolveMinat({
      params: { work: "nampan-batik-bambu" },
      paths: [],
      works: [work()],
      teacher: null,
    })
    expect(result).toEqual({
      kind: "redirect",
      href: buyHref("nampan-batik-bambu"),
    })
  })

  it("sends consultation intent to /tanya with the same context", () => {
    const result = resolveMinat({
      params: { teacher: "zadira-ahmada", intent: "consultation" },
      paths: [],
      works: [],
      teacher: teacher(),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: consultHref({
        teacher: "zadira-ahmada",
        intent: "consultation",
      }),
    })
  })

  it("sends notify and institution intents to /tanya", () => {
    for (const intent of ["notify", "institution"] as const) {
      const result = resolveMinat({
        params: { path: "batik-bambu", intent },
        paths: [path()],
        works: [],
        teacher: null,
      })
      expect(result).toEqual({
        kind: "redirect",
        href: consultHref({ path: "batik-bambu", intent }),
      })
    }
  })

  it("sends a teacher with exactly one path to that path checkout", () => {
    const result = resolveMinat({
      params: { teacher: "zadira-ahmada", intent: "student" },
      paths: [path()],
      works: [],
      teacher: teacher(),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: enrollHref("batik-bambu"),
    })
  })

  it("renders a chooser when a teacher has multiple paths", () => {
    const result = resolveMinat({
      params: { teacher: "zadira-ahmada" },
      paths: [path(), path({ slug: "kriya-gerabah-bantul" })],
      works: [],
      teacher: teacher({
        paths: [
          {
            slug: "batik-bambu",
            code: "JLR-01",
            title: "Batik Bambu",
            level: "Dasar",
            region: "Krebet, Bantul",
            price: 850_000,
            comingSoon: false,
          },
          {
            slug: "kriya-gerabah-bantul",
            code: "JLR-02",
            title: "Kriya Gerabah",
            level: "Dasar",
            region: "Bantul",
            price: 900_000,
            comingSoon: false,
          },
        ],
      }),
    })
    expect(result.kind).toBe("chooser")
  })

  it("sends a teacher without paths to /tanya", () => {
    const result = resolveMinat({
      params: { teacher: "zadira-ahmada" },
      paths: [],
      works: [],
      teacher: teacher({ paths: [] }),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: consultHref({ teacher: "zadira-ahmada" }),
    })
  })

  it("renders the catalog when there is no context", () => {
    const result = resolveMinat({
      params: {},
      paths: [path()],
      works: [work()],
      teacher: null,
    })
    expect(result).toEqual({ kind: "catalog" })
  })

  it("returns notFound for a missing path, work, or teacher", () => {
    expect(
      resolveMinat({
        params: { path: "tidak-ada" },
        paths: [path()],
        works: [],
        teacher: null,
      }),
    ).toEqual({ kind: "notFound" })
    expect(
      resolveMinat({
        params: { work: "tidak-ada" },
        paths: [],
        works: [work()],
        teacher: null,
      }),
    ).toEqual({ kind: "notFound" })
    expect(
      resolveMinat({
        params: { teacher: "tidak-ada" },
        paths: [],
        works: [],
        teacher: null,
      }),
    ).toEqual({ kind: "notFound" })
  })

  it("keeps interestHref on /minat so existing landing links still route", () => {
    expect(interestHref({ path: "batik-bambu", intent: "student" })).toBe(
      "/minat?path=batik-bambu&intent=student",
    )
  })
})
