/**
 * Constant-time string comparison for shared secrets. A missing or empty
 * expected value always fails closed.
 */
export function constantTimeEqual(
  supplied: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || !supplied || supplied.length !== expected.length) {
    return false
  }

  let mismatch = 0
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= expected.charCodeAt(index) ^ supplied.charCodeAt(index)
  }
  return mismatch === 0
}
