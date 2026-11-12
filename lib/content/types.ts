/** Public counts computed from Convex tables, never editorial numbers. */
export const TRACTION_METRICS = [
  "fields",
  "teachers",
  "participants",
  "submissions",
  "works",
] as const

export type TractionMetricKey = (typeof TRACTION_METRICS)[number]

export type PublicStats = Record<TractionMetricKey, number>

export type TractionFigure = {
  metric: TractionMetricKey
  label: string
}

export type LoopStage = {
  code: string
  title: string
  description: string
}

export type CatalogStatus = "Terbuka" | "Sedang dipetakan" | "Direncanakan"

export type CatalogField = {
  name: string
  region: string
  status: CatalogStatus
  note: string
}

export type LearningPath = {
  slug: string
  code: string
  title: string
  subtitle: string
  /** Linked teacher name, or `UNLINKED_TEACHER_LABEL` when none is linked. */
  teacher: string
  /** Linked teacher specialty. Empty when no teacher row is linked. */
  teacherRole: string
  /** Linked teacher account, when the path is assigned to one. */
  teacherId?: string
  /** Source row timestamp, used for sitemap freshness. */
  updatedAt?: number
  region: string
  level: string
  modules: number
  weeks: number
  tasks: number
  price: number | null
  priceLabel?: string
  image: string
  tags: string[]
  outcome: string
  includes: string[]
  comingSoon?: boolean
}

export type Teacher = {
  slug: string
  name: string
  initials: string
  specialty: string
  region: string
  experience: string
  quote: string
  focus: string
  path: string
  community: string
  image: string
  verified: boolean
  /** Source row timestamp, used for sitemap freshness. */
  updatedAt?: number
}

export type Work = {
  slug: string
  title: string
  category: "batik" | "layanan"
  kind: "product" | "service"
  maker: string
  makerRole: string
  teacher: string
  region: string
  price: number
  priceLabel?: string
  unit: string
  technique: string
  techniqueNote: string
  /** Serial from the linked `workCards` row. */
  workCard: string
  /** Permission note from the linked `workCards` row. */
  permission?: string
  /** Provenance from the linked `workCards` row. */
  provenance?: string
  /** Materials from the linked `workCards` row. */
  materials?: string
  /** Serial of the certificate backing the work card. */
  certificateSerial?: string
  /** Learning path slug the work belongs to. */
  pathSlug?: string
  description: string
  image: string
}

export type Faq = {
  question: string
  answer: string
}

export type PublicLessonSummary = {
  title: string
  kind: "text" | "video" | "audio" | "file" | "practice"
  estimatedMinutes: number
  accessLevel: "public" | "enrolled" | "certified"
}

export type PublicModuleSummary = {
  title: string
  summary: string
  estimatedMinutes: number
  lessons: PublicLessonSummary[]
}

export type PublicCohortSummary = {
  code: string
  title: string
  startDate: number
  endDate: number
  capacity: number
  timezone: string
  status: "draft" | "enrolling" | "active" | "completed" | "cancelled"
}

/** A path detail read directly from Convex, including its curriculum. */
export type PublicPathDetail = LearningPath & {
  lessons: number
  curriculum: PublicModuleSummary[]
  cohorts: PublicCohortSummary[]
}

export type PublicTeacherPath = {
  slug: string
  code: string
  title: string
  level: string
  region: string
  price: number | null
  priceLabel?: string
  comingSoon?: boolean
}

export type PublicTeacherWork = {
  slug: string
  title: string
  kind: "product" | "service"
  price: number
  priceLabel?: string
  image: string
}

/** A teacher detail read directly from Convex plus their paths and works. */
export type PublicTeacherDetail = Teacher & {
  paths: PublicTeacherPath[]
  works: PublicTeacherWork[]
}

export type Testimonial = {
  quote: string
  name: string
  role: string
  city: string
  initials: string
}

export type HeroContent = {
  title: string[]
  description: string
  primaryCta: string
  secondaryCta: string
  plate: {
    image: string
    alt: string
    caption: string
    note: string
  }
  /** Editorial label only. Serial, work, maker, and teacher come from Convex. */
  workCard: {
    title: string
  }
}

/** Resolved from the selected work and its linked work card, maker, and teacher. */
export type HeroWorkCard = {
  slug: string
  serial: string
  work: string
  maker: string
  teacher: string
}

export type TractionContent = {
  label: string
  note: string
  figures: TractionFigure[]
}

/** Editorial traction copy with values resolved from Convex counts. */
export type TractionView = {
  label: string
  note: string
  figures: (TractionFigure & { value: string })[]
}

export type LoopContent = {
  label: string
  title: string
  description: string
  returnLabel: string
  returnNote: string
  /** Honest caveat under the return step, editable by the admin. */
  returnCaveat: string
  stages: LoopStage[]
  diagram: {
    title: string
    description: string
  }
}

export type CatalogGroup = {
  status: CatalogStatus
  title: string
  blurb: string
}

export type CatalogContent = {
  label: string
  title: string
  description: string
  cta: string
  groups: CatalogGroup[]
}

export type MangsaContent = {
  label: string
  season: string
  name: string
  period: string
  eyebrow: string
  title: string
  description: string
  activities: string[]
  activityLabel: string
  provenance: string
}

/**
 * A cultural permission record as shown on public pages. Reads the real
 * `culturalSources` table; no seed attribution strings are rendered.
 */
export type PublicCulturalSource = {
  community: string
  sourceName: string
  pathSlug: string | null
  workSlug: string | null
  permissionReference: string
  permissionDate: number
  permissionStatus: "pending" | "granted" | "withdrawn"
  accessLevel: "public" | "community" | "restricted"
  attribution: string
  notes: string | null
}

export type EthicsContent = {
  label: string
  title: string
  description: string
  principles: {
    title: string
    description: string
  }[]
  accessLevels: {
    label: string
    note: string
  }[]
  share: {
    label: string
    value: number
    note: string
  }[]
  shareTitle: string
  shareNote: string
  shareAriaLabel: string
  card: {
    sourceTitle: string
    permissionLabel: string
    referenceLabel: string
    /** Honest state when `culturalSources` has no public rows. */
    emptyState: string
  }
}

export type InstitutionContent = {
  label: string
  title: string
  description: string
  segments: string[]
  points: string[]
  brief: [string, string][]
  cta: string
  note: string
  summaryLabel: string
  summaryTitle: string
  year: string
}

export type FooterLink = {
  label: string
  href: string
}

export type FooterColumn = {
  title: string
  links: FooterLink[]
}

export type FooterContent = {
  description: string
  columns: FooterColumn[]
  secretariat: {
    label: string
    value: string
  }
  edition: string
  copyright: string
  sourceLabel: string
  sourceDescription: string
  sourcesLabel: string
  cultureLabel: string
  culturePolicyCta: string
  certificateNote: string
  preferencesLabel: string
  languageLabel: string
  dataSaverLabel: string
  privacyLabel: string
  termsLabel: string
  backToTopLabel: string
  newsletter: {
    label: string
    placeholder: string
    cta: string
    pending: string
    note: string
    errorNote: string
    interest: string
    source: string
  }
}

export type NavigationItem = {
  label: string
  href: string
}

export type SectionCopy = {
  paths: {
    label: string
    title: string
    description: string
    detailCta: string
    openCta: string
    plannedCta: string
    priceLabel: string
    statusLabel: string
    contentLabel: string
    includesLabel: string
    curriculumPending: string
    teacherLabel: string
    regionLabel: string
    levelLabel: string
    emptyState: string
  }
  teachers: {
    label: string
    title: string
    description: string
    profileCta: string
    dialogLabel: string
    askCta: string
    emptyState: string
  }
  works: {
    label: string
    title: string
    description: string
    featuredLabel: string
    serviceLabel: string
    priceLabel: string
    askCta: string
    openCta: string
    cardLabel: string
    makerLabel: string
    teacherLabel: string
    techniqueLabel: string
    regionLabel: string
    emptyState: string
  }
  notes: {
    label: string
    title: string
    description: string
    emptyState: string
  }
  faq: {
    label: string
    title: string
    description: string
    policyCta: string
    askCta: string
    askInterest: string
    emptyState: string
  }
  closing: {
    label: string
    title: string
    description: string
    primaryCta: string
    secondaryCta: string
    noteSuffix: string
  }
}

export type HeaderCopy = {
  brandAria: string
  mainNavAria: string
  mobileNavAria: string
  searchAria: string
  searchLabel: string
  menuAria: string
  loginCta: string
  registerCta: string
  mobileSearch: string
  mobileRegisterCta: string
  sheetTitle: string
  sheetDescription: string
  region: string
  /** Breadcrumb label for the home route. */
  homeLabel: string
}

export type SearchPage = {
  label: string
  description: string
  href: string
}

export type SearchCopy = {
  title: string
  description: string
  placeholder: string
  emptyPrefix: string
  emptySuffix: string
  footerLabel: string
  escLabel: string
  closeLabel: string
  groups: {
    paths: string
    teachers: string
    works: string
    fields: string
    pages: string
  }
  pathComingSoon: string
  pages: SearchPage[]
}

export type MobileCtaCopy = {
  label: string
  pricePrefix: string
  priceSuffix: string
  registerCta: string
  note: string
}

export type LeadVariant = "student" | "institution" | "consultation" | "notify"

export type LeadRequest = {
  variant: LeadVariant
  interest?: string
}

export type InfoKey =
  | "policy"
  | "login"
  | "mangsa"
  | "verify"
  | "about"
  | "privacy"
  | "terms"

export type InfoContent = {
  icon: "policy" | "login" | "calendar" | "verify" | "about" | "privacy" | "terms"
  title: string
  description: string
  bullets?: string[]
  footnote?: string
  action?: {
    label: string
    lead: LeadRequest
  }
}

export type Overlays = Record<InfoKey, InfoContent>

export type LeadDialogCopy = Record<
  LeadVariant,
  {
    title: string
    description: string
  }
>

export type SeoOverride = {
  route: string
  title: string
  description: string
  ogTitle: string | null
  ogDescription: string | null
  canonical: string | null
  keywords: string[] | null
  robots: string | null
  updatedAt: number
}

export type SiteMetadata = {
  siteName: string
  siteUrl: string
  areaServed: string
  title: string
  description: string
  ogTitle: string
  ogDescription: string
  twitterTitle: string
  twitterDescription: string
  keywords: string[]
  category: string
  image: {
    url: string
    width: number
    height: number
    alt: string
  }
}

export type SiteCopy = {
  hero: HeroContent
  traction: TractionContent
  loop: LoopContent
  catalog: CatalogContent
  mangsa: MangsaContent
  ethics: EthicsContent
  institution: InstitutionContent
  sections: SectionCopy
  footer: FooterContent
  navigation: NavigationItem[]
  overlays: Overlays
  header: HeaderCopy
  search: SearchCopy
  mobileCta: MobileCtaCopy
  leadDialogs: LeadDialogCopy
  metadata: SiteMetadata
}

/** Every node the admin can choose to show on the landing page. */
export type FeaturedSelection = {
  pathSlugs: string[]
  teacherSlugs: string[]
  workSlugs: string[]
  testimonialIds: string[]
  /** Catalog fields are keyed by their stable name. */
  catalogFieldKeys: string[]
  /** FAQ rows are keyed by their database id. */
  faqKeys: string[]
  heroWorkSlug: string | null
}

/**
 * The document the Content editor writes and a revision stores. It contains
 * editorial copy plus the landing selection only; entity data never lives here.
 */
export type ContentDocument = SiteCopy & {
  featured: FeaturedSelection
}

/** The resolved public landing payload. Entities are read from their tables. */
export type SiteData = Omit<SiteCopy, "traction"> & {
  /** Editorial labels with values computed from Convex counts. */
  traction: TractionView
  catalog: CatalogContent & {
    fields: CatalogField[]
  }
  heroWorkCard: HeroWorkCard | null
  paths: LearningPath[]
  teachers: Teacher[]
  works: Work[]
  testimonials: Testimonial[]
  faqs: Faq[]
  culturalSources: PublicCulturalSource[]
}
