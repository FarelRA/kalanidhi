import { describe, expect, it } from "vitest"

import {
  applyGatewayFee,
  assertRupiah,
  MoneyError,
  netRevenue,
  reverseSplit,
  splitAmount,
  uniqueOffset,
} from "@/lib/commerce/money"
import { createRateLimiter } from "@/lib/commerce/rate-limit"

describe("money / 70 15 15 split", () => {
  it("[P3-PAY-01] 1,450,000 splits into 1,015,000 / 217,500 / 217,500", () => {
    expect(splitAmount(1_450_000)).toEqual({
      baseAmount: 1_450_000,
      teacherShare: 1_015_000,
      platformShare: 217_500,
      communityShare: 217_500,
    })
  })

  it("[P3-PAY-02] 1,000,001 splits exactly with residue to the community fund", () => {
    const split = splitAmount(1_000_001)
    expect(split.teacherShare).toBe(700_000)
    expect(split.platformShare).toBe(150_000)
    expect(split.communityShare).toBe(150_001)
    expect(split.teacherShare + split.platformShare + split.communityShare).toBe(
      split.baseAmount,
    )
  })

  it("[P3-PAY-03] 1, 999, and 1,000,000,000 have no float drift", () => {
    for (const amount of [1, 999, 1_000_000_000]) {
      const split = splitAmount(amount)
      expect(split.baseAmount).toBe(amount)
      expect(split.teacherShare + split.platformShare + split.communityShare).toBe(
        amount,
      )
      for (const share of [
        split.teacherShare,
        split.platformShare,
        split.communityShare,
      ]) {
        expect(Number.isInteger(share)).toBe(true)
        expect(share).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("[P3-PAY-04] zero, negative, fractional, NaN, and string amounts are rejected", () => {
    for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => assertRupiah(value)).toThrow(MoneyError)
      expect(() => splitAmount(value)).toThrow(MoneyError)
    }
    expect(() => assertRupiah("1450000" as unknown)).toThrow(MoneyError)
  })

  it("[P3-PAY-05] the split ignores the unique offset and uses the base amount", () => {
    const base = splitAmount(1_450_000)
    const payable = 1_450_037
    expect(uniqueOffset(1_450_000, payable)).toBe(37)
    expect(splitAmount(1_450_000)).toEqual(base)
    expect(base.teacherShare).not.toBe(splitAmount(payable).teacherShare)
  })

  it("[P3-PAY-20] the unique offset is an integer in 1-999", () => {
    expect(uniqueOffset(1_000, 1_001)).toBe(1)
    expect(uniqueOffset(1_000, 1_999)).toBe(999)
    expect(() => uniqueOffset(1_000, 1_000)).toThrow(MoneyError)
    expect(() => uniqueOffset(1_000, 2_000)).toThrow(MoneyError)
  })

  it("[P3-PAY-06] a gateway fee reduces only the platform share", () => {
    const split = splitAmount(1_000_000)
    const withFee = applyGatewayFee(split, 12_500)
    expect(withFee.teacherShare).toBe(700_000)
    expect(withFee.communityShare).toBe(150_000)
    expect(withFee.platformNet).toBe(137_500)
  })

  it("[P3-PAY-07] a fee larger than the platform share never makes the teacher share negative", () => {
    const split = splitAmount(100_000)
    const withFee = applyGatewayFee(split, 20_000)
    expect(withFee.platformNet).toBe(-5_000)
    expect(withFee.teacherShare).toBe(70_000)
    expect(withFee.communityShare).toBe(15_000)
  })

  it("[P3-PAY-08] net revenue equals GMV minus refunds minus gateway fees", () => {
    expect(
      netRevenue({ gross: 2_000_000, refunds: 250_000, gatewayFees: 15_000 }),
    ).toBe(1_735_000)
  })

  it("[P3-PAY-61] partial refunds reverse the same proportions and sum exactly", () => {
    const split = reverseSplit(1_000_000, 333_333)
    expect(split.teacherShare + split.platformShare + split.communityShare).toBe(
      333_333,
    )
    expect(split.teacherShare).toBe(233_333)
    expect(split.platformShare).toBe(49_999)
    expect(split.communityShare).toBe(50_001)
  })

  it("[P3-PAY-60] a full refund reproduces the original split", () => {
    expect(reverseSplit(1_450_000, 1_450_000)).toEqual(splitAmount(1_450_000))
  })
})

describe("checkout rate limit", () => {
  it("[P3-ORD-02] checkout attempts are limited per client", () => {
    let clock = 1_000
    const limiter = createRateLimiter({
      limit: 2,
      windowMs: 1_000,
      now: () => clock,
    })
    expect(limiter.consume("ip").allowed).toBe(true)
    expect(limiter.consume("ip").allowed).toBe(true)
    const blocked = limiter.consume("ip")
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBe(1_000)
    clock += 1_000
    expect(limiter.consume("ip").allowed).toBe(true)
  })
})
