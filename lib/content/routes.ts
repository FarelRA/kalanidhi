/**
 * Public route registry. Landing copy stores legacy in-page anchors; this
 * helper maps them to real pages so no action depends on a dialog or a
 * `#`-only link.
 */
export const PUBLIC_ROUTES = {
  home: "/",
  fields: "/bidang",
  paths: "/jalur",
  teachers: "/pengajar",
  works: "/karya",
  interest: "/minat",
  consult: "/tanya",
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
  PUBLIC_ROUTES.fields,
  PUBLIC_ROUTES.paths,
  PUBLIC_ROUTES.teachers,
  PUBLIC_ROUTES.works,
  PUBLIC_ROUTES.interest,
  PUBLIC_ROUTES.consult,
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
  "#indeks": `${PUBLIC_ROUTES.home}#indeks`,
  "#jalur": PUBLIC_ROUTES.paths,
  "#pengajar": PUBLIC_ROUTES.teachers,
  "#karya": PUBLIC_ROUTES.works,
  "#etika": PUBLIC_ROUTES.ethics,
  "#institusi": PUBLIC_ROUTES.institution,
  "#faq": PUBLIC_ROUTES.faq,
  "#mangsa": PUBLIC_ROUTES.mangsa,
}

export function publicHref(href: string): string {
  return LEGACY_ANCHOR_ROUTES[href] ?? href
}

/** Real route for the loop section on the about page. */
export const ABOUT_LOOP_HREF = `${PUBLIC_ROUTES.about}#lingkaran`

export type InterestLinkInput = {
  path?: string
  teacher?: string
  work?: string
  intent?: "student" | "institution" | "consultation" | "notify"
  interest?: string
}

function withInterestParams(
  route: string,
  input: InterestLinkInput,
): string {
  const params = new URLSearchParams()
  if (input.path) params.set("path", input.path)
  if (input.teacher) params.set("teacher", input.teacher)
  if (input.work) params.set("work", input.work)
  if (input.intent) params.set("intent", input.intent)
  if (input.interest) params.set("interest", input.interest)
  const query = params.toString()
  return query ? `${route}?${query}` : route
}

/**
 * Builds a real interest URL. `/minat` is a smart router: it sends student
 * intent straight to checkout and everything else to the consultation page.
 */
export function interestHref(input: InterestLinkInput = {}): string {
  return withInterestParams(PUBLIC_ROUTES.interest, input)
}

/** Builds a consultation/lead-form URL. */
export function consultHref(input: InterestLinkInput = {}): string {
  return withInterestParams(PUBLIC_ROUTES.consult, input)
}

/** Checkout URL for a learning path. */
export function enrollHref(pathSlug: string): string {
  return `/pesan/jalur/${pathSlug}`
}

/** Checkout URL for a work. */
export function buyHref(workSlug: string): string {
  return `/pesan/${workSlug}`
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

/** Catalog field filter on the paths index. */
export function fieldHref(name: string): string {
  return `${PUBLIC_ROUTES.paths}?bidang=${encodeURIComponent(name)}`
}
