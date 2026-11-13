export type { Capability, WorkspaceRole } from "@/lib/access/capabilities"

export type DisplayRole = "peserta" | "pengajar" | "pengelola"

export type StatusTone =
  | "open"
  | "progress"
  | "done"
  | "wait"
  | "danger"
  | "muted"

export type RoleTone = "peserta" | "pengajar" | "pengelola" | "penjual"

export type Person = {
  id: string
  name: string
  initials: string
  email: string
  whatsapp: string
  region: string
  roles: DisplayRole[]
  status: "active" | "suspended" | "invited" | "review"
  joinedAt: string
  lastActive: string
  certificates: string[]
  teacherStatus?: "active" | "review" | "suspended"
  specialty?: string
  community?: string
  note?: string
  sessions?: number
  mfa?: boolean
}

export type PathSummary = {
  id: string
  slug: string
  code: string
  title: string
  subtitle: string
  teacher: string
  region: string
  price: number | null
  modules: number
  weeks: number
  tasks: number
  status: "Terbuka" | "Sedang dipetakan" | "Direncanakan"
  activeCohorts: number
  completion: number
  students: number
  image: string
}

export type Cohort = {
  id: string
  code: string
  pathId: string
  pathTitle: string
  teacher: string
  teacherId: string
  startDate: string
  endDate: string
  capacity: number
  enrolled: number
  completed: number
  atRisk: number
  nextSession: string
  status: StatusTone
  statusLabel: string
}

export type Enrollment = {
  id: string
  studentId: string
  student: string
  initials: string
  cohortId: string
  pathTitle: string
  progress: number
  lastActive: string
  status: "active" | "completed" | "withdrawn" | "at_risk"
  nextTask: string
  certificateId?: string
}

export type Submission = {
  id: string
  code: string
  student: string
  studentId: string
  cohort: string
  pathTitle: string
  taskTitle: string
  submittedAt: string
  dueAt: string
  ageHours: number
  slaHours: number
  status:
    | "draft"
    | "submitted"
    | "under_review"
    | "revision"
    | "approved"
    | "rejected"
  statusLabel: string
  tone: StatusTone
  teacher: string
  score?: number
  feedback?: string
  evidence: string[]
  revisionCount: number
  rubric: { label: string; weight: number; score?: number }[]
}

export type Certificate = {
  id: string
  serial: string
  publicCode: string
  student: string
  studentId: string
  pathTitle: string
  pathId: string
  teacher: string
  issuedAt: string
  status: "issued" | "revoked" | "replaced"
  statusLabel: string
  tone: StatusTone
  workCard: string
  assessmentScore: number
  scope: string
}

export type WorkItem = {
  id: string
  slug?: string
  title: string
  maker: string
  makerId: string
  makerRole: string
  teacher: string
  pathTitle: string
  technique: string
  price: number
  unit: string
  status: "published" | "review" | "draft" | "paused" | "sold_out"
  statusLabel: string
  tone: StatusTone
  submittedAt: string
  region: string
  workCard: string
  permission: string
  image?: string
  note?: string
}

export type Order = {
  id: string
  code: string
  buyer: string
  buyerContact: string
  seller: string
  workTitle: string
  amount: number
  status:
    | "awaiting_payment"
    | "paid"
    | "in_progress"
    | "delivered"
    | "completed"
    | "refunded"
    | "disputed"
  statusLabel: string
  tone: StatusTone
  channel: "web" | "whatsapp" | "institusi"
  createdAt: string
  paymentId?: string
  payoutId?: string
  note?: string
}

export type PaymentIntent = {
  id: string
  orderCode: string
  provider: "GoPay" | "QRIS" | "Transfer"
  reference: string
  amount: number
  uniqueAmount: number
  status: "pending" | "paid" | "expired" | "failed" | "refunded"
  statusLabel: string
  tone: StatusTone
  createdAt: string
  expiresAt: string
  matched: boolean
  note?: string
}

export type Payout = {
  id: string
  code: string
  teacher: string
  period: string
  gross: number
  teacherShare: number
  platformShare: number
  communityShare: number
  status: "pending" | "held" | "approved" | "paid" | "reversed"
  statusLabel: string
  tone: StatusTone
  dueAt: string
  paidAt?: string
  orders: number
  note?: string
}

export type Lead = {
  id: string
  name: string
  contact: string
  intent: "Belajar" | "Institusi" | "Konsultasi" | "Kemitraan"
  interest: string
  source: "Landing" | "WhatsApp" | "Referral" | "Instagram"
  region: string
  owner: string
  status: "new" | "contacted" | "qualified" | "converted" | "lost" | "spam"
  statusLabel: string
  tone: StatusTone
  ageDays: number
  createdAt: string
  note: string
  timeline: { id: string; time: string; actor: string; action: string }[]
}

export type Conversation = {
  id: string
  title: string
  kind: "direct" | "cohort" | "support" | "system"
  participants: string[]
  pathTitle: string
  lastMessage: string
  updatedAt: string
  unread: number
  status: "open" | "archived" | "flagged"
  initials: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  from: string
  fromId: string
  kind: "text" | "voice" | "call" | "system" | "file"
  body?: string
  time: string
  mine?: boolean
  duration?: string
  waveform?: number[]
  file?: { name: string; size: string }
  call?: { kind: "voice" | "video"; state: string; duration?: string }
}

export type CallSession = {
  id: string
  with: string
  initials: string
  role: string
  kind: "voice" | "video"
  status: "scheduled" | "ringing" | "active" | "ended" | "missed"
  statusLabel: string
  tone: StatusTone
  scheduledAt: string
  duration: string
  consent: "both" | "pending" | "declined"
  quality: string
  recording: boolean
}

export type ScheduleSession = {
  id: string
  title: string
  kind: "Kelas kohort" | "Office hour" | "Panggilan" | "Penilaian"
  cohort: string
  teacher: string
  day: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu"
  date: string
  time: string
  duration: string
  mode: "Video" | "Suara" | "Tatap muka"
  status: "confirmed" | "pending" | "rescheduled"
  attendees: number
}

export type LogEntry = {
  id: string
  ts: string
  type:
    | "Audit"
    | "Auth"
    | "Pembayaran"
    | "Notifikasi"
    | "Panggilan"
    | "Moderasi"
    | "Konten"
    | "API"
    | "Galat"
  actor: string
  action: string
  entity: string
  severity: "info" | "warning" | "error" | "critical"
  requestId: string
  detail: string
}

export type Metric = {
  id: string
  label: string
  value: string
  note: string
  delta?: string
  direction?: "up" | "down" | "flat"
  series: number[]
}

export type StatDefinition = {
  id: string
  label: string
  definition: string
  value: string
  delta: string
  owner: string
}

export type SupportTicket = {
  id: string
  subject: string
  requester: string
  requesterRole: string
  priority: "low" | "normal" | "high" | "urgent"
  priorityLabel: string
  status: "open" | "pending" | "resolved" | "closed"
  statusLabel: string
  tone: StatusTone
  assignee: string
  updatedAt: string
  age: string
  channel: "Chat" | "Email" | "WhatsApp"
  excerpt: string
  linked: string
  messages: {
    id: string
    from: string
    internal?: boolean
    time: string
    body: string
  }[]
}

export type Flow = {
  id: string
  name: string
  owner: string
  description: string
  states: { id: string; label: string; note?: string }[]
  current: string
  sla: string
  stuck: number
  stuckItems: { id: string; record: string; age: string; owner: string; next: string }[]
  transitions: { from: string; to: string; guard: string }[]
}

export type ActivityItem = {
  id: string
  actor: string
  action: string
  target: string
  time: string
  type: "audit" | "payment" | "content" | "auth" | "call" | "support"
}

export type QueueItem = {
  id: string
  title: string
  meta: string
  age: string
  owner: string
  status: string
  tone: StatusTone
  href?: string
}

export type CmsField = {
  id: string
  label: string
  value: string
  multiline?: boolean
  hint?: string
}

export type CmsSection = {
  id: string
  label: string
  description: string
  fields: CmsField[]
  dirty?: boolean
}

export type ContentRevision = {
  id: string
  version: string
  author: string
  time: string
  note: string
  status: "published" | "draft" | "scheduled"
}
