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

export {
  DISPUTE_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  REFUND_STATUS_LABELS,
} from "./options"
