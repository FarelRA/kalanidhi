import type {
  AccountStatus,
  Capability,
  WorkspaceRole,
} from "./capabilities"

/**
 * The viewer contract shared by the server guard, Convex functions, and the
 * workspace shell. It is deliberately serialisable: no Convex documents leak
 * into client components.
 */
export type ViewerEntitlements = {
  learn: boolean
  teach: boolean
  assess: boolean
  sell: boolean
  sellActive: boolean
  buy: boolean
  operate: boolean
}

export type ViewerTeacherProfile = {
  id: string
  status: "review" | "active" | "suspended"
  pathIds: string[]
}

export type ViewerSellerProfile = {
  id: string
  status: "pending" | "active" | "suspended"
}

export type ViewerCertificate = {
  id: string
  pathId: string
  publicCode: string
  status: "issued" | "revoked" | "replaced"
  issuedAt: number
}

export type ViewerEnrollment = {
  id: string
  pathId: string
  cohortId: string | null
  status: "pending_payment" | "active" | "completed" | "withdrawn"
}

export type Viewer = {
  userId: string
  authUserId: string
  name: string
  email: string
  phone: string
  province: string
  whatsappVerified: boolean
  whatsapp?: string
  initials: string
  region: string
  image?: string
  roles: WorkspaceRole[]
  status: AccountStatus
  capabilities: Capability[]
  entitlements: ViewerEntitlements
  roleLabel: string
  teacherProfile: ViewerTeacherProfile | null
  sellerProfile: ViewerSellerProfile | null
  certificates: ViewerCertificate[]
  enrollments: ViewerEnrollment[]
  teachScopes: string[]
  assessScopes: string[]
  sellScopes: string[]
}

export type ViewerSeed = {
  userId: string
  authUserId?: string
  name: string
  email: string
  phone?: string
  province?: string
  whatsappVerified?: boolean
  whatsapp?: string
  initials?: string
  region?: string
  image?: string
  roles: WorkspaceRole[]
  status?: AccountStatus
  teacherProfile?: ViewerTeacherProfile | null
  sellerProfile?: ViewerSellerProfile | null
  certificates?: ViewerCertificate[]
  enrollments?: ViewerEnrollment[]
  cohortPathIds?: string[]
}

export function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
