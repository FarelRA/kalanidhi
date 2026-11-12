/**
 * Public route registry. Landing copy stores legacy in-page anchors; this
 * helper maps them to real pages so no action depends on a dialog or a
 * `#`-only link.
 */
export const PUBLIC_ROUTES = {
  home: "/",
  paths: "/jalur",
  teachers: "/pengajar",
  works: "/karya",
  interest: "/minat",
  verify: "/verifikasi",
  about: "/tentang",
  ethics: "/etika",
  privacy: "/privasi",
  terms: "/ketentuan",
  faq: "/faq",
  institution: "/institusi",
  mangsa: "/mangsa",
  signIn: "/masuk",
  signUp: "/daftar",
  workspace: "/ruang",
  learning: "/ruang/belajar",
} as const

/** Static pages that must exist for header, footer, and policy links. */
export const PUBLIC_STATIC_ROUTES = [
  PUBLIC_ROUTES.home,
  PUBLIC_ROUTES.paths,
  PUBLIC_ROUTES.teachers,
  PUBLIC_ROUTES.works,
  PUBLIC_ROUTES.interest,
  PUBLIC_ROUTES.verify,
  PUBLIC_ROUTES.about,
  PUBLIC_ROUTES.ethics,
  PUBLIC_ROUTES.privacy,
  PUBLIC_ROUTES.terms,
  PUBLIC_ROUTES.faq,
  PUBLIC_ROUTES.institution,
  PUBLIC_ROUTES.mangsa,
  PUBLIC_ROUTES.signIn,
  PUBLIC_ROUTES.signUp,
] as const

/**
 * Convex copy still carries the original one-page anchor targets. Resolve them
 * to the page that now owns that content.
 */
const LEGACY_ANCHOR_ROUTES: Record<string, string> = {
  "#top": PUBLIC_ROUTES.home,
  "#lingkaran": `${PUBLIC_ROUTES.about}#lingkaran`,
  "#indeks": PUBLIC_ROUTES.paths,
  "#jalur": PUBLIC_ROUTES.paths,
  "#pengajar": PUBLIC_ROUTES.teachers,
  "#karya": PUBLIC_ROUTES.works,
  "#etika": PUBLIC_ROUTES.ethics,
  "#institusi": PUBLIC_ROUTES.institution,
  "#faq": PUBLIC_ROUTES.faq,
  "#mangsa": PUBLIC_ROUTES.mangsa,
}

const FOOTER_LABEL_ROUTES: Record<string, string> = {
  "Tentang KalaNidhi Digital": PUBLIC_ROUTES.about,
  "Etika dan hak budaya": PUBLIC_ROUTES.ethics,
  "Untuk institusi": PUBLIC_ROUTES.institution,
  "Pertanyaan umum": PUBLIC_ROUTES.faq,
  "Kebijakan privasi": PUBLIC_ROUTES.privacy,
  "Ketentuan layanan": PUBLIC_ROUTES.terms,
}

export function publicHref(href: string): string {
  return LEGACY_ANCHOR_ROUTES[href] ?? href
}

export function footerHref(label: string, href: string): string {
  return FOOTER_LABEL_ROUTES[label] ?? publicHref(href)
}

export type InterestLinkInput = {
  path?: string
  teacher?: string
  work?: string
  intent?: "student" | "institution" | "consultation" | "notify"
  interest?: string
}

/** Builds a real lead-form URL instead of opening a generic dialog. */
export function interestHref(input: InterestLinkInput = {}): string {
  const params = new URLSearchParams()
  if (input.path) params.set("path", input.path)
  if (input.teacher) params.set("teacher", input.teacher)
  if (input.work) params.set("work", input.work)
  if (input.intent) params.set("intent", input.intent)
  if (input.interest) params.set("interest", input.interest)
  const query = params.toString()
  return query ? `${PUBLIC_ROUTES.interest}?${query}` : PUBLIC_ROUTES.interest
}

export function pathHref(slug: string): string {
  return `${PUBLIC_ROUTES.paths}/${slug}`
}

export function teacherHref(slug: string): string {
  return `${PUBLIC_ROUTES.teachers}/${slug}`
}

export function workHref(slug: string): string {
  return `${PUBLIC_ROUTES.works}/${slug}`
}

export function verifyHref(code: string): string {
  return `${PUBLIC_ROUTES.verify}/${encodeURIComponent(code)}`
}
