import type { MoneySplit } from "./types"

/**
 * One money formula for the whole product.
 *
 * All amounts are integer rupiah. The split is computed on the order
 * `baseAmount`, never on the gateway's `uniqueAmount`; the unique offset is
 * reconciliation cover and is never revenue.
 *
 * Rounding rule (test plan section 4.2): teacher and platform round down,
 * the residue goes to the community fund. The three shares always sum to the
 * base amount and no share is more than one rupiah below its exact value.
 */
export const SPLIT_PERCENTAGES = {
  teacher: 70,
  platform: 15,
  community: 15,
} as const

export const MAX_UNIQUE_OFFSET = 999
export const MIN_UNIQUE_OFFSET = 1

export class MoneyError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "MoneyError"
    this.code = code
  }
}

/** Validates an integer rupiah amount. Zero, negative, fractional, NaN, and strings are rejected. */
export function assertRupiah(value: unknown, field = "amount"): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new MoneyError(
      "INVALID_AMOUNT",
      `${field} harus bilangan bulat rupiah yang positif.`,
    )
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError("INVALID_AMOUNT", `${field} melewati batas aman.`)
  }
  return value
}

/** Validates an amount that may be zero, such as a recorded gateway fee. */
export function assertNonNegativeRupiah(value: unknown, field = "amount"): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new MoneyError(
      "INVALID_AMOUNT",
      `${field} harus bilangan bulat rupiah yang tidak negatif.`,
    )
  }
  return value
}

export function splitAmount(baseAmount: number): MoneySplit {
  const base = assertRupiah(baseAmount, "baseAmount")
  const teacherShare = Math.floor((base * SPLIT_PERCENTAGES.teacher) / 100)
  const platformShare = Math.floor((base * SPLIT_PERCENTAGES.platform) / 100)
  const communityShare = base - teacherShare - platformShare

  return { baseAmount: base, teacherShare, platformShare, communityShare }
}

/**
 * Reverses the same proportions for a full or partial refund. The refund is
 * split with the same function so a full refund reproduces the original rows
 * and a partial refund preserves the 70/15/15 promise.
 */
export function reverseSplit(
  baseAmount: number,
  refundAmount: number,
): MoneySplit {
  const base = assertRupiah(baseAmount, "baseAmount")
  const refund = assertRupiah(refundAmount, "refundAmount")
  if (refund > base) {
    throw new MoneyError(
      "REFUND_EXCEEDS_BASE",
      "Nilai refund tidak boleh melebihi nilai dasar pesanan.",
    )
  }
  return splitAmount(refund)
}

/** The reconciliation offset between the base amount and the payable amount. */
export function uniqueOffset(baseAmount: number, uniqueAmount: number): number {
  const base = assertRupiah(baseAmount, "baseAmount")
  const unique = assertRupiah(uniqueAmount, "uniqueAmount")
  const offset = unique - base
  if (offset < MIN_UNIQUE_OFFSET || offset > MAX_UNIQUE_OFFSET) {
    throw new MoneyError(
      "INVALID_OFFSET",
      "Selisih nilai unik harus antara 1 dan 999 rupiah.",
    )
  }
  return offset
}

/**
 * A gateway fee is absorbed by the platform share. Teacher and community
 * shares never change, even when the fee exceeds the platform share.
 */
export function applyGatewayFee(
  split: MoneySplit,
  gatewayFee: number,
): MoneySplit & { platformNet: number; gatewayFee: number } {
  assertNonNegativeRupiah(gatewayFee, "gatewayFee")
  return {
    ...split,
    gatewayFee,
    platformNet: split.platformShare - gatewayFee,
  }
}

/** Net revenue = GMV − refunds − gateway fees. */
export function netRevenue(input: {
  gross: number
  refunds: number
  gatewayFees: number
}): number {
  assertNonNegativeRupiah(input.gross, "gross")
  assertNonNegativeRupiah(input.refunds, "refunds")
  assertNonNegativeRupiah(input.gatewayFees, "gatewayFees")
  return input.gross - input.refunds - input.gatewayFees
}
