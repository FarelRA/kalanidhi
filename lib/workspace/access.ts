import {
  can,
  canAccessRoute,
  computeCapabilities,
  deriveViewer,
  routeCapability,
} from "@/lib/access/policy"
import type { Capability, WorkspaceRole } from "@/lib/access/capabilities"
import type { Viewer, ViewerCertificate, ViewerEnrollment } from "@/lib/access/viewer"
import { SPLIT_PERCENTAGES } from "@/lib/commerce/money"
import type { PreviewKey } from "./types"

/**
 * Development-only preview profiles. They are never used when a real session
 * exists, and never in a production build without an explicit flag.
 *
 * Seller access in the preview is derived exactly like the real policy: it
 * comes from issued certificates and teacher profile paths, never from a
 * stored seller role.
 */
export type PreviewProfile = {
  key: PreviewKey | "live"
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
  cohortPathIds: string[]
  sellerStatus: "pending" | "active" | "suspended" | null
}

function courseCertificates(pathIds: string[]): ViewerCertificate[] {
  return pathIds.map((pathId, index) => ({
    id: `preview-cert-${index + 1}`,
    pathId,
    publicCode: `KN-PREVIEW-${index + 1}`,
    status: "issued",
    issuedAt: Date.now(),
  }))
}

const previewEnrollment: ViewerEnrollment[] = [
  {
    id: "preview-enrollment-1",
    pathId: "pranatacara",
    cohortId: "preview-cohort-1",
    status: "active",
  },
]

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
    roles: ["student"],
    certificates: [],
    teacherScopes: [],
    cohortPathIds: [],
    sellerStatus: null,
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
    roles: ["student"],
    certificates: ["batik-tulis-soga"],
    teacherScopes: [],
    cohortPathIds: [],
    sellerStatus: "active",
  },
  {
    key: "pengajar",
    label: "Pengajar · Penjual",
    shortLabel: "Pengajar",
    description: `Kohort, penilaian, kredensial kohort, dan pendapatan ${SPLIT_PERCENTAGES.teacher}%.`,
    user: {
      id: "u-bambang",
      name: "Bambang Hardjono",
      initials: "BH",
      email: "bambang.hardjono@kalanidhi.site",
      region: "Giriloyo, Yogyakarta",
      roleLabel: "Pengajar · Penjual",
    },
    roles: ["teacher"],
    certificates: [],
    teacherScopes: ["batik-tulis-soga"],
    cohortPathIds: ["batik-tulis-soga"],
    sellerStatus: "active",
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
    roles: ["teacher", "student"],
    certificates: ["pranatacara"],
    teacherScopes: ["batik-tulis-soga"],
    cohortPathIds: ["batik-tulis-soga"],
    sellerStatus: "active",
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
    roles: ["admin"],
    certificates: [],
    teacherScopes: [],
    cohortPathIds: [],
    sellerStatus: null,
  },
]

export function viewerForPreview(profile: PreviewProfile): Viewer {
  const viewer = deriveViewer({
    userId: profile.user.id,
    authUserId: `preview:${profile.user.id}`,
    name: profile.user.name,
    email: profile.user.email,
    initials: profile.user.initials,
    region: profile.user.region,
    roles: profile.roles,
    status: "active",
    teacherProfile:
      profile.roles.includes("teacher") && profile.teacherScopes.length > 0
        ? {
            id: `preview-teacher-${profile.user.id}`,
            status: "active",
            pathIds: profile.teacherScopes,
          }
        : null,
    sellerProfile:
      profile.sellerStatus !== null
        ? {
            id: `preview-seller-${profile.user.id}`,
            status: profile.sellerStatus,
          }
        : null,
    certificates: courseCertificates(profile.certificates),
    enrollments: profile.roles.includes("student")
      ? previewEnrollment
      : [],
    cohortPathIds: profile.cohortPathIds,
  })

  return {
    ...viewer,
    initials: profile.user.initials,
    region: profile.user.region,
    roleLabel: profile.user.roleLabel,
  }
}

export function capabilitiesFor(profile: PreviewProfile): Capability[] {
  const viewer = viewerForPreview(profile)
  return computeCapabilities({
    roles: viewer.roles,
    status: viewer.status,
    teacherProfile: viewer.teacherProfile,
    sellerProfile: viewer.sellerProfile,
    certificates: viewer.certificates,
    enrollments: viewer.enrollments,
    cohortPathIds: viewer.assessScopes,
  })
}

/** Adapts a live server viewer to the shell's profile contract. */
export function profileForViewer(viewer: Viewer): PreviewProfile {
  return {
    key: "live",
    label: viewer.roleLabel,
    shortLabel: viewer.roleLabel,
    description: viewer.entitlements.operate
      ? "Operasi platform, konten, statistik, dan tata kelola."
      : viewer.entitlements.teach
        ? "Kohort, penilaian, dan kredensial yang ditugaskan."
        : "Jalur belajar, tugas, dan kredensial.",
    user: {
      id: viewer.userId,
      name: viewer.name,
      initials: viewer.initials,
      email: viewer.email,
      region: viewer.region,
      roleLabel: viewer.roleLabel,
    },
    roles: viewer.roles,
    certificates: viewer.certificates
      .filter((certificate) => certificate.status === "issued")
      .map((certificate) => certificate.pathId),
    teacherScopes: viewer.teachScopes,
    cohortPathIds: viewer.assessScopes,
    sellerStatus: viewer.sellerProfile?.status ?? null,
  }
}

export { can, canAccessRoute, routeCapability }
export type { Capability }
