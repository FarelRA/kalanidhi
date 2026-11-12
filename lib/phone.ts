/**
 * Indonesian WhatsApp numbers are stored as E.164 digits without the leading
 * plus, e.g. 6287784454555. Accepts the common local spellings and rejects
 * anything that is not an Indonesian mobile number.
 */
export function normalizeIndonesianPhone(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error("Nomor WhatsApp wajib diisi.")
  }

  const digits = trimmed.replace(/[^\d]/g, "")
  let normalized: string

  if (trimmed.startsWith("+62")) {
    normalized = `62${digits.slice(2)}`
  } else if (digits.startsWith("62")) {
    normalized = digits
  } else if (digits.startsWith("0")) {
    normalized = `62${digits.slice(1)}`
  } else if (digits.startsWith("8")) {
    normalized = `62${digits}`
  } else {
    throw new Error("Nomor WhatsApp harus berupa nomor Indonesia.")
  }

  if (!/^628\d{7,12}$/.test(normalized)) {
    throw new Error("Nomor WhatsApp tidak sah.")
  }

  return normalized
}

export function isIndonesianPhone(input: string): boolean {
  try {
    normalizeIndonesianPhone(input)
    return true
  } catch {
    return false
  }
}

export const WHATSAPP_VERIFICATION_NUMBER = "6287784454555"

export function whatsappVerificationUrl(token: string): string {
  return `https://wa.me/${WHATSAPP_VERIFICATION_NUMBER}?text=${encodeURIComponent(
    `Verifikasi KalaNidhi: ${token}`,
  )}`
}
