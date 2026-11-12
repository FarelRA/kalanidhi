import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import {
  as,
  createDb,
  enroll,
  errorCode,
  NOW,
  seedCohort,
  seedUser,
  seedWorld,
} from "../phase-4/helpers"
import type { Db } from "../phase-4/helpers"

export { as, createDb, enroll, errorCode, NOW, seedCohort, seedUser, seedWorld }
export type { Db }

export const MINUTE = 60_000

/** Starts a direct conversation through the real messaging mutation. */
export async function directConversation(
  t: Db,
  authUserId: string,
  peerUserId: Id<"users">,
): Promise<Id<"conversations">> {
  return await as(t, authUserId).mutation(api.messaging.startDirect, {
    peerUserId,
  })
}

export async function cohortConversation(
  t: Db,
  authUserId: string,
  cohortId: Id<"cohorts">,
): Promise<Id<"conversations">> {
  return await as(t, authUserId).mutation(api.messaging.startCohort, {
    cohortId,
  })
}

export async function seedBlock(
  t: Db,
  blockerId: Id<"users">,
  blockedId: Id<"users">,
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("blocks", {
      blockerId,
      blockedId,
      reason: "Phase 5 test block",
      createdAt: NOW,
    })
  })
}

export async function seedRestriction(
  t: Db,
  userId: Id<"users">,
  actorId: Id<"users">,
  options: { until?: number; liftedAt?: number } = {},
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("messagingRestrictions", {
      userId,
      actorId,
      reason: "Phase 5 test restriction",
      until: options.until,
      liftedAt: options.liftedAt,
      createdAt: NOW,
    })
  })
}

export async function seedCohortSession(
  t: Db,
  input: {
    cohortId: Id<"cohorts">
    title?: string
    startsAt?: number
    endsAt?: number
    status?: "scheduled" | "live" | "ended" | "cancelled"
    kind?: "session" | "office_hours" | "call" | "assessment"
  },
): Promise<Id<"cohortSessions">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("cohortSessions", {
      cohortId: input.cohortId,
      title: input.title ?? "Sesi kohort",
      kind: input.kind ?? "call",
      startsAt: input.startsAt ?? Date.now() + 60 * MINUTE,
      endsAt: input.endsAt ?? Date.now() + 120 * MINUTE,
      timezone: "Asia/Jakarta",
      status: input.status ?? "scheduled",
      createdAt: NOW,
    })
  })
}

export async function seedExtraStudents(
  t: Db,
  input: {
    cohortId: Id<"cohorts">
    count: number
    pathId?: string
  },
): Promise<Id<"users">[]> {
  const students: Id<"users">[] = []
  for (let index = 0; index < input.count; index += 1) {
    const userId = await seedUser(t, {
      authUserId: `auth-extra-${index}`,
      name: `Peserta Tambahan ${index + 1}`,
      roles: ["student"],
    })
    await enroll(t, {
      studentId: userId,
      cohortId: input.cohortId,
      pathId: input.pathId ?? "batik-tulis-soga",
    })
    students.push(userId)
  }
  return students
}

export async function readCall(t: Db, callId: Id<"callSessions">) {
  return await t.run(async (ctx) => ctx.db.get(callId))
}

export async function callEvents(t: Db, callId: Id<"callSessions">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("callEvents")
      .withIndex("by_callId", (q) => q.eq("callId", callId))
      .collect(),
  )
}

export async function participantRows(t: Db, callId: Id<"callSessions">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("callParticipants")
      .withIndex("by_callId", (q) => q.eq("callId", callId))
      .collect(),
  )
}
