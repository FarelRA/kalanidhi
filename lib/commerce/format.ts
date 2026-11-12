const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "short",
  year: "numeric",
})

export function formatCommerceDateTime(value: number | null | undefined): string {
  if (!value) return "—"
  return dateTimeFormatter.format(new Date(value))
}

export function formatCommerceDate(value: number | null | undefined): string {
  if (!value) return "—"
  return dateFormatter.format(new Date(value))
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Draf",
  awaiting_payment: "Menunggu pembayaran",
  paid: "Dibayar",
  in_progress: "Diproses",
  delivered: "Dikirim",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
  disputed: "Sengketa",
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  paid: "Lunas",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  cancelled: "Dibatalkan",
  refunded: "Dikembalikan",
}

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Menunggu",
  held: "Ditahan",
  approved: "Disetujui",
  paid: "Dibayar",
  reversed: "Dibalik",
}

export const REFUND_STATUS_LABELS: Record<string, string> = {
  requested: "Diminta",
  reviewing: "Ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
  paid: "Dibayar",
}

export const DISPUTE_STATUS_LABELS: Record<string, string> = {
  open: "Terbuka",
  reviewing: "Ditinjau",
  resolved: "Selesai",
  closed: "Ditutup",
}
