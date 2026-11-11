import { deriveViewer } from "@/lib/access/policy"
import type { Viewer, ViewerSeed } from "@/lib/access/viewer"
import type { WorkspaceRole } from "@/lib/access/capabilities"

/**
 * Test helper for constructing a viewer with roles, earned certificates,
 * teacher scopes, and account status without touching a database.
 */
export function makeViewer(
  overrides: Partial<ViewerSeed> & { roles?: WorkspaceRole[] } = {},
): Viewer {
  const seed: ViewerSeed = {
    userId: "u-test",
    authUserId: "auth-test",
    name: "Test Account",
    email: "test@example.test",
    initials: "TA",
    region: "Yogyakarta",
    roles: ["student"],
    status: "active",
    teacherProfile: null,
    sellerProfile: null,
    certificates: [],
    enrollments: [],
    cohortPathIds: [],
    ...overrides,
  }
  return deriveViewer(seed)
}

export function issuedCertificate(pathId: string) {
  return {
    id: `cert-${pathId}`,
    pathId,
    publicCode: `KN-${pathId}`,
    status: "issued" as const,
    issuedAt: 1_760_000_000_000,
  }
}

export const studentViewer = () =>
  makeViewer({
    userId: "u-student",
    name: "Anisa Rahmawati",
    roles: ["student"],
    enrollments: [
      {
        id: "e-1",
        pathId: "pranatacara",
        cohortId: "c-1",
        status: "active",
      },
    ],
  })

export const teacherViewer = () =>
  makeViewer({
    userId: "u-teacher",
    name: "Bambang Hardjono",
    roles: ["teacher"],
    teacherProfile: {
      id: "t-1",
      status: "active",
      pathIds: ["batik-tulis-soga"],
    },
    cohortPathIds: ["batik-tulis-soga"],
    sellerProfile: { id: "s-1", status: "active" },
  })

export const adminViewer = () =>
  makeViewer({
    userId: "u-admin",
    name: "Nadia Kusuma",
    roles: ["admin"],
  })
