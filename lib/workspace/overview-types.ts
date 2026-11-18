import type { OrderStatus, WorkStatus } from "../commerce/types"

export type ViewerOverviewRole = "operator" | "teacher" | "seller" | "student"

export type OverviewSession = {
  id: string
  cohortId: string
  title: string
  kind: "session" | "office_hours" | "call" | "assessment"
  cohortCode: string
  cohortTitle: string
  pathTitle: string
  startsAt: number
  endsAt: number
  status: "scheduled" | "live" | "ended" | "cancelled"
}

export type OverviewEnrollment = {
  id: string
  pathId: string
  pathTitle: string
  cohortCode: string | null
  cohortTitle: string | null
  status: "active" | "completed"
  progress: number
  completedLessons: number
  totalLessons: number
  nextLesson: string | null
  enrolledAt: number
  completedAt: number | null
  deadlineAt: number | null
}

export type OverviewCertificate = {
  id: string
  publicCode: string
  pathTitle: string
  issuedAt: number
}

export type OverviewOrder = {
  id: string
  code: string
  title: string
  amount: number
  status: OrderStatus
  createdAt: number
}

export type OverviewWork = {
  id: string
  title: string
  status: WorkStatus
  price: number
  orderCount: number
}

export type OverviewEarnings = {
  paid: number
  due: number
}

export type OverviewCohort = {
  id: string
  code: string
  title: string
  pathTitle: string
  status: "draft" | "enrolling" | "active" | "completed" | "cancelled"
  studentCount: number
  nextSessionAt: number | null
}

export type StudentOverview = {
  enrollments: OverviewEnrollment[]
  pendingSubmissions: number
  awaitingAssessment: number
  issuedCertificates: number
  latestCertificate: OverviewCertificate | null
  recentOrders: OverviewOrder[]
}

export type TeacherOverview = {
  cohorts: OverviewCohort[]
  awaitingAssessment: number
  completedAssessmentsThisMonth: number
  earnings: OverviewEarnings
  works: OverviewWork[]
}

export type SellerOverview = {
  works: OverviewWork[]
  workOrders: number
  earnings: OverviewEarnings
}

export type ViewerOverview = {
  role: ViewerOverviewRole
  roleLabel: string
  viewerName: string
  generatedAt: number
  region: string
  unreadMessages: number
  openTickets: number
  upcomingSessions: OverviewSession[]
  student: StudentOverview | null
  teacher: TeacherOverview | null
  seller: SellerOverview | null
}
