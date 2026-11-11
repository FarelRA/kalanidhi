import type { Capability, PreviewKey, WorkspaceRole } from "./types"

export type PreviewProfile = {
  key: PreviewKey
  label: string
  shortLabel: string
  description: string
  user: {
    id: string
    name: string
    initials: string
    email: string
    region: string
    roleLabel: string
  }
  roles: WorkspaceRole[]
  certificates: string[]
  teacherScopes: string[]
}

export const previewProfiles: PreviewProfile[] = [
  {
    key: "peserta",
    label: "Peserta",
    shortLabel: "Peserta",
    description: "Jalur belajar, tugas, kredensial, jadwal, dan pesan.",
    user: {
      id: "u-anisa",
      name: "Anisa Rahmawati",
      initials: "AR",
      email: "anisa.rahmawati@kalanidhi.site",
      region: "Giriloyo, Yogyakarta",
      roleLabel: "Peserta",
    },
    roles: ["peserta"],
    certificates: [],
    teacherScopes: [],
  },
  {
    key: "peserta-penjual",
    label: "Peserta · Penjual",
    shortLabel: "Peserta penjual",
    description: "Peserta bersertifikat: membuka karya, pesanan, dan pendapatan.",
    user: {
      id: "u-anisa-seller",
      name: "Anisa Rahmawati",
      initials: "AR",
      email: "anisa.rahmawati@kalanidhi.site",
      region: "Giriloyo, Yogyakarta",
      roleLabel: "Peserta · Penjual",
    },
    roles: ["peserta"],
    certificates: ["cert-anisa-01"],
    teacherScopes: [],
  },
  {
    key: "pengajar",
    label: "Pengajar · Penjual",
    shortLabel: "Pengajar",
    description: "Kohort, penilaian, kredensial kohort, dan pendapatan 70%.",
    user: {
      id: "u-bambang",
      name: "Bambang Hardjono",
      initials: "BH",
      email: "bambang.hardjono@kalanidhi.site",
      region: "Giriloyo, Yogyakarta",
      roleLabel: "Pengajar · Penjual",
    },
    roles: ["pengajar"],
    certificates: [],
    teacherScopes: ["batik-tulis-soga"],
  },
  {
    key: "pengajar-peserta",
    label: "Pengajar & peserta",
    shortLabel: "Pengajar & peserta",
    description: "Satu akun dengan dua peran: mengajar batik, belajar pranatacara.",
    user: {
      id: "u-sri-teach",
      name: "Sri Sriningsih",
      initials: "SS",
      email: "sri.sriningsih@kalanidhi.site",
      region: "Lasem, Jawa Tengah",
      roleLabel: "Pengajar · Peserta · Penjual",
    },
    roles: ["pengajar", "peserta"],
    certificates: ["cert-sri-02"],
    teacherScopes: ["batik-tulis-soga"],
  },
  {
    key: "pengelola",
    label: "Pengelola",
    shortLabel: "Pengelola",
    description: "Semua data, konten, statistik, alur, log, dan dukungan.",
    user: {
      id: "u-nadia",
      name: "Nadia Kusuma",
      initials: "NK",
      email: "nadia.kusuma@kalanidhi.site",
      region: "Yogyakarta",
      roleLabel: "Pengelola",
    },
    roles: ["pengelola"],
    certificates: [],
    teacherScopes: [],
  },
]

const learnerCapabilities: Capability[] = [
  "learn",
  "submissions.submit",
  "certificates.read.own",
  "orders.buy",
  "works.own",
  "messages.read.own",
  "calls.start",
  "schedule.read.own",
  "support.request",
]

const teacherCapabilities: Capability[] = [
  "teach",
  "assess",
  "submissions.grade",
  "certificates.read.cohort",
  "orders.sell",
  "works.review",
  "payouts.view.own",
  "schedule.manage",
  "stats.teach",
  "messages.read.own",
  "calls.start",
  "support.request",
]

const operatorCapabilities: Capability[] = [
  "operate",
  "people.read",
  "people.manage",
  "content.publish",
  "stats.read",
  "payments.manage",
  "payouts.release",
  "leads.manage",
  "logs.read",
  "flows.manage",
  "support.manage",
  "governance.manage",
  "settings.platform",
  "orders.read.all",
  "works.moderate",
  "messages.read.own",
  "messages.moderate",
  "calls.monitor",
  "schedule.read.all",
  "certificates.manage",
  "submissions.escalate",
]

const sellerCapabilities: Capability[] = [
  "sell",
  "orders.sell",
  "payouts.view.own",
]

export function capabilitiesFor(profile: PreviewProfile): Capability[] {
  const capabilities = new Set<Capability>()

  for (const role of profile.roles) {
    if (role === "peserta") {
      learnerCapabilities.forEach((item) => capabilities.add(item))
    }
    if (role === "pengajar") {
      teacherCapabilities.forEach((item) => capabilities.add(item))
    }
    if (role === "pengelola") {
      operatorCapabilities.forEach((item) => capabilities.add(item))
    }
  }

  const sells =
    profile.teacherScopes.length > 0 || profile.certificates.length > 0
  if (sells && (profile.roles.includes("peserta") || profile.roles.includes("pengajar"))) {
    sellerCapabilities.forEach((item) => capabilities.add(item))
  }

  return Array.from(capabilities)
}

export function can(
  capabilities: Capability[],
  capability: Capability,
): boolean {
  return capabilities.includes(capability)
}

const routeCapabilities: { path: string; anyOf: Capability[] }[] = [
  { path: "/ruang", anyOf: [] },
  {
    path: "/ruang/belajar",
    anyOf: ["learn", "teach", "operate"],
  },
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
  {
    path: "/ruang/pesanan/pembayaran",
    anyOf: ["payments.manage"],
  },
  {
    path: "/ruang/pesanan/payout",
    anyOf: ["payouts.view.own", "payouts.release"],
  },
  {
    path: "/ruang/pesanan",
    anyOf: ["orders.buy", "orders.sell", "orders.read.all"],
  },
  {
    path: "/ruang/pesan",
    anyOf: ["messages.read.own", "messages.moderate"],
  },
  {
    path: "/ruang/panggilan",
    anyOf: ["calls.start", "calls.monitor"],
  },
  {
    path: "/ruang/jadwal",
    anyOf: ["schedule.read.own", "schedule.manage", "schedule.read.all"],
  },
  { path: "/ruang/prospek", anyOf: ["leads.manage"] },
  { path: "/ruang/orang", anyOf: ["people.read"] },
  { path: "/ruang/konten", anyOf: ["content.publish"] },
  { path: "/ruang/statistik", anyOf: ["stats.read", "stats.teach"] },
  { path: "/ruang/alur", anyOf: ["flows.manage"] },
  { path: "/ruang/log", anyOf: ["logs.read"] },
  {
    path: "/ruang/dukungan",
    anyOf: ["support.request", "support.manage"],
  },
  { path: "/ruang/pengaturan", anyOf: [] },
]

export function routeCapability(pathname: string): Capability[] {
  const match = [...routeCapabilities]
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

export function roleLabelFor(profile: PreviewProfile): string {
  return profile.user.roleLabel
}
