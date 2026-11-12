/**
 * Canonical state-machine definitions for every workspace domain.
 *
 * The definitions are configuration, never executable code: guards are labels
 * from a closed vocabulary, automation rules choose from an allowlist, and
 * `convex/flows.ts` validates every stored override against this table.
 */

export const FLOW_KEYS = [
  "lead",
  "teacher",
  "enrollment",
  "submission",
  "assessment",
  "certificate",
  "work",
  "order",
  "payment",
  "payout",
  "refund",
  "call",
  "support",
  "content",
] as const

export type FlowKey = (typeof FLOW_KEYS)[number]

export type FlowStatusTone =
  | "open"
  | "progress"
  | "done"
  | "wait"
  | "danger"
  | "muted"

export type FlowState = {
  key: string
  label: string
  terminal?: boolean
  tone: FlowStatusTone
}

export type FlowTransition = {
  from: string
  to: string
  guard: string
  requiresRole?: "admin" | "teacher" | "student" | "system"
  slaHours?: number
}

export type FlowSla = {
  key: string
  name: string
  targetMinutes: number
  escalationMinutes?: number
  owner: string
}

export const AUTOMATION_TRIGGERS = [
  "on_create",
  "on_transition",
  "sla_warning",
  "sla_breach",
  "no_activity",
] as const

export type AutomationTrigger = (typeof AUTOMATION_TRIGGERS)[number]

export const AUTOMATION_ACTIONS = [
  "assign_owner",
  "remind_owner",
  "notify_owner",
  "notify_admin",
  "escalate_admin",
  "create_support_ticket",
  "pause_work",
] as const

export type AutomationAction = (typeof AUTOMATION_ACTIONS)[number]

export type FlowAutomation = {
  key: string
  kind: "assignment" | "reminder" | "escalation" | "notification"
  trigger: AutomationTrigger
  action: AutomationAction
  enabled: boolean
}

export type FlowSpec = {
  key: FlowKey
  name: string
  owner: string
  description: string
  states: FlowState[]
  transitions: FlowTransition[]
  sla: FlowSla
  automations: FlowAutomation[]
}

function state(
  key: string,
  label: string,
  tone: FlowStatusTone,
  terminal = false,
): FlowState {
  return { key, label, tone, terminal }
}

function transition(
  from: string,
  to: string,
  guard: string,
  options: {
    requiresRole?: FlowTransition["requiresRole"]
    slaHours?: number
  } = {},
): FlowTransition {
  return { from, to, guard, ...options }
}

export const FLOW_SPECS: Record<FlowKey, FlowSpec> = {
  lead: {
    key: "lead",
    name: "Lead",
    owner: "Pemilik lead",
    description: "Dari formulir publik ke pendaftaran atau penolakan yang dicatat.",
    states: [
      state("new", "Baru", "open"),
      state("contacted", "Sudah dihubungi", "progress"),
      state("qualified", "Terkualifikasi", "wait"),
      state("converted", "Dikonversi", "done", true),
      state("lost", "Hilang", "danger", true),
      state("closed", "Ditutup", "muted", true),
      state("spam", "Spam", "danger", true),
    ],
    transitions: [
      transition("new", "contacted", "Kontak pertama dicatat"),
      transition("new", "qualified", "Kebutuhan dan minat terverifikasi"),
      transition("new", "lost", "Tidak ada respons dalam periode"),
      transition("new", "spam", "Terdeteksi spam"),
      transition("contacted", "qualified", "Kualifikasi tercatat"),
      transition("contacted", "lost", "Tidak melanjutkan"),
      transition("contacted", "spam", "Terdeteksi spam"),
      transition("qualified", "converted", "Pendaftaran atau penawaran dibuat"),
      transition("qualified", "lost", "Batal sebelum konversi"),
      transition("qualified", "spam", "Terdeteksi spam"),
      transition("lost", "qualified", "Lead kembali menghubungi"),
      transition("spam", "new", "Kesalahan spam dikoreksi dengan alasan"),
    ],
    sla: {
      key: "flow.lead.firstContact",
      name: "Kontak pertama lead",
      targetMinutes: 240,
      escalationMinutes: 480,
      owner: "Pemilik lead",
    },
    automations: [
      {
        key: "flow.lead.assign",
        kind: "assignment",
        trigger: "on_create",
        action: "assign_owner",
        enabled: true,
      },
      {
        key: "flow.lead.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
      {
        key: "flow.lead.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "notify_admin",
        enabled: true,
      },
    ],
  },

  teacher: {
    key: "teacher",
    name: "Pengajuan pengajar",
    owner: "Tim orang",
    description: "Dossier pengajar sampai terverifikasi atau ditangguhkan.",
    states: [
      state("review", "Ditinjau", "wait"),
      state("active", "Aktif", "done", true),
      state("suspended", "Ditangguhkan", "danger", true),
    ],
    transitions: [
      transition("review", "active", "Dossier, izin, dan jalur terverifikasi"),
      transition("review", "suspended", "Ditolak atau melanggar ketentuan"),
      transition("suspended", "review", "Pengajuan ulang diterima"),
      transition("active", "suspended", "Penangguhan dengan alasan"),
      transition("suspended", "active", "Reaktivasi dengan alasan"),
    ],
    sla: {
      key: "flow.teacher.review",
      name: "Tinjauan pengajar",
      targetMinutes: 4320,
      escalationMinutes: 5760,
      owner: "Tim orang",
    },
    automations: [
      {
        key: "flow.teacher.notify",
        kind: "notification",
        trigger: "on_transition",
        action: "notify_owner",
        enabled: true,
      },
    ],
  },

  enrollment: {
    key: "enrollment",
    name: "Pendaftaran",
    owner: "Pengajar kohort",
    description: "Pembayaran, pembelajaran, penyelesaian, atau penarikan.",
    states: [
      state("pending_payment", "Menunggu pembayaran", "wait"),
      state("active", "Aktif", "progress"),
      state("completed", "Selesai", "done", true),
      state("withdrawn", "Ditarik", "danger", true),
    ],
    transitions: [
      transition("pending_payment", "active", "Pembayaran terverifikasi"),
      transition("pending_payment", "withdrawn", "Dibatalkan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("active", "completed", "Semua syarat kelulusan terpenuhi"),
      transition("active", "withdrawn", "Penarikan dengan alasan", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.enrollment.activation",
      name: "Aktivasi pendaftaran",
      targetMinutes: 1440,
      escalationMinutes: 2880,
      owner: "Tim operasi",
    },
    automations: [
      {
        key: "flow.enrollment.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
    ],
  },

  submission: {
    key: "submission",
    name: "Tugas",
    owner: "Pengajar kohort",
    description: "Draf, pengumpulan, revisi, dan keputusan penilaian.",
    states: [
      state("draft", "Draf", "muted"),
      state("submitted", "Dikumpulkan", "open"),
      state("under_review", "Ditinjau", "progress"),
      state("revision_requested", "Revisi diminta", "wait"),
      state("approved", "Disetujui", "done", true),
      state("rejected", "Ditolak", "danger", true),
    ],
    transitions: [
      transition("draft", "submitted", "Bukti tugas tersedia"),
      transition("submitted", "under_review", "Pengajar membuka tugas"),
      transition("under_review", "approved", "Rubrik lengkap dan lulus"),
      transition("under_review", "rejected", "Rubrik lengkap dan tidak lulus"),
      transition("under_review", "revision_requested", "Catatan revisi wajib"),
      transition("revision_requested", "submitted", "Revisi dikumpulkan"),
    ],
    sla: {
      key: "flow.submission.review",
      name: "Peninjauan tugas",
      targetMinutes: 2880,
      escalationMinutes: 4320,
      owner: "Pengajar kohort",
    },
    automations: [
      {
        key: "flow.submission.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
      {
        key: "flow.submission.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "escalate_admin",
        enabled: true,
      },
    ],
  },

  assessment: {
    key: "assessment",
    name: "Penilaian",
    owner: "Penilai",
    description: "Antrean penilaian, penyelesaian, dan sengketa.",
    states: [
      state("queued", "Dalam antrean", "wait"),
      state("in_review", "Sedang dinilai", "progress"),
      state("completed", "Selesai", "done"),
      state("disputed", "Sengketa", "danger"),
      state("resolved", "Diselesaikan", "done", true),
    ],
    transitions: [
      transition("queued", "in_review", "Penilai ditugaskan"),
      transition("in_review", "completed", "Rubrik dan umpan balik lengkap"),
      transition("completed", "disputed", "Peserta membuka sengketa"),
      transition("disputed", "resolved", "Keputusan sengketa dengan alasan", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.assessment.review",
      name: "Penilaian tugas",
      targetMinutes: 4320,
      escalationMinutes: 5760,
      owner: "Penilai",
    },
    automations: [
      {
        key: "flow.assessment.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "escalate_admin",
        enabled: true,
      },
    ],
  },

  certificate: {
    key: "certificate",
    name: "Sertifikat",
    owner: "Tim kredensial",
    description: "Sertifikat platform dengan verifikasi publik.",
    states: [
      state("issued", "Terbit", "done"),
      state("revoked", "Dicabut", "danger", true),
      state("replaced", "Diganti", "muted", true),
    ],
    transitions: [
      transition("issued", "revoked", "Pencabutan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("issued", "replaced", "Penerbitan ulang dengan kode baru", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.certificate.reissue",
      name: "Penerbitan ulang",
      targetMinutes: 1440,
      owner: "Tim kredensial",
    },
    automations: [],
  },

  work: {
    key: "work",
    name: "Kartu karya",
    owner: "Pemilik karya",
    description: "Karya dan jasa sampai tayang, dijeda, atau habis.",
    states: [
      state("draft", "Draf", "muted"),
      state("submitted", "Diajukan", "open"),
      state("teacher_confirmed", "Dikonfirmasi pengajar", "progress"),
      state("admin_review", "Ditinjau pengelola", "wait"),
      state("published", "Tayang", "done"),
      state("paused", "Dijeda", "danger"),
      state("sold_out", "Habis", "muted", true),
    ],
    transitions: [
      transition("draft", "submitted", "Data karya dan izin lengkap"),
      transition("submitted", "teacher_confirmed", "Pengajar mengonfirmasi jalur"),
      transition("teacher_confirmed", "admin_review", "Masuk tinjauan pengelola"),
      transition("admin_review", "published", "Moderasi dan izin valid", {
        requiresRole: "admin",
      }),
      transition("published", "paused", "Takedown atau izin dicabut", {
        requiresRole: "admin",
      }),
      transition("paused", "admin_review", "Perbaikan diajukan ulang"),
      transition("published", "sold_out", "Stok habis"),
      transition("teacher_confirmed", "paused", "Izin dicabut", {
        requiresRole: "admin",
      }),
      transition("admin_review", "paused", "Tinjauan menolak", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.work.review",
      name: "Tinjauan karya",
      targetMinutes: 2880,
      escalationMinutes: 4320,
      owner: "Tim moderasi",
    },
    automations: [
      {
        key: "flow.work.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
    ],
  },

  order: {
    key: "order",
    name: "Pesanan",
    owner: "Penjual",
    description: "Pesanan dari pembayaran sampai selesai, batal, atau sengketa.",
    states: [
      state("draft", "Draf", "muted"),
      state("awaiting_payment", "Menunggu pembayaran", "wait"),
      state("paid", "Dibayar", "progress"),
      state("in_progress", "Diproses", "progress"),
      state("delivered", "Dikirim", "wait"),
      state("completed", "Selesai", "done", true),
      state("cancelled", "Dibatalkan", "danger", true),
      state("refunded", "Dikembalikan", "danger", true),
      state("disputed", "Sengketa", "danger"),
    ],
    transitions: [
      transition("draft", "awaiting_payment", "Pesanan dibuat"),
      transition("awaiting_payment", "paid", "Pembayaran tervalidasi"),
      transition("awaiting_payment", "cancelled", "Kedaluwarsa atau dibatalkan"),
      transition("paid", "in_progress", "Penjual mulai mengerjakan"),
      transition("in_progress", "delivered", "Karya atau layanan diserahkan"),
      transition("delivered", "completed", "Pembeli mengonfirmasi"),
      transition("paid", "refunded", "Refund disetujui dan dibayar"),
      transition("in_progress", "disputed", "Sengketa dibuka"),
      transition("delivered", "disputed", "Sengketa dibuka"),
      transition("disputed", "completed", "Sengketa selesai untuk pembeli"),
      transition("disputed", "refunded", "Sengketa selesai dengan refund"),
    ],
    sla: {
      key: "flow.order.fulfilment",
      name: "Pemenuhan pesanan",
      targetMinutes: 4320,
      escalationMinutes: 5760,
      owner: "Penjual",
    },
    automations: [
      {
        key: "flow.order.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
    ],
  },

  payment: {
    key: "payment",
    name: "Pembayaran",
    owner: "Tim keuangan",
    description: "Niat pembayaran, penyelesaian, kedaluwarsa, dan rekonsiliasi.",
    states: [
      state("pending", "Menunggu", "wait"),
      state("paid", "Dibayar", "done", true),
      state("expired", "Kedaluwarsa", "muted", true),
      state("failed", "Gagal", "danger", true),
      state("cancelled", "Dibatalkan", "muted", true),
      state("refunded", "Dikembalikan", "danger", true),
    ],
    transitions: [
      transition("pending", "paid", "Webhook penyelesaian tervalidasi"),
      transition("pending", "expired", "Melewati batas waktu"),
      transition("pending", "failed", "Provider menolak"),
      transition("pending", "cancelled", "Pesanan dibatalkan"),
      transition("paid", "refunded", "Refund disetujui"),
    ],
    sla: {
      key: "flow.payment.reconcile",
      name: "Rekonsiliasi pembayaran",
      targetMinutes: 20,
      escalationMinutes: 60,
      owner: "Tim keuangan",
    },
    automations: [
      {
        key: "flow.payment.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "notify_admin",
        enabled: true,
      },
    ],
  },

  payout: {
    key: "payout",
    name: "Pencairan",
    owner: "Tim keuangan",
    description: "Bagi hasil 70/15/15 yang ditahan, disetujui, dibayar, atau dibalik.",
    states: [
      state("pending", "Menunggu", "wait"),
      state("held", "Ditahan", "danger"),
      state("approved", "Disetujui", "progress"),
      state("paid", "Dibayar", "done", true),
      state("reversed", "Dibalik", "muted", true),
    ],
    transitions: [
      transition("pending", "held", "Penahanan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("pending", "approved", "Pemeriksaan selesai", {
        requiresRole: "admin",
      }),
      transition("held", "approved", "Penahanan dilepas", {
        requiresRole: "admin",
      }),
      transition("approved", "paid", "Transfer dikonfirmasi", {
        requiresRole: "admin",
      }),
      transition("held", "reversed", "Pembalikan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("approved", "reversed", "Pembalikan dengan alasan", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.payout.release",
      name: "Pencairan payout",
      targetMinutes: 4320,
      escalationMinutes: 5760,
      owner: "Tim keuangan",
    },
    automations: [
      {
        key: "flow.payout.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "notify_admin",
        enabled: true,
      },
    ],
  },

  refund: {
    key: "refund",
    name: "Refund dan sengketa",
    owner: "Tim keuangan",
    description: "Permintaan refund sampai keputusan dan pembayaran.",
    states: [
      state("requested", "Diminta", "open"),
      state("reviewing", "Ditinjau", "progress"),
      state("approved", "Disetujui", "wait"),
      state("rejected", "Ditolak", "danger", true),
      state("paid", "Dibayar", "done", true),
    ],
    transitions: [
      transition("requested", "reviewing", "Bukti diterima"),
      transition("reviewing", "approved", "Keputusan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("reviewing", "rejected", "Keputusan dengan alasan", {
        requiresRole: "admin",
      }),
      transition("approved", "paid", "Pembayaran refund dicatat", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.refund.review",
      name: "Tinjauan refund",
      targetMinutes: 1440,
      escalationMinutes: 2880,
      owner: "Tim keuangan",
    },
    automations: [
      {
        key: "flow.refund.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "escalate_admin",
        enabled: true,
      },
    ],
  },

  call: {
    key: "call",
    name: "Panggilan",
    owner: "Pemanggil",
    description: "Jadwal, dering, panggilan aktif, dan akhir panggilan.",
    states: [
      state("scheduled", "Dijadwalkan", "wait"),
      state("ringing", "Berdering", "open"),
      state("active", "Aktif", "progress"),
      state("ended", "Selesai", "done", true),
      state("missed", "Terlewat", "muted", true),
      state("declined", "Ditolak", "danger", true),
    ],
    transitions: [
      transition("scheduled", "ringing", "Waktu panggilan tiba"),
      transition("scheduled", "missed", "Tidak ada peserta pada waktunya"),
      transition("ringing", "active", "Peserta menerima dan bergabung"),
      transition("ringing", "declined", "Peserta menolak"),
      transition("ringing", "missed", "Dering berakhir tanpa jawaban"),
      transition("active", "ended", "Semua peserta keluar"),
    ],
    sla: {
      key: "flow.call.start",
      name: "Mulai panggilan",
      targetMinutes: 10,
      owner: "Pemanggil",
    },
    automations: [
      {
        key: "flow.call.remind",
        kind: "reminder",
        trigger: "on_transition",
        action: "notify_owner",
        enabled: true,
      },
    ],
  },

  support: {
    key: "support",
    name: "Tiket dukungan",
    owner: "Tim dukungan",
    description: "Tiket pengguna, balasan, eskalasi, penyelesaian, dan penutupan.",
    states: [
      state("open", "Terbuka", "open"),
      state("pending", "Menunggu", "wait"),
      state("resolved", "Selesai", "done"),
      state("closed", "Ditutup", "muted", true),
    ],
    transitions: [
      transition("open", "pending", "Balasan pengguna terlihat terkirim", {
        requiresRole: "admin",
      }),
      transition("open", "resolved", "Resolusi dengan catatan", {
        requiresRole: "admin",
      }),
      transition("pending", "open", "Pengguna membalas kembali"),
      transition("pending", "resolved", "Resolusi dengan catatan", {
        requiresRole: "admin",
      }),
      transition("resolved", "closed", "Pengguna mengonfirmasi atau tenggang habis", {
        requiresRole: "admin",
      }),
      transition("resolved", "open", "Pengguna membuka kembali"),
      transition("closed", "open", "Dibuka kembali dengan alasan", {
        requiresRole: "admin",
      }),
    ],
    sla: {
      key: "flow.support.firstResponse",
      name: "Respons pertama dukungan",
      targetMinutes: 120,
      escalationMinutes: 240,
      owner: "Tim dukungan",
    },
    automations: [
      {
        key: "flow.support.assign",
        kind: "assignment",
        trigger: "on_create",
        action: "assign_owner",
        enabled: true,
      },
      {
        key: "flow.support.remind",
        kind: "reminder",
        trigger: "sla_warning",
        action: "remind_owner",
        enabled: true,
      },
      {
        key: "flow.support.escalate",
        kind: "escalation",
        trigger: "sla_breach",
        action: "escalate_admin",
        enabled: true,
      },
    ],
  },

  content: {
    key: "content",
    name: "Publikasi konten",
    owner: "Tim konten",
    description: "Draf, tinjauan, jadwal, terbit, dan arsip landing.",
    states: [
      state("draft", "Draf", "muted"),
      state("in_review", "Ditinjau", "progress"),
      state("scheduled", "Dijadwalkan", "wait"),
      state("published", "Terbit", "done"),
      state("archived", "Diarsipkan", "muted", true),
    ],
    transitions: [
      transition("draft", "in_review", "Validasi konten bersih"),
      transition("in_review", "scheduled", "Tanggal terbit ditetapkan", {
        requiresRole: "admin",
      }),
      transition("in_review", "published", "Validasi dan persetujuan", {
        requiresRole: "admin",
      }),
      transition("scheduled", "published", "Waktu terbit tiba"),
      transition("published", "archived", "Diganti revisi baru", {
        requiresRole: "admin",
      }),
      transition("archived", "in_review", "Revisi baru dibuat"),
    ],
    sla: {
      key: "flow.content.review",
      name: "Tinjauan konten",
      targetMinutes: 1440,
      escalationMinutes: 2880,
      owner: "Tim konten",
    },
    automations: [
      {
        key: "flow.content.notify",
        kind: "notification",
        trigger: "on_transition",
        action: "notify_admin",
        enabled: true,
      },
    ],
  },
}

export function isFlowKey(value: string): value is FlowKey {
  return (FLOW_KEYS as readonly string[]).includes(value)
}

export function flowSpec(key: FlowKey): FlowSpec {
  return FLOW_SPECS[key]
}

export function stateKeys(key: FlowKey): string[] {
  return FLOW_SPECS[key].states.map((item) => item.key)
}

export function stateLabel(key: FlowKey, state: string): string {
  return FLOW_SPECS[key].states.find((item) => item.key === state)?.label ?? state
}

export function transitionExists(
  key: FlowKey,
  from: string,
  to: string,
): boolean {
  return FLOW_SPECS[key].transitions.some(
    (item) => item.from === from && item.to === to,
  )
}

export function isTerminalState(key: FlowKey, state: string): boolean {
  return FLOW_SPECS[key].states.some(
    (item) => item.key === state && item.terminal === true,
  )
}
