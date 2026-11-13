import { canAccessRoute } from "@/lib/access/policy"
import type { Capability } from "@/lib/access/capabilities"
import type { Viewer } from "@/lib/access/viewer"

/** The shell's profile contract, derived from the real session viewer. */
export type WorkspaceProfile = {
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
  roles: Viewer["roles"]
  certificates: string[]
  teacherScopes: string[]
  cohortPathIds: string[]
  sellerStatus: "pending" | "active" | "suspended" | null
}

/** Adapts a live server viewer to the shell's profile contract. */
export function profileForViewer(viewer: Viewer): WorkspaceProfile {
  return {
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

export { canAccessRoute }
export type { Capability }
