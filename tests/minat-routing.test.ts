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
    slug: "batik-tulis-soga",
    code: "JLR-01",
    title: "Batik Tulis Soga",
    subtitle: "Belajar batik tulis dari pembatik Giriloyo.",
    teacher: "Bambang Hardjono",
    teacherRole: "Pembatik",
    region: "Giriloyo, Yogyakarta",
    level: "Dasar",
    modules: 4,
    weeks: 6,
    tasks: 8,
    price: 850_000,
    image: "https://example.test/batik.jpg",
    tags: ["Batik"],
    outcome: "Bisa membatik tulis.",
    includes: ["Modul"],
    ...overrides,
  }
}

function work(overrides: Partial<PublicWorkView> = {}): PublicWorkView {
  return {
    id: "work-1",
    slug: "batik-soga-anyaman",
    title: "Batik Soga Anyaman",
    kind: "product",
    category: "batik",
    maker: "Sari",
    makerRole: "Pengrajin",
    teacher: "Bambang Hardjono",
    region: "Giriloyo",
    price: 450_000,
    priceLabel: null,
    unit: "lembar",
    technique: "Batik tulis",
    techniqueNote: "Soga",
    workCard: "KN-2026-0001",
    description: "Kain batik tulis.",
    image: "https://example.test/kain.jpg",
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
    slug: "bambang-hardjono",
    name: "Bambang Hardjono",
    initials: "BH",
    specialty: "Batik tulis",
    region: "Giriloyo",
    experience: "30 tahun",
    quote: "Batik adalah doa.",
    focus: "Batik tulis",
    path: "Batik Tulis Soga",
    community: "Giriloyo",
    image: "https://example.test/teacher.jpg",
    verified: true,
    paths: [
      {
        slug: "batik-tulis-soga",
        code: "JLR-01",
        title: "Batik Tulis Soga",
        level: "Dasar",
        region: "Giriloyo",
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
      params: { path: "batik-tulis-soga", intent: "student" },
      paths: [path()],
      works: [],
      teacher: null,
    })
    expect(result).toEqual({
      kind: "redirect",
      href: enrollHref("batik-tulis-soga"),
    })
  })

  it("sends a work without intent to the work checkout", () => {
    const result = resolveMinat({
      params: { work: "batik-soga-anyaman" },
      paths: [],
      works: [work()],
      teacher: null,
    })
    expect(result).toEqual({
      kind: "redirect",
      href: buyHref("batik-soga-anyaman"),
    })
  })

  it("sends consultation intent to /tanya with the same context", () => {
    const result = resolveMinat({
      params: { teacher: "bambang-hardjono", intent: "consultation" },
      paths: [],
      works: [],
      teacher: teacher(),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: consultHref({
        teacher: "bambang-hardjono",
        intent: "consultation",
      }),
    })
  })

  it("sends notify and institution intents to /tanya", () => {
    for (const intent of ["notify", "institution"] as const) {
      const result = resolveMinat({
        params: { path: "batik-tulis-soga", intent },
        paths: [path()],
        works: [],
        teacher: null,
      })
      expect(result).toEqual({
        kind: "redirect",
        href: consultHref({ path: "batik-tulis-soga", intent }),
      })
    }
  })

  it("sends a teacher with exactly one path to that path checkout", () => {
    const result = resolveMinat({
      params: { teacher: "bambang-hardjono", intent: "student" },
      paths: [path()],
      works: [],
      teacher: teacher(),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: enrollHref("batik-tulis-soga"),
    })
  })

  it("renders a chooser when a teacher has multiple paths", () => {
    const result = resolveMinat({
      params: { teacher: "bambang-hardjono" },
      paths: [path(), path({ slug: "kriya-ukir-jepara" })],
      works: [],
      teacher: teacher({
        paths: [
          {
            slug: "batik-tulis-soga",
            code: "JLR-01",
            title: "Batik Tulis Soga",
            level: "Dasar",
            region: "Giriloyo",
            price: 850_000,
            comingSoon: false,
          },
          {
            slug: "kriya-ukir-jepara",
            code: "JLR-02",
            title: "Kriya Ukir Jepara",
            level: "Dasar",
            region: "Jepara",
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
      params: { teacher: "bambang-hardjono" },
      paths: [],
      works: [],
      teacher: teacher({ paths: [] }),
    })
    expect(result).toEqual({
      kind: "redirect",
      href: consultHref({ teacher: "bambang-hardjono" }),
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
    expect(interestHref({ path: "batik-tulis-soga", intent: "student" })).toBe(
      "/minat?path=batik-tulis-soga&intent=student",
    )
  })
})
