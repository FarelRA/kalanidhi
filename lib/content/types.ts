export type Metric = {
  value: string
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
  teacher: string
  teacherRole: string
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
  workCard: string
  description: string
  image: string
}

export type Faq = {
  question: string
  answer: string
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
  workCard: {
    title: string
    serial: string
    work: string
    maker: string
    teacher: string
  }
}

export type TractionContent = {
  label: string
  note: string
  figures: Metric[]
}

export type LoopContent = {
  label: string
  title: string
  description: string
  returnLabel: string
  returnNote: string
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
  }
  attribution: {
    permission: string
    access: string
    reference: string
    sources: {
      initials: string
      name: string
      field: string
    }[]
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
  }
  teachers: {
    label: string
    title: string
    description: string
    profileCta: string
    dialogLabel: string
    askCta: string
  }
  works: {
    label: string
    title: string
    description: string
    featuredLabel: string
    serviceLabel: string
    priceLabel: string
    askCta: string
  }
  notes: {
    label: string
    title: string
    description: string
  }
  faq: {
    label: string
    title: string
    description: string
    policyCta: string
    askCta: string
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

export type SiteData = SiteCopy & {
  catalog: CatalogContent & {
    fields: CatalogField[]
  }
  paths: LearningPath[]
  teachers: Teacher[]
  works: Work[]
  testimonials: Testimonial[]
  faqs: Faq[]
}
