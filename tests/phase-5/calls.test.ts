import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import {
  as,
  callEvents,
  cohortConversation,
  createDb,
  directConversation,
  errorCode,
  participantRows,
  readCall,
  seedBlock,
  seedCohortSession,
  seedExtraStudents,
  seedRestriction,
  seedUser,
  seedWorld,
} from "./helpers"

describe("calls / origin and membership", () => {
  it("[P5-CALL-03] a teacher can call a student who shares their cohort conversation", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )

    const { callId } = await as(t, "auth-teacher").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    const call = await as(t, "auth-teacher").query(api.calls.getCall, { callId })
    expect(call.status).toBe("ringing")
    expect(call.kind).toBe("video")
    expect(call.scope).toBe("direct")
    expect(call.viewerRole).toBe("host")
    expect(call.participants.map((item) => item.userId).sort()).toEqual(
      [world.teacherId, world.studentId].sort(),
    )
  })

  it("[P5-CALL-02] calls must originate from an allowed conversation or scheduled session", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )

    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.calls.startCall, {
          conversationId,
          kind: "audio",
        }),
      ),
    ).toBe("NOT_FOUND")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, { kind: "audio" }),
      ),
    ).toBe("INVALID_ARGUMENT")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, {
          conversationId,
          cohortSessionId: await seedCohortSession(t, {
            cohortId: world.cohortId,
          }),
          kind: "audio",
        }),
      ),
    ).toBe("INVALID_ARGUMENT")

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, {
          conversationId,
          kind: "audio",
        }),
      ),
    ).toBeNull()
  })

  it("[P5-CALL-10] a cohort call is capped at 25 participants", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    await seedExtraStudents(t, { cohortId: world.cohortId, count: 26 })
    const conversationId = await cohortConversation(
      t,
      "auth-teacher",
      world.cohortId,
    )

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.calls.startCall, {
          conversationId,
          kind: "video",
        }),
      ),
    ).toBe("CALL_CAPACITY")
  })

  it("[P5-CALL-03b] only the cohort teacher starts a cohort session call", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const sessionId = await seedCohortSession(t, {
      cohortId: world.cohortId,
      title: "Sesi batik pekan ini",
    })

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, {
          cohortSessionId: sessionId,
          kind: "audio",
        }),
      ),
    ).toBe("FORBIDDEN")

    const { callId } = await as(t, "auth-teacher").mutation(api.calls.startCall, {
      cohortSessionId: sessionId,
      kind: "audio",
    })
    const call = await as(t, "auth-teacher").query(api.calls.getCall, { callId })
    expect(call.scope).toBe("cohort")
    expect(call.title).toBe("Sesi batik pekan ini")
    expect(call.cohortSessionId).toBe(sessionId)
    expect(call.participants.map((item) => item.userId)).toContain(
      world.studentId,
    )
  })
})

describe("calls / blocks, restrictions, and account state", () => {
  it("[P5-CALL-05] a block in either direction prevents a direct call and a join", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )

    await seedBlock(t, world.teacherId, world.studentId)
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, {
          conversationId,
          kind: "audio",
        }),
      ),
    ).toBe("BLOCKED")

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("blocks").collect()
      for (const row of rows) await ctx.db.delete(row._id)
    })
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    await seedBlock(t, world.studentId, world.teacherId)
    const blocked = await as(t, "auth-teacher").query(api.calls.getCall, {
      callId,
    })
    expect(blocked.canJoin).toBe(false)
    expect(blocked.joinBlockedReason).toBe("BLOCKED")
  })

  it("[P5-CALL-05b] an active messaging restriction blocks calls and joins", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )

    await seedRestriction(t, world.studentId, world.adminId)
    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.startCall, {
          conversationId,
          kind: "audio",
        }),
      ),
    ).toBe("MESSAGING_SUSPENDED")

    await t.run(async (ctx) => {
      const rows = await ctx.db.query("messagingRestrictions").collect()
      for (const row of rows) await ctx.db.delete(row._id)
    })
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    await seedRestriction(t, world.teacherId, world.adminId)
    const restricted = await as(t, "auth-teacher").query(api.calls.getCall, {
      callId,
    })
    expect(restricted.canJoin).toBe(false)
    expect(restricted.joinBlockedReason).toBe("MESSAGING_SUSPENDED")
  })

  it("[P5-CALL-05c] a lifted restriction no longer blocks a call", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    await seedRestriction(t, world.studentId, world.adminId, {
      liftedAt: Date.now(),
    })

    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    expect(callId).toBeTruthy()
  })

  it("[P5-CALL-05d] a suspended account cannot start or read calls", async () => {
    const t = createDb()
    await seedUser(t, {
      authUserId: "auth-suspended",
      name: "Akun Ditangguhkan",
      roles: ["student"],
      status: "suspended",
    })

    expect(
      await errorCode(as(t, "auth-suspended").query(api.calls.listUpcoming, {})),
    ).toBe("SUSPENDED")
    expect(
      await errorCode(
        as(t, "auth-suspended").mutation(api.calls.startCall, {
          kind: "audio",
        }),
      ),
    ).toBe("SUSPENDED")
  })
})

describe("calls / state machine", () => {
  it("[P5-CALL-08] ringing becomes active only when the host accepts", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    const guestAccept = await as(t, "auth-teacher").mutation(api.calls.accept, {
      callId,
    })
    expect(guestAccept.waiting).toBe(true)
    expect((await readCall(t, callId))?.status).toBe("ringing")

    const hostAccept = await as(t, "auth-student").mutation(api.calls.accept, {
      callId,
    })
    expect(hostAccept.status).toBe("active")
    const active = await readCall(t, callId)
    expect(active?.status).toBe("active")
    expect(active?.startedAt).toBeTypeOf("number")

    const ended = await as(t, "auth-student").mutation(api.calls.end, { callId })
    expect(ended.status).toBe("ended")
    expect(ended.durationMs).toBeGreaterThanOrEqual(0)

    const endedAgain = await as(t, "auth-student").mutation(api.calls.end, {
      callId,
    })
    expect(endedAgain.durationMs).toBe(ended.durationMs)
    const events = await callEvents(t, callId)
    expect(events.filter((event) => event.kind === "ended")).toHaveLength(1)

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.calls.accept, { callId }),
      ),
    ).toBe("INVALID_TRANSITION")
  })

  it("[P5-CALL-08b] a guest cannot end the call for everyone", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    await as(t, "auth-student").mutation(api.calls.accept, { callId })

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.calls.end, { callId }),
      ),
    ).toBe("FORBIDDEN")
  })

  it("[P5-CALL-21] declining a direct call writes a terminal state and notifies the host", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    await as(t, "auth-teacher").mutation(api.calls.decline, {
      callId,
      reason: "Sedang mengajar",
    })
    const call = await readCall(t, callId)
    expect(call?.status).toBe("declined")
    expect(call?.endedAt).toBeTypeOf("number")

    const events = await callEvents(t, callId)
    expect(events.map((event) => event.kind)).toContain("declined")
    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notificationOutbox").collect(),
    )
    expect(notifications.some((row) => row.template === "call.declined")).toBe(
      true,
    )
  })

  it("[P5-CALL-21b] a missed ringing call writes a terminal state", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    await as(t, "auth-student").mutation(api.calls.markMissed, { callId })
    expect((await readCall(t, callId))?.status).toBe("missed")
    expect((await callEvents(t, callId)).map((event) => event.kind)).toContain(
      "missed",
    )
  })

  it("[P5-CALL-17] joining, quality, and ending record participant times and a quality summary", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    await as(t, "auth-student").mutation(api.calls.accept, { callId })
    await as(t, "auth-teacher").mutation(api.calls.accept, { callId })
    await as(t, "auth-teacher").mutation(api.calls.recordParticipant, {
      callId,
      event: "join",
      quality: "good",
    })
    await as(t, "auth-student").mutation(api.calls.recordParticipant, {
      callId,
      event: "quality",
      quality: "excellent",
    })
    await as(t, "auth-student").mutation(api.calls.end, { callId })

    const call = await readCall(t, callId)
    expect(call?.qualitySummary).toContain("excellent")
    expect(call?.durationMs).toBeGreaterThanOrEqual(0)
    const participants = await participantRows(t, callId)
    expect(participants.every((row) => row.leftAt !== undefined)).toBe(true)
    expect(
      participants.some((row) => row.quality === "excellent"),
    ).toBe(true)
  })
})

describe("calls / scheduled lifecycle", () => {
  it("[P5-CALL-22] a scheduled call can be listed, cancelled, and never activated", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const startsAt = Date.now() + 60 * 60_000

    const { callId } = await as(t, "auth-student").mutation(api.calls.scheduleCall, {
      conversationId,
      kind: "video",
      startsAt,
    })
    const upcoming = await as(t, "auth-student").query(api.calls.listUpcoming, {})
    expect(upcoming.map((item) => item.id)).toContain(callId)
    expect(upcoming.find((item) => item.id === callId)?.status).toBe("scheduled")

    await as(t, "auth-student").mutation(api.calls.cancelCall, {
      callId,
      reason: "Jadwal bergeser",
    })
    expect((await readCall(t, callId))?.status).toBe("cancelled")
    const afterCancel = await as(t, "auth-student").query(api.calls.listUpcoming, {})
    expect(afterCancel.map((item) => item.id)).not.toContain(callId)
    const history = await as(t, "auth-student").query(api.calls.listHistory, {})
    expect(history.map((item) => item.id)).toContain(callId)

    expect(
      await errorCode(
        as(t, "auth-student").mutation(api.calls.accept, { callId }),
      ),
    ).toBe("INVALID_TRANSITION")
  })

  it("[P5-CALL-22b] a scheduled call follows scheduled -> ringing -> active -> ended", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const startsAt = Date.now() + 10 * 60_000
    const { callId } = await as(t, "auth-student").mutation(api.calls.scheduleCall, {
      conversationId,
      kind: "audio",
      startsAt,
    })

    expect(
      await errorCode(
        as(t, "auth-teacher").mutation(api.calls.ring, { callId }),
      ),
    ).toBe("FORBIDDEN")
    await as(t, "auth-student").mutation(api.calls.ring, { callId })
    expect((await readCall(t, callId))?.status).toBe("ringing")
    await as(t, "auth-student").mutation(api.calls.accept, { callId })
    expect((await readCall(t, callId))?.status).toBe("active")
    await as(t, "auth-student").mutation(api.calls.end, { callId })
    expect((await readCall(t, callId))?.status).toBe("ended")

    const history = await as(t, "auth-teacher").query(api.calls.listHistory, {})
    expect(history.map((item) => item.id)).toContain(callId)
  })

  it("[P5-CALL-22c] scheduling from a cohort session uses the session window and roster", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const startsAt = Date.now() + 2 * 60 * 60_000
    const sessionId = await seedCohortSession(t, {
      cohortId: world.cohortId,
      title: "Panggilan kohort",
      startsAt,
      endsAt: startsAt + 60 * 60_000,
    })

    const { callId } = await as(t, "auth-teacher").mutation(api.calls.scheduleCall, {
      cohortSessionId: sessionId,
      kind: "video",
    })
    const call = await as(t, "auth-teacher").query(api.calls.getCall, { callId })
    expect(call.status).toBe("scheduled")
    expect(call.scheduledAt).toBe(startsAt)
    expect(call.participants.map((item) => item.userId)).toContain(
      world.studentId,
    )
  })
})

describe("calls / participant scope, IDOR, and admin monitoring", () => {
  it("[P5-CALL-05e] a non-participant sees not found and cannot mutate the call", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    expect(
      await errorCode(as(t, "auth-outsider").query(api.calls.getCall, { callId })),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.calls.accept, { callId }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.calls.recordParticipant, {
          callId,
          event: "join",
        }),
      ),
    ).toBe("NOT_FOUND")
    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.calls.end, { callId }),
      ),
    ).toBe("NOT_FOUND")
    const upcoming = await as(t, "auth-outsider").query(
      api.calls.listUpcoming,
      {},
    )
    expect(upcoming).toEqual([])
  })

  it("[P5-CALL-04] an admin monitors metadata but never gets a participant view", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    const monitored = await as(t, "auth-admin").query(api.calls.getCall, {
      callId,
    })
    expect(monitored.monitorOnly).toBe(true)
    expect(monitored.canJoin).toBe(false)
    expect(monitored.viewerRole).toBeNull()
    expect(monitored.participants).toHaveLength(2)

    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.calls.startCall, {
          conversationId,
          kind: "video",
        }),
      ),
    ).toBe("FORBIDDEN")
    expect(
      await errorCode(
        as(t, "auth-admin").mutation(api.calls.setRecordingConsent, {
          callId,
          consent: true,
        }),
      ),
    ).toBe("FORBIDDEN")
  })

  it("[P5-CALL-04b] call overview reports operational counts from records", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    const overview = await as(t, "auth-admin").query(api.calls.callOverview, {})
    expect(overview.counts.ringing).toBe(1)
    expect(overview.counts.active).toBe(0)
    expect(overview.recent.length).toBeGreaterThanOrEqual(1)
  })
})

describe("calls / recording consent", () => {
  it("[P5-CALL-14] recording is off by default and requires both parties", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    const initial = await as(t, "auth-student").query(api.calls.getCall, {
      callId,
    })
    expect(initial.recordingConsent).toBe("pending")
    expect(initial.recordingEnabled).toBe(false)
    expect(initial.recordingConsentRequired).toBe(2)
    expect(initial.recordings).toEqual([])

    const first = await as(t, "auth-student").mutation(
      api.calls.setRecordingConsent,
      { callId, consent: true },
    )
    expect(first.recordingConsent).toBe("pending")
    expect(first.recordingEnabled).toBe(false)

    const both = await as(t, "auth-teacher").mutation(
      api.calls.setRecordingConsent,
      { callId, consent: true },
    )
    expect(both.recordingConsent).toBe("both")
    expect(both.recordingEnabled).toBe(false)

    expect(
      await errorCode(
        as(t, "auth-outsider").mutation(api.calls.setRecordingConsent, {
          callId,
          consent: true,
        }),
      ),
    ).toBe("NOT_FOUND")
  })

  it("[P5-CALL-14c] call detail reads recording metadata with consent names and access count", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    const retentionUntil = Date.now() + 30 * 86_400_000
    await t.run(async (ctx) => {
      const assetId = await ctx.storage.store(new Blob(["recording"]))
      await ctx.db.insert("callRecordings", {
        callId,
        assetId,
        consentedBy: [world.studentId, world.teacherId],
        retentionUntil,
        accessLog: [
          {
            actorId: world.adminId,
            reason: "Meninjau sengketa penilaian",
            accessedAt: Date.now(),
          },
        ],
        createdAt: Date.now(),
      })
    })

    const call = await as(t, "auth-student").query(api.calls.getCall, { callId })
    expect(call.recordings).toHaveLength(1)
    expect(call.recordings[0]?.retentionUntil).toBe(retentionUntil)
    expect(call.recordings[0]?.accessLogCount).toBe(1)
    expect(call.recordings[0]?.consentedBy.map((item) => item.userId).sort()).toEqual(
      [world.studentId, world.teacherId].sort(),
    )
    expect(call.recordings[0]?.consentedBy.map((item) => item.name)).toContain(
      "Bambang Hardjono",
    )
  })

  it("[P5-CALL-14b] one refusal keeps recording declined and cannot be reopened by the other party", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })

    const declined = await as(t, "auth-teacher").mutation(
      api.calls.setRecordingConsent,
      { callId, consent: false },
    )
    expect(declined.recordingConsent).toBe("declined")
    expect(declined.recordingEnabled).toBe(false)

    const reopened = await as(t, "auth-student").mutation(
      api.calls.setRecordingConsent,
      { callId, consent: true },
    )
    expect(reopened.recordingConsent).toBe("declined")
    expect(reopened.recordingEnabled).toBe(false)
  })
})

describe("calls / room naming", () => {
  it("[P5-CALL-07] room names are server-derived from the call and never client supplied", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    const call = await readCall(t, callId)
    expect(call?.roomName).toBe(`kn-call-${callId}`)

    const stored = await as(t, "auth-student").query(api.calls.getCall, {
      callId,
    })
    expect(stored.roomName).toBe(`kn-call-${callId}`)
  })
})

describe("calls / end metadata", () => {
  it("[P5-CALL-23] call detail exposes who ended the call, the reason, and the stored recording flag", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "audio",
    })
    await as(t, "auth-student").mutation(api.calls.accept, { callId })
    await as(t, "auth-student").mutation(api.calls.end, {
      callId,
      reason: "Sesi selesai lebih awal",
    })

    const ended = await as(t, "auth-student").query(api.calls.getCall, {
      callId,
    })
    expect(ended.endedBy).toBe(world.studentId)
    expect(ended.endedByName).toBe("Anisa Rahmawati")
    expect(ended.endReason).toBe("Sesi selesai lebih awal")
    expect(ended.cancelledAt).toBeNull()
    expect(ended.recordingEnabled).toBe(false)

    await t.run(async (ctx) => {
      await ctx.db.patch(callId, { recordingEnabled: true })
    })
    const stored = await as(t, "auth-student").query(api.calls.getCall, {
      callId,
    })
    expect(stored.recordingEnabled).toBe(true)
  })

  it("[P5-CALL-24] a cancelled call exposes cancelledAt and the cancellation reason", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.scheduleCall, {
      conversationId,
      kind: "video",
      startsAt: Date.now() + 60 * 60_000,
    })
    await as(t, "auth-student").mutation(api.calls.cancelCall, {
      callId,
      reason: "Jadwal bergeser",
    })

    const cancelled = await as(t, "auth-student").query(api.calls.getCall, {
      callId,
    })
    expect(cancelled.status).toBe("cancelled")
    expect(cancelled.cancelledAt).toBeTypeOf("number")
    expect(cancelled.endReason).toBe("Jadwal bergeser")
    expect(cancelled.endedByName).toBeNull()
  })
})

describe("calls / reporting", () => {
  it("[P5-CALL-20] a call report creates a moderation notice and never enables recording", async () => {
    const t = createDb()
    const world = await seedWorld(t)
    const conversationId = await directConversation(
      t,
      "auth-student",
      world.teacherId,
    )
    const { callId } = await as(t, "auth-student").mutation(api.calls.startCall, {
      conversationId,
      kind: "video",
    })

    await as(t, "auth-teacher").mutation(api.calls.reportCall, {
      callId,
      reason: "Peserta lain meminta data pribadi",
    })
    const audit = await t.run(async (ctx) =>
      ctx.db.query("auditLogs").collect(),
    )
    expect(audit.some((row) => row.action === "calls.report")).toBe(true)
    const notifications = await t.run(async (ctx) =>
      ctx.db.query("notificationOutbox").collect(),
    )
    expect(
      notifications.some((row) => row.template === "call.reported"),
    ).toBe(true)
    expect((await readCall(t, callId))?.recordingConsent).toBe("pending")
  })
})
