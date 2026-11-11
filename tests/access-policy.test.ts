import { describe, expect, it } from "vitest"

import { canAccessRoute, computeCapabilities, deriveViewer } from "@/lib/access/policy"
import type { ViewerSeed } from "@/lib/access/viewer"
import { issuedCertificate, makeViewer } from "./helpers/viewer"

const baseStudent: ViewerSeed = {
  userId: "u-student",
  name: "Anisa Rahmawati",
  email: "anisa@example.test",
  roles: ["student"],
  enrollments: [
    {
      id: "e-1",
      pathId: "pranatacara",
      cohortId: "c-1",
      status: "active",
    },
  ],
}

const baseTeacher: ViewerSeed = {
  userId: "u-teacher",
  name: "Bambang Hardjono",
  email: "bambang@example.test",
  roles: ["teacher"],
  teacherProfile: {
    id: "t-1",
    status: "active",
    pathIds: ["batik-tulis-soga"],
  },
  cohortPathIds: ["batik-tulis-soga"],
  sellerProfile: { id: "s-1", status: "active" },
}

function certificate(pathId: string, status: "issued" | "revoked" | "replaced" = "issued") {
  return {
    id: `cert-${pathId}`,
    pathId,
    publicCode: `KN-${pathId}`,
    status,
    issuedAt: 1_700_000_000_000,
  } as const
}

describe("role to capability mapping", () => {
  it("builds viewer fixtures with roles, certificates, scopes, and status", () => {
    const viewer = makeViewer({
      roles: ["teacher", "student"],
      status: "active",
      teacherProfile: {
        id: "t-1",
        status: "active",
        pathIds: ["batik-tulis-soga"],
      },
      certificates: [issuedCertificate("pranatacara")],
      enrollments: [
        {
          id: "e-1",
          pathId: "pranatacara",
          cohortId: "c-1",
          status: "active",
        },
      ],
      cohortPathIds: ["batik-tulis-soga"],
      sellerProfile: { id: "s-1", status: "active" },
    })

    expect(viewer.roles).toEqual(["teacher", "student"])
    expect(viewer.sellScopes).toEqual(["batik-tulis-soga", "pranatacara"])
    expect(viewer.assessScopes).toEqual(["batik-tulis-soga"])
    expect(viewer.status).toBe("active")
  })

  it("gives a student learning and buying capabilities but no grading or selling", () => {
    const capabilities = computeCapabilities(baseStudent)

    expect(capabilities).toContain("learn")
    expect(capabilities).toContain("submissions.submit")
    expect(capabilities).toContain("orders.buy")
    expect(capabilities).toContain("buy")
    expect(capabilities).not.toContain("submissions.grade")
    expect(capabilities).not.toContain("sell")
    expect(capabilities).not.toContain("operate")
  })

  it("gives an active teacher teaching, assessment, and scoped selling", () => {
    const capabilities = computeCapabilities(baseTeacher)

    expect(capabilities).toContain("teach")
    expect(capabilities).toContain("assess")
    expect(capabilities).toContain("submissions.grade")
    expect(capabilities).toContain("sell")
    expect(capabilities).toContain("orders.sell")
    expect(capabilities).not.toContain("submissions.submit")
    expect(capabilities).not.toContain("operate")
  })

  it("gives an admin operational access and no grading, submission, or selling", () => {
    const capabilities = computeCapabilities({
      roles: ["admin"],
    })

    expect(capabilities).toContain("operate")
    expect(capabilities).toContain("people.manage")
    expect(capabilities).toContain("payments.manage")
    expect(capabilities).toContain("certificates.revoke")
    expect(capabilities).not.toContain("submissions.grade")
    expect(capabilities).not.toContain("submissions.submit")
    expect(capabilities).not.toContain("sell")
    expect(capabilities).not.toContain("teach")
    expect(capabilities).not.toContain("learn")
  })

  it("keeps a multi-role teacher-student in both scopes", () => {
    const viewer = deriveViewer({
      ...baseTeacher,
      userId: "u-teacher-student",
      roles: ["teacher", "student"],
      enrollments: baseStudent.enrollments,
    })

    expect(viewer.capabilities).toContain("teach")
    expect(viewer.capabilities).toContain("learn")
    expect(viewer.capabilities).toContain("submissions.submit")
    expect(viewer.capabilities).toContain("submissions.grade")
    expect(viewer.roleLabel).toBe("Pengajar · Peserta · Penjual")
  })

  it("does not let an admin regain grading or selling through another role", () => {
    const viewer = deriveViewer({
      ...baseTeacher,
      roles: ["admin", "teacher", "student"],
    })

    expect(viewer.capabilities).toContain("operate")
    expect(viewer.capabilities).not.toContain("submissions.grade")
    expect(viewer.capabilities).not.toContain("submissions.submit")
    expect(viewer.capabilities).not.toContain("sell")
    expect(viewer.roleLabel).toBe("Pengelola")
  })
})

describe("earned seller scope", () => {
  it("derives a seller scope from an issued certificate and an active seller profile", () => {
    const viewer = deriveViewer({
      ...baseStudent,
      certificates: [certificate("batik-tulis-soga")],
      sellerProfile: { id: "s-1", status: "active" },
    })

    expect(viewer.entitlements.sell).toBe(true)
    expect(viewer.entitlements.sellActive).toBe(true)
    expect(viewer.sellScopes).toEqual(["batik-tulis-soga"])
    expect(viewer.capabilities).toContain("sell")
    expect(viewer.roleLabel).toBe("Peserta · Penjual")
  })

  it("keeps the seller entitlement but not active selling while onboarding is pending", () => {
    const viewer = deriveViewer({
      ...baseStudent,
      certificates: [certificate("batik-tulis-soga")],
      sellerProfile: { id: "s-1", status: "pending" },
    })

    expect(viewer.entitlements.sell).toBe(true)
    expect(viewer.entitlements.sellActive).toBe(false)
    expect(viewer.capabilities).not.toContain("sell")
  })

  it("removes seller scope and capability when a certificate is revoked", () => {
    const issued = deriveViewer({
      ...baseStudent,
      certificates: [certificate("batik-tulis-soga")],
      sellerProfile: { id: "s-1", status: "active" },
    })
    const revoked = deriveViewer({
      ...baseStudent,
      certificates: [certificate("batik-tulis-soga", "revoked")],
      sellerProfile: { id: "s-1", status: "active" },
    })

    expect(issued.sellScopes).toContain("batik-tulis-soga")
    expect(revoked.sellScopes).not.toContain("batik-tulis-soga")
    expect(revoked.capabilities).not.toContain("sell")
  })
})

describe("suspended accounts", () => {
  it("keeps the identity but removes every capability", () => {
    const viewer = deriveViewer({ ...baseTeacher, status: "suspended" })

    expect(viewer.status).toBe("suspended")
    expect(viewer.capabilities).toEqual([])
    expect(viewer.entitlements.buy).toBe(false)
  })
})

describe("scope and route guards", () => {
  it("does not expose a route when the capability is absent", () => {
    const student = computeCapabilities(baseStudent)
    expect(canAccessRoute(student, "/ruang/belajar")).toBe(true)
    expect(canAccessRoute(student, "/ruang/orang")).toBe(false)
    expect(canAccessRoute(student, "/ruang/pesanan/pembayaran")).toBe(false)
  })

  it("lets an admin open operations routes but not the learning routes", () => {
    const admin = computeCapabilities({
      roles: ["admin"],
    })
    expect(canAccessRoute(admin, "/ruang/statistik")).toBe(true)
    expect(canAccessRoute(admin, "/ruang/tugas")).toBe(true)
    expect(canAccessRoute(admin, "/ruang/belajar")).toBe(true)
    expect(canAccessRoute(admin, "/ruang/konten")).toBe(true)
  })
})
