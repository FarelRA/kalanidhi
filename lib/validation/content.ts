import { z } from "zod"

import type { SiteCopy, SiteData } from "../content/types"

/**
 * One schema validates the editor form, the save mutation, the stored
 * revision, and the publish boundary. Nothing else may define a second shape.
 */

const required = (max = 2_000) => z.string().trim().min(1).max(max)
const allowEmpty = (max = 2_000) => z.string().trim().max(max)
const optionalShort = (max = 400) => z.string().trim().max(max).optional()
const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya huruf kecil, angka, dan tanda hubung.")

const httpUrl = z.string().trim().refine(
  (value) => {
    try {
      const parsed = new URL(value)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
      return false
    }
  },
  { message: "URL harus memakai http atau https." },
)

const imageSource = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        const parsed = new URL(value)
        return parsed.protocol === "http:" || parsed.protocol === "https:"
      } catch {
        return false
      }
    },
    { message: "Sumber gambar harus URL Convex storage http(s)." },
  )

const href = z.string().trim().min(1).max(600).refine(
  (value) => {
    if (value.startsWith("#") || value.startsWith("/")) {
      return !value.startsWith("//")
    }
    if (value.startsWith("mailto:") || value.startsWith("tel:")) return true
    try {
      const parsed = new URL(value)
      return parsed.protocol === "http:" || parsed.protocol === "https:"
    } catch {
      return false
    }
  },
  { message: "Tautan harus anchor, path internal, mailto, tel, atau http(s)." },
)

const order = z.number().int().min(0).max(10_000)
const count = z.number().int().min(0).max(1_000_000)
const price = z.number().int().min(0).max(1_000_000_000)

export const catalogStatusSchema = z.enum([
  "Terbuka",
  "Sedang dipetakan",
  "Direncanakan",
])

export const infoKeySchema = z.enum([
  "policy",
  "login",
  "mangsa",
  "verify",
  "about",
  "privacy",
  "terms",
])

const leadVariantSchema = z.enum([
  "student",
  "institution",
  "consultation",
  "notify",
])

const metricSchema = z.object({
  value: required(120),
  label: required(240),
})

const loopStageSchema = z.object({
  code: required(30),
  title: required(120),
  description: required(1_000),
})

const catalogGroupSchema = z.object({
  status: catalogStatusSchema,
  title: required(120),
  blurb: required(600),
})

const heroSchema = z.object({
  title: z.array(required(300)).min(1).max(4),
  description: required(2_000),
  primaryCta: required(120),
  secondaryCta: required(120),
  plate: z.object({
    image: imageSource,
    alt: required(300),
    caption: required(300),
    note: required(240),
  }),
  workCard: z.object({
    title: required(120),
    serial: required(80),
    work: required(200),
    maker: required(160),
    teacher: required(160),
  }),
})

const tractionSchema = z.object({
  label: required(160),
  note: required(600),
  figures: z.array(metricSchema).min(1).max(12),
})

const loopSchema = z.object({
  label: required(160),
  title: required(300),
  description: required(2_000),
  returnLabel: required(120),
  returnNote: required(1_000),
  stages: z.array(loopStageSchema).min(3).max(8),
  diagram: z.object({
    title: required(200),
    description: required(1_000),
  }),
})

const catalogSchema = z.object({
  label: required(160),
  title: required(300),
  description: required(1_500),
  cta: required(120),
  groups: z.array(catalogGroupSchema).min(1).max(8),
})

const mangsaSchema = z.object({
  label: required(120),
  season: required(80),
  name: required(80),
  period: required(120),
  eyebrow: required(120),
  title: required(300),
  description: required(2_000),
  activities: z.array(required(300)).min(1).max(12),
  activityLabel: required(120),
  provenance: required(1_000),
})

const ethicsSchema = z.object({
  label: required(160),
  title: required(300),
  description: required(2_000),
  principles: z
    .array(
      z.object({
        title: required(200),
        description: required(1_000),
      }),
    )
    .min(1),
  accessLevels: z
    .array(
      z.object({
        label: required(120),
        note: required(600),
      }),
    )
    .min(1),
  share: z
    .array(
      z.object({
        label: required(200),
        value: z.number().int().min(0).max(100),
        note: required(600),
      }),
    )
    .min(1),
  shareTitle: required(120),
  shareNote: required(300),
  shareAriaLabel: required(600),
  card: z.object({
    sourceTitle: required(160),
    permissionLabel: required(120),
    referenceLabel: required(120),
  }),
  attribution: z.object({
    permission: required(400),
    access: required(120),
    reference: required(600),
    sources: z
      .array(
        z.object({
          initials: required(8),
          name: required(200),
          field: required(200),
        }),
      )
      .min(1),
  }),
})

const institutionSchema = z.object({
  label: required(160),
  title: required(300),
  description: required(1_500),
  segments: z.array(required(120)).min(1),
  points: z.array(required(400)).min(1),
  brief: z.array(z.tuple([required(120), required(300)])).min(1),
  cta: required(120),
  note: required(400),
  summaryLabel: required(160),
  summaryTitle: required(160),
  year: required(20),
})

const footerSchema = z.object({
  description: required(1_500),
  columns: z
    .array(
      z.object({
        title: required(120),
        links: z
          .array(
            z.object({
              label: required(120),
              href,
            }),
          )
          .min(1),
      }),
    )
    .min(1),
  secretariat: z.object({
    label: required(120),
    value: required(300),
  }),
  edition: required(80),
  copyright: required(200),
  sourceLabel: required(120),
  sourceDescription: required(1_000),
  sourcesLabel: required(120),
  cultureLabel: required(120),
  culturePolicyCta: required(120),
  certificateNote: required(600),
  preferencesLabel: required(120),
  languageLabel: required(120),
  dataSaverLabel: required(120),
  privacyLabel: required(120),
  termsLabel: required(120),
  backToTopLabel: required(120),
  newsletter: z.object({
    label: required(160),
    placeholder: required(160),
    cta: required(80),
    pending: required(80),
    note: required(400),
    errorNote: required(200),
    interest: required(200),
    source: required(80),
  }),
})

const navigationItemSchema = z.object({
  label: required(80),
  href,
})

const infoContentSchema = z.object({
  icon: z.enum(["policy", "login", "calendar", "verify", "about", "privacy", "terms"]),
  title: required(200),
  description: required(1_500),
  bullets: z.array(required(400)).max(12).optional(),
  footnote: optionalShort(600),
  action: z
    .object({
      label: required(120),
      lead: z.object({
        variant: leadVariantSchema,
        interest: optionalShort(200),
      }),
    })
    .optional(),
})

const overlaysSchema = z.object({
  policy: infoContentSchema,
  login: infoContentSchema,
  mangsa: infoContentSchema,
  verify: infoContentSchema,
  about: infoContentSchema,
  privacy: infoContentSchema,
  terms: infoContentSchema,
})

const sectionCopySchema = z.object({
  paths: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
    detailCta: required(80),
    openCta: required(80),
    plannedCta: required(80),
    priceLabel: required(80),
    statusLabel: required(80),
    contentLabel: required(80),
    includesLabel: required(80),
    curriculumPending: required(120),
  }),
  teachers: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
    profileCta: required(80),
    dialogLabel: required(120),
    askCta: required(120),
  }),
  works: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
    featuredLabel: required(80),
    serviceLabel: required(80),
    priceLabel: required(80),
    askCta: required(120),
  }),
  notes: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
  }),
  faq: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
    policyCta: required(80),
    askCta: required(120),
  }),
  closing: z.object({
    label: required(120),
    title: required(300),
    description: required(1_000),
    primaryCta: required(80),
    secondaryCta: required(80),
    noteSuffix: required(300),
  }),
})

const headerSchema = z.object({
  brandAria: required(200),
  mainNavAria: required(160),
  mobileNavAria: required(160),
  searchAria: required(200),
  searchLabel: required(120),
  menuAria: required(160),
  loginCta: required(80),
  registerCta: required(80),
  mobileSearch: required(160),
  mobileRegisterCta: required(80),
  sheetTitle: required(160),
  sheetDescription: required(400),
  region: required(160),
})

const searchSchema = z.object({
  title: required(200),
  description: required(1_000),
  placeholder: required(200),
  emptyPrefix: required(200),
  emptySuffix: required(200),
  footerLabel: required(160),
  escLabel: required(80),
  closeLabel: required(80),
  groups: z.object({
    paths: required(80),
    teachers: required(80),
    works: required(80),
    fields: required(80),
    pages: required(80),
  }),
  pathComingSoon: required(160),
  pages: z
    .array(
      z.object({
        label: required(120),
        description: required(300),
        href,
      }),
    )
    .min(1),
})

const mobileCtaSchema = z.object({
  label: required(120),
  pricePrefix: allowEmpty(80),
  priceSuffix: allowEmpty(80),
  registerCta: required(80),
  note: required(300),
})

const leadDialogsSchema = z.object({
  student: z.object({
    title: required(200),
    description: required(1_000),
  }),
  institution: z.object({
    title: required(200),
    description: required(1_000),
  }),
  consultation: z.object({
    title: required(200),
    description: required(1_000),
  }),
  notify: z.object({
    title: required(200),
    description: required(1_000),
  }),
})

const metadataSchema = z.object({
  siteName: required(160),
  siteUrl: httpUrl,
  areaServed: required(200),
  title: required(300),
  description: required(600),
  ogTitle: required(300),
  ogDescription: required(600),
  twitterTitle: required(300),
  twitterDescription: required(600),
  keywords: z.array(required(80)).min(1).max(40),
  category: required(80),
  image: z.object({
    url: imageSource,
    width: z.number().int().min(1).max(20_000),
    height: z.number().int().min(1).max(20_000),
    alt: required(300),
  }),
})

export const siteCopySchema = z.object({
  hero: heroSchema,
  traction: tractionSchema,
  loop: loopSchema,
  catalog: catalogSchema,
  mangsa: mangsaSchema,
  ethics: ethicsSchema,
  institution: institutionSchema,
  sections: sectionCopySchema,
  footer: footerSchema,
  navigation: z.array(navigationItemSchema).min(1).max(20),
  overlays: overlaysSchema,
  header: headerSchema,
  search: searchSchema,
  mobileCta: mobileCtaSchema,
  leadDialogs: leadDialogsSchema,
  metadata: metadataSchema,
})

export const catalogFieldSchema = z.object({
  order: order.optional(),
  name: required(200),
  region: required(160),
  status: catalogStatusSchema,
  note: required(600),
})

const learningPathSchema = z.object({
  order: order.optional(),
  slug,
  code: required(40),
  title: required(200),
  subtitle: required(300),
  teacher: required(160),
  teacherRole: required(120),
  region: required(160),
  level: required(80),
  modules: count,
  weeks: count,
  tasks: count,
  price: price.nullable(),
  priceLabel: optionalShort(120),
  image: imageSource,
  tags: z.array(required(60)).max(20),
  outcome: required(600),
  includes: z.array(required(300)).max(30),
  comingSoon: z.boolean().optional(),
})

const teacherSchema = z.object({
  order: order.optional(),
  slug,
  name: required(160),
  initials: required(8),
  specialty: required(200),
  region: required(160),
  experience: required(400),
  quote: required(1_000),
  focus: required(300),
  path: required(200),
  community: required(200),
  image: imageSource,
  verified: z.boolean(),
})

const workSchema = z.object({
  order: order.optional(),
  slug,
  title: required(200),
  category: z.enum(["batik", "layanan"]),
  kind: z.enum(["product", "service"]),
  maker: required(160),
  makerRole: required(120),
  teacher: required(160),
  region: required(160),
  price,
  priceLabel: optionalShort(120),
  unit: required(60),
  technique: required(200),
  techniqueNote: required(600),
  workCard: required(80),
  description: required(1_500),
  image: imageSource,
})

const testimonialSchema = z.object({
  order: order.optional(),
  quote: required(1_000),
  name: required(160),
  role: required(120),
  city: required(120),
  initials: required(8),
})

const faqSchema = z.object({
  order: order.optional(),
  question: required(400),
  answer: required(2_000),
})

/**
 * The full document an editor saves and a publish writes. Entities are part of
 * the revision so drafts stay isolated from the public tables.
 */
export const siteDataSchema = siteCopySchema.extend({
  catalog: catalogSchema.extend({
    fields: z.array(catalogFieldSchema).max(200),
  }),
  paths: z.array(learningPathSchema).max(200),
  teachers: z.array(teacherSchema).max(200),
  works: z.array(workSchema).max(300),
  testimonials: z.array(testimonialSchema).max(100),
  faqs: z.array(faqSchema).max(100),
})

export type ContentIssue = {
  path: string
  message: string
}

const FORBIDDEN_LABELS = ["dummy", "contoh", "prototipe", "sample", "uji coba", "maestro"]

function collectIssues(error: z.ZodError): ContentIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "root",
    message: issue.message,
  }))
}

function textOf(value: unknown): string {
  return JSON.stringify(value).toLowerCase()
}

function checkDuplicates(
  values: readonly unknown[],
  key: "slug" | "order",
  path: string,
  issues: ContentIssue[],
) {
  const seen = new Set<string | number>()
  values.forEach((value, index) => {
    const record = value as Record<string, unknown>
    const current = record[key]
    if (typeof current !== "string" && typeof current !== "number") return
    if (seen.has(current)) {
      issues.push({
        path: `${path}.${index}.${key}`,
        message:
          key === "slug"
            ? `Slug "${current}" dipakai lebih dari satu entitas.`
            : `Urutan ${current} dipakai lebih dari satu entitas.`,
      })
    }
    seen.add(current)
  })
}

/**
 * Validates a complete content document. Returns the parsed value so callers
 * store the schema output, never the raw client object.
 */
export function validateSiteData(value: unknown): {
  ok: boolean
  data: SiteData | null
  issues: ContentIssue[]
} {
  const parsed = siteDataSchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, data: null, issues: collectIssues(parsed.error) }
  }

  const data = parsed.data as SiteData
  const issues: ContentIssue[] = []

  const text = textOf(data)
  for (const label of FORBIDDEN_LABELS) {
    if (text.includes(label)) {
      issues.push({
        path: "copy",
        message: `Label "${label}" tidak boleh muncul di konten publik.`,
      })
    }
  }

  if (!data.metadata.areaServed.toLowerCase().includes("yogyakarta")) {
    issues.push({
      path: "metadata.areaServed",
      message: "Wilayah dasar harus menyebut Yogyakarta.",
    })
  }
  if (!data.metadata.areaServed.toLowerCase().includes("jawa tengah")) {
    issues.push({
      path: "metadata.areaServed",
      message: "Wilayah dasar harus menyebut Jawa Tengah.",
    })
  }
  if (/seluruh indonesia|jangkauan nasional|beroperasi di seluruh/.test(text)) {
    issues.push({
      path: "metadata.areaServed",
      message: "Jangan mengklaim jangkauan nasional.",
    })
  }

  const certificateNote = data.footer.certificateNote.toLowerCase()
  if (!certificateNote.includes("sertifikat") || !certificateNote.includes("platform")) {
    issues.push({
      path: "footer.certificateNote",
      message: "Catatan sertifikat harus menyebut sertifikat platform.",
    })
  }
  if (/tersertifikasi bnsp|akreditasi bnsp|sertifikasi resmi pemerintah/.test(text)) {
    issues.push({
      path: "footer.certificateNote",
      message: "Jangan mengklaim akreditasi pemerintah atau BNSP.",
    })
  }

  const shareTotal = data.ethics.share.reduce((total, item) => total + item.value, 0)
  if (shareTotal !== 100) {
    issues.push({
      path: "ethics.share",
      message: `Bagi hasil harus berjumlah 100 (sekarang ${shareTotal}).`,
    })
  }

  const stageCodes = data.loop.stages.map((stage) => stage.code)
  if (new Set(stageCodes).size !== stageCodes.length) {
    issues.push({ path: "loop.stages", message: "Kode tahap harus unik." })
  }

  const navHrefs = data.navigation.map((item) => item.href)
  if (new Set(navHrefs).size !== navHrefs.length) {
    issues.push({ path: "navigation", message: "Tautan navigasi harus unik." })
  }

  checkDuplicates(data.paths, "slug", "paths", issues)
  checkDuplicates(data.teachers, "slug", "teachers", issues)
  checkDuplicates(data.works, "slug", "works", issues)
  checkDuplicates(data.catalog.fields, "order", "catalog.fields", issues)

  checkDuplicates(data.paths, "order", "paths", issues)
  checkDuplicates(data.teachers, "order", "teachers", issues)
  checkDuplicates(data.works, "order", "works", issues)
  checkDuplicates(data.testimonials, "order", "testimonials", issues)
  checkDuplicates(data.faqs, "order", "faqs", issues)

  return { ok: issues.length === 0, data, issues }
}

export function validateSiteCopy(value: unknown): {
  ok: boolean
  data: SiteCopy | null
  issues: ContentIssue[]
} {
  const parsed = siteCopySchema.safeParse(value)
  if (!parsed.success) {
    return { ok: false, data: null, issues: collectIssues(parsed.error) }
  }
  return { ok: true, data: parsed.data, issues: [] }
}

/** Serialisable issue list for a client-side pre-flight. */
export function contentIssuesToMessage(issues: ContentIssue[]): string {
  if (issues.length === 0) return "Konten siap diterbitkan."
  return issues
    .slice(0, 4)
    .map((issue) => `${issue.path}: ${issue.message}`)
    .join(" ")
}
