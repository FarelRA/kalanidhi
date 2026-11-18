/**
 * Seed auth provisioning helpers.
 *
 * The seed inserts app users before Better Auth knows about them, so every
 * seeded account starts with a placeholder subject (`seed-*`). Provisioning
 * signs the address up once, then links the real Better Auth subject back to
 * the original app row. The mapping lives outside `CLEAR_TABLES`, so a reseed
 * reuses the same auth account instead of tripping `USER_ALREADY_EXISTS`.
 */

/** Documented seed-only password. Never use it for a real account. */
export const SEED_PASSWORD = "KalaNidhi2026!"

/** Subjects created by the seed before Better Auth provisioning. */
export function isPlaceholderAuthId(authUserId: string): boolean {
  return authUserId.startsWith("seed-")
}

export function normalizeSeedEmail(email: string): string {
  return email.trim().toLowerCase()
}

export type SeedAuthUser = {
  _id: string
  name: string
  email: string
  authUserId: string
  roles: string[]
  status: string
}

export type SeedAuthMapping = {
  email: string
  authUserId: string
}

/**
 * Accounts that still need a Better Auth subject. The preserved admin already
 * has a real subject, so it is never touched. Accounts without an email are
 * skipped because Better Auth signs up by address. A mapped email is returned
 * with its existing subject so a reseed can relink without signing up again.
 */
export function authCandidates(
  users: SeedAuthUser[],
  mappings: SeedAuthMapping[],
): Array<{
  userId: string
  name: string
  email: string
  authUserId?: string
}> {
  const mapped = new Map(
    mappings.map((row) => [
      normalizeSeedEmail(row.email),
      row.authUserId,
    ]),
  )
  const seen = new Set<string>()
  const candidates: Array<{
    userId: string
    name: string
    email: string
    authUserId?: string
  }> = []
  for (const user of users) {
    if (user.status === "deleted") continue
    if (!user.email || !user.email.includes("@")) continue
    if (!isPlaceholderAuthId(user.authUserId)) continue
    const email = normalizeSeedEmail(user.email)
    if (seen.has(email)) continue
    seen.add(email)
    candidates.push({
      userId: user._id,
      name: user.name,
      email,
      authUserId: mapped.get(email),
    })
  }
  return candidates
}

/**
 * Keeps one original app row per email and points it at the Better Auth
 * subject. The trigger-created duplicate is the one whose `authUserId`
 * already equals that subject.
 */
export function linkPlan(input: {
  originalUserId: string
  authUserId: string
  users: Array<{ _id: string; authUserId: string; email: string }>
}): { originalUserId: string; duplicateUserIds: string[] } {
  const duplicates = input.users
    .filter(
      (user) =>
        user._id !== input.originalUserId &&
        user.authUserId === input.authUserId,
    )
    .map((user) => user._id)
  return { originalUserId: input.originalUserId, duplicateUserIds: duplicates }
}
