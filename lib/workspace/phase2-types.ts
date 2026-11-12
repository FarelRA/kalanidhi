import type { Id } from "@/convex/_generated/dataModel"
import type {
  Capability,
  StatusTone,
} from "@/lib/workspace/types"

export type LearningPathStatus = "open" | "mapping" | "planned" | "archived"

export type PathOverview = {
  id: string
  slug: string
  code: string
  title: string
  subtitle: string
  teacherName: string
  teacherRole: string
  region: string
  level: string
  status: LearningPathStatus
  price: number | null
  priceLabel: string | null
  tags: string[]
  outcome: string
  includes: string[]
  modules: number
  lessons: number
  weeks: number
  tasks: number
  students: number
  completion: number
  activeCohorts: number
  atRisk: number
}

export type CohortStatus =
  | "draft"
  | "enrolling"
  | "active"
  | "completed"
  | "cancelled"

export type CohortOverview = {
  id: Id<"cohorts">
  code: string
  title: string
  pathId: string
  pathTitle: string
  teacherId: Id<"users">
  teacherName: string
  startDate: number
  endDate: number
  capacity: number
  enrolled: number
  completed: number
  atRisk: number
  nextSessionAt: number | null
  status: CohortStatus
  timezone: string
  updatedAt: number
}

export type EnrollmentStatus =
  | "pending_payment"
  | "active"
  | "completed"
  | "withdrawn"

export type EnrollmentOverview = {
  id: Id<"enrollments">
  studentId: Id<"users">
  studentName: string
  initials: string
  cohortId: Id<"cohorts"> | null
  cohortCode: string | null
  pathId: string
  pathTitle: string
  progress: number
  lastActiveAt: number | null
  status: EnrollmentStatus
  nextTask: string
  certificateId: Id<"certificates"> | null
  deadlineAt: number | null
  withdrawnAt: number | null
  withdrawReason: string | null
  completedAt: number | null
}

export type LessonProgressState = "not_started" | "in_progress" | "completed"
export type AttendanceState = "present" | "absent" | "excused"

export type EnrollmentDetail = {
  enrollment: EnrollmentOverview
  modules: {
    id: Id<"pathModules">
    title: string
    summary: string
    lessons: {
      id: Id<"lessons">
      title: string
      kind: "text" | "video" | "audio" | "file" | "practice"
      estimatedMinutes: number
      state: LessonProgressState
      attendance: AttendanceState | null
      completedAt: number | null
    }[]
  }[]
  submissions: {
    id: Id<"submissions">
    code: string
    taskTitle: string
    status: SubmissionStatus
    submittedAt: number | null
    dueAt: number
  }[]
  certificate: CertificateOverview | null
}

export type SessionKind = "session" | "office_hours" | "call" | "assessment"
export type SessionStatus = "scheduled" | "live" | "ended" | "cancelled"

export type SessionOverview = {
  id: Id<"cohortSessions">
  cohortId: Id<"cohorts">
  cohortCode: string
  pathTitle: string
  teacherName: string
  title: string
  kind: SessionKind
  startsAt: number
  endsAt: number
  timezone: string
  roomId: string | null
  status: SessionStatus
  attendees: number
  past: boolean
}

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "revision_requested"
  | "approved"
  | "rejected"

export type AssessmentStatus =
  | "queued"
  | "in_review"
  | "completed"
  | "disputed"
  | "resolved"

export type RubricView = {
  criterion: string
  weight: number
  score: number | null
  comment: string | null
}

export type RubricInput = {
  criterion: string
  weight: number
  score?: number
  comment?: string
}

export type SubmissionAssetView = {
  id: Id<"submissionAssets">
  filename: string
  kind: "image" | "audio" | "video" | "file"
  mimeType: string
  size: number
  storageId: string
}

export type SubmissionOverview = {
  id: Id<"submissions">
  code: string
  studentId: Id<"users">
  studentName: string
  studentInitials: string
  cohortId: Id<"cohorts">
  cohort: string
  pathId: string
  pathTitle: string
  taskTitle: string
  status: SubmissionStatus
  statusLabel: string
  tone: StatusTone
  submittedAt: number | null
  dueAt: number
  ageHours: number
  slaHours: number
  teacher: string
  teacherId: Id<"users"> | null
  score: number | null
  feedback: string | null
  evidenceText: string | null
  evidence: SubmissionAssetView[]
  revisionCount: number
  rubric: RubricView[]
  assessmentId: Id<"assessments"> | null
  assessmentStatus: AssessmentStatus | null
  escalatedAt: number | null
  escalatedBy: string | null
  escalatedByName: string | null
  escalationReason: string | null
}

export type AssessmentHistoryView = {
  id: Id<"assessmentEvents">
  kind: "assign" | "grade" | "revision" | "override" | "dispute" | "resolve"
  actorId: string
  reason: string | null
  previousState: string | null
  nextState: string | null
  scoreBefore: number | null
  scoreAfter: number | null
  createdAt: number
}

export type SubmissionDetail = SubmissionOverview & {
  overrideReason: string | null
  secondReviewerId: Id<"users"> | null
  secondReviewerName: string | null
  history: AssessmentHistoryView[]
  disputes: DisputeOverview[]
}

export type CertificateStatus = "issued" | "revoked" | "replaced"

export type CertificateEventKind = "issue" | "revoke" | "replace"

export type CertificateEventView = {
  id: Id<"certificateEvents">
  kind: CertificateEventKind
  actorId: string
  actorName: string | null
  reason: string | null
  createdAt: number
}

export type CertificateOverview = {
  id: Id<"certificates">
  serial: string
  publicCode: string
  studentId: Id<"users">
  studentName: string
  pathId: string
  pathTitle: string
  teacherId: Id<"users">
  teacherName: string
  issuedAt: number
  status: CertificateStatus
  statusLabel: string
  assessmentScore: number
  revokedAt: number | null
  revokeReason: string | null
  revokedBy: string | null
  revokedByName: string | null
  replacedByCode: string | null
  scope: string
  events: CertificateEventView[]
  workCards: {
    id: Id<"workCards">
    serial: string
    title: string
    status: "draft" | "submitted" | "teacher_confirmed" | "admin_review" | "published" | "paused" | "sold_out"
    accessLevel: "public" | "community" | "restricted"
  }[]
}

export type CertificatePublicView = {
  publicCode: string
  serial: string
  studentName: string
  pathTitle: string
  teacherName: string
  issuedAt: number
  status: CertificateStatus
  assessmentScore: number
  revokedAt: number | null
  replacedByPublicCode: string | null
}

export type DisputeStatus = "open" | "reviewing" | "resolved" | "closed"

export type DisputeOverview = {
  id: Id<"disputes">
  subjectType: "assessment" | "order"
  subjectId: string
  status: DisputeStatus
  reason: string
  resolution: string | null
  openedBy: Id<"users">
  createdAt: number
  updatedAt?: number
  resolvedAt: number | null
}

export type GradeDecision = "approve" | "reject" | "revision"

export type GradeResult = {
  assessmentId: Id<"assessments">
  score: number
  status: SubmissionStatus
  certificateId: Id<"certificates"> | null
}

export type CapabilityList = Capability[]
