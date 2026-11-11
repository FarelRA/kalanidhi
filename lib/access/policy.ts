import {
  ADMIN_FORBIDDEN_CAPABILITIES,
  type Capability,
  type WorkspaceRole,
} from "./capabilities"
import {
  initialsFor,
  type Viewer,
  type ViewerEntitlements,
  type ViewerSeed,
} from "./viewer"

type AccessInput = Pick<
  ViewerSeed,
  | "roles"
  | "status"
  | "teacherProfile"
  | "sellerProfile"
  | "certificates"
  | "enrollments"
  | "cohortPathIds"
>

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

/**
 * Derives entitlements from stored roles and earned records.
 *
 * Stored roles are additive. Seller is never stored as a role: it comes from
 * an active teacher profile or an issued certificate, and is path scoped.
 */
export function deriveEntitlements(input: AccessInput): ViewerEntitlements {
  const active = (input.status ?? "active") === "active"
  const roles = new Set(input.roles)
  const isAdmin = roles.has("admin")

  // Separation of duties: an admin account never grades, submits, learns, or
  // sells, even if another role is attached.
  const teacherProfile = input.teacherProfile ?? null
  const teach =
    active &&
    !isAdmin &&
    roles.has("teacher") &&
    teacherProfile?.status === "active"

  const assessScopes = teach ? unique(input.cohortPathIds ?? []) : []
  const assess = teach && assessScopes.length > 0

  const enrolled = (input.enrollments ?? []).some(
    (item) => item.status === "active" || item.status === "completed",
  )
  const learn = active && !isAdmin && (roles.has("student") || enrolled)

  const certificateScopes = (input.certificates ?? [])
    .filter((certificate) => certificate.status === "issued")
    .map((certificate) => certificate.pathId)

  const teachScopes = teach ? unique(teacherProfile?.pathIds ?? []) : []
  const sellScopes = unique([...teachScopes, ...certificateScopes])
  const sell = active && !isAdmin && sellScopes.length > 0
  const sellActive = sell && input.sellerProfile?.status === "active"

  return {
    learn,
    teach: Boolean(teach),
    assess,
    sell,
    sellActive,
    buy: active,
    operate: active && isAdmin,
  }
}

function baseCapabilities(entitlements: ViewerEntitlements): Capability[] {
  const capabilities = new Set<Capability>()

  if (entitlements.buy) {
    capabilities.add("buy")
    capabilities.add("orders.buy")
    capabilities.add("orders.read.own")
    capabilities.add("messages.read.own")
    capabilities.add("support.request")
  }

  if (entitlements.learn) {
    capabilities.add("learn")
    capabilities.add("submissions.submit")
    capabilities.add("certificates.read.own")
    capabilities.add("works.own")
    capabilities.add("calls.start")
    capabilities.add("schedule.read.own")
  }

  if (entitlements.teach) {
    capabilities.add("teach")
    capabilities.add("stats.teach")
    capabilities.add("schedule.manage")
    capabilities.add("works.review")
    capabilities.add("certificates.read.cohort")
    capabilities.add("calls.start")
    capabilities.add("messages.read.own")
  }

  if (entitlements.assess) {
    capabilities.add("assess")
    capabilities.add("submissions.grade")
  }

  if (entitlements.sellActive) {
    capabilities.add("sell")
    capabilities.add("orders.sell")
    capabilities.add("payouts.view.own")
    capabilities.add("works.own")
  }

  if (entitlements.operate) {
    const operator: Capability[] = [
      "operate",
      "orders.read.all",
      "people.read",
      "people.manage",
      "content.publish",
      "stats.read",
      "payments.manage",
      "payouts.release",
      "leads.read",
      "leads.write",
      "logs.read",
      "flows.manage",
      "support.manage",
      "governance.manage",
      "settings.platform",
      "works.moderate",
      "messages.read.own",
      "messages.moderate",
      "calls.monitor",
      "schedule.read.all",
      "certificates.manage",
      "certificates.revoke",
      "submissions.escalate",
    ]
    operator.forEach((capability) => capabilities.add(capability))
  }

  for (const capability of ADMIN_FORBIDDEN_CAPABILITIES) {
    if (entitlements.operate) capabilities.delete(capability)
  }

  return Array.from(capabilities)
}

export function computeCapabilities(input: AccessInput): Capability[] {
  return baseCapabilities(deriveEntitlements(input))
}

export function roleLabelFor(input: {
  roles: WorkspaceRole[]
  entitlements: ViewerEntitlements
}): string {
  if (input.entitlements.operate) return "Pengelola"

  const parts: string[] = []
  if (input.roles.includes("teacher")) parts.push("Pengajar")
  if (input.roles.includes("student")) parts.push("Peserta")
  if (input.entitlements.sellActive) parts.push("Penjual")
  return parts.length > 0 ? parts.join(" · ") : "Tanpa peran"
}

/** Builds the complete viewer contract from stored records. */
export function deriveViewer(seed: ViewerSeed): Viewer {
  const entitlements = deriveEntitlements(seed)
  const capabilities = computeCapabilities(seed)
  const teacherProfile = seed.teacherProfile ?? null
  const teachScopes =
    entitlements.teach && teacherProfile ? unique(teacherProfile.pathIds) : []
  const assessScopes = entitlements.assess
    ? unique(seed.cohortPathIds ?? [])
    : []
  const certificateScopes = (seed.certificates ?? [])
    .filter((certificate) => certificate.status === "issued")
    .map((certificate) => certificate.pathId)
  const sellScopes = unique([...teachScopes, ...certificateScopes])

  return {
    userId: seed.userId,
    authUserId: seed.authUserId ?? seed.userId,
    name: seed.name,
    email: seed.email,
    whatsapp: seed.whatsapp,
    initials: seed.initials ?? initialsFor(seed.name),
    region: seed.region ?? "",
    image: seed.image,
    roles: seed.roles,
    status: seed.status ?? "active",
    capabilities,
    entitlements,
    roleLabel: roleLabelFor({ roles: seed.roles, entitlements }),
    teacherProfile,
    sellerProfile: seed.sellerProfile ?? null,
    certificates: seed.certificates ?? [],
    enrollments: seed.enrollments ?? [],
    teachScopes,
    assessScopes,
    sellScopes,
  }
}

export const ROUTE_CAPABILITIES: { path: string; anyOf: Capability[] }[] = [
  { path: "/ruang", anyOf: [] },
  { path: "/ruang/belajar", anyOf: ["learn", "teach", "operate"] },
  {
    path: "/ruang/tugas",
    anyOf: ["submissions.submit", "submissions.grade", "submissions.escalate"],
  },
  {
    path: "/ruang/kredensial",
    anyOf: [
      "certificates.read.own",
      "certificates.read.cohort",
      "certificates.manage",
    ],
  },
  {
    path: "/ruang/karya",
    anyOf: ["works.own", "works.review", "works.moderate", "operate"],
  },
  { path: "/ruang/pesanan/pembayaran", anyOf: ["payments.manage"] },
  {
    path: "/ruang/pesanan/payout",
    anyOf: ["payouts.view.own", "payouts.release"],
  },
  {
    path: "/ruang/pesanan",
    anyOf: ["orders.read.own", "orders.sell", "orders.read.all"],
  },
  {
    path: "/ruang/pesan",
    anyOf: ["messages.read.own", "messages.moderate"],
  },
  { path: "/ruang/panggilan", anyOf: ["calls.start", "calls.monitor"] },
  {
    path: "/ruang/jadwal",
    anyOf: ["schedule.read.own", "schedule.manage", "schedule.read.all"],
  },
  { path: "/ruang/prospek", anyOf: ["leads.read", "leads.write"] },
  { path: "/ruang/orang", anyOf: ["people.read"] },
  { path: "/ruang/konten", anyOf: ["content.publish"] },
  { path: "/ruang/statistik", anyOf: ["stats.read", "stats.teach"] },
  { path: "/ruang/alur", anyOf: ["flows.manage"] },
  { path: "/ruang/log", anyOf: ["logs.read"] },
  { path: "/ruang/dukungan", anyOf: ["support.request", "support.manage"] },
  { path: "/ruang/pengaturan", anyOf: [] },
]

export function routeCapability(pathname: string): Capability[] {
  const match = [...ROUTE_CAPABILITIES]
    .sort((a, b) => b.path.length - a.path.length)
    .find(
      (entry) =>
        pathname === entry.path || pathname.startsWith(`${entry.path}/`),
    )

  return match?.anyOf ?? []
}

export function canAccessRoute(
  capabilities: Capability[],
  pathname: string,
): boolean {
  const required = routeCapability(pathname)
  if (required.length === 0) return true
  return required.some((capability) => capabilities.includes(capability))
}

export function can(
  capabilities: Capability[],
  capability: Capability,
): boolean {
  return capabilities.includes(capability)
}
