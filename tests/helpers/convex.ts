import { convexTest } from "convex-test"

import schema from "../../convex/schema"
import type { Id } from "../../convex/_generated/dataModel"

/** Convex test database backed by the real schema. */
export function createTestDb() {
  return convexTest(schema)
}

export type TestDb = ReturnType<typeof createTestDb>

const NOW = 1_760_000_000_000

/** Seeds an application account and its append-only role grants. */
export async function seedAccount(
  t: TestDb,
  input: {
    authUserId: string
    email?: string
    name?: string
    roles?: ("student" | "teacher" | "admin")[]
    status?: "active" | "suspended" | "invited" | "deleted"
    emailVerified?: boolean
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const roles = input.roles ?? ["student"]
    const userId = await ctx.db.insert("users", {
      authUserId: input.authUserId,
      name: input.name ?? input.authUserId,
      email: input.email ?? `${input.authUserId}@example.test`,
      emailVerified: input.emailVerified ?? true,
      initials: "TA",
      region: "Yogyakarta",
      roles,
      status: input.status ?? "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    for (const role of roles) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role,
        action: "grant",
        actorId: "system",
        reason: "Test setup",
        createdAt: NOW,
      })
    }
    return userId
  })
}
