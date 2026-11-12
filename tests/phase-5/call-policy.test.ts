import { describe, expect, it } from "vitest"

import {
  CALL_CAPACITY,
  CALL_ROOM_PREFIX,
  canJoinCall,
  callScopeFor,
  consentState,
  internalKindFor,
  isTerminalCallStatus,
  joinBlockedReason,
  publicKindFor,
  qualitySummaryFor,
  roomNameForCall,
} from "@/lib/calls/policy"

describe("calls / policy", () => {
  it("[P5-CALL-07b] room names are deterministic, prefixed, and derived only from the call id", () => {
    expect(roomNameForCall("abc123")).toBe(`${CALL_ROOM_PREFIX}abc123`)
    expect(roomNameForCall("abc123")).toBe(roomNameForCall("abc123"))
    expect(roomNameForCall("abc123")).not.toBe(roomNameForCall("abc124"))
  })

  it("[P5-CALL-07c] the cohort participant cap is 25", () => {
    expect(CALL_CAPACITY).toBe(25)
  })

  it("[P5-CALL-08d] the waiting room admits the host but not the guest", () => {
    expect(
      canJoinCall({ status: "ringing", viewerRole: "host", monitorOnly: false }),
    ).toBe(true)
    expect(
      canJoinCall({ status: "ringing", viewerRole: "guest", monitorOnly: false }),
    ).toBe(false)
    expect(
      canJoinCall({ status: "active", viewerRole: "guest", monitorOnly: false }),
    ).toBe(true)
    expect(
      canJoinCall({ status: "active", viewerRole: "host", monitorOnly: true }),
    ).toBe(false)
  })

  it("[P5-CALL-08e] blocked, restricted, and terminal states expose stable reasons", () => {
    expect(
      joinBlockedReason({
        status: "scheduled",
        viewerRole: "host",
        monitorOnly: false,
      }),
    ).toBe("CALL_NOT_STARTED")
    expect(
      joinBlockedReason({
        status: "ringing",
        viewerRole: "guest",
        monitorOnly: false,
      }),
    ).toBe("WAITING_FOR_HOST")
    expect(
      joinBlockedReason({
        status: "ended",
        viewerRole: "guest",
        monitorOnly: false,
      }),
    ).toBe("CALL_ENDED")
    expect(isTerminalCallStatus("declined")).toBe(true)
    expect(isTerminalCallStatus("active")).toBe(false)
  })

  it("[P5-CALL-07d] call kinds map between the public and stored vocabulary", () => {
    expect(internalKindFor("audio")).toBe("voice")
    expect(internalKindFor("video")).toBe("video")
    expect(publicKindFor("voice")).toBe("audio")
    expect(publicKindFor("cohort")).toBe("audio")
    expect(publicKindFor("video")).toBe("video")
  })

  it("[P5-CALL-07e] scope is derived from origin, never from a client argument", () => {
    expect(
      callScopeFor({ conversationKind: "direct" }),
    ).toBe("direct")
    expect(
      callScopeFor({ conversationKind: "support" }),
    ).toBe("support")
    expect(
      callScopeFor({ conversationKind: "cohort" }),
    ).toBe("cohort")
    expect(
      callScopeFor({ cohortSessionId: "session-1" }),
    ).toBe("cohort")
  })

  it("[P5-CALL-14c] recording consent requires every participant and a refusal is terminal", () => {
    expect(
      consentState({
        participantIds: ["a", "b"],
        consentedIds: [],
        declinedIds: [],
      }),
    ).toBe("pending")
    expect(
      consentState({
        participantIds: ["a", "b"],
        consentedIds: ["a"],
        declinedIds: [],
      }),
    ).toBe("pending")
    expect(
      consentState({
        participantIds: ["a", "b"],
        consentedIds: ["a", "b"],
        declinedIds: [],
      }),
    ).toBe("both")
    expect(
      consentState({
        participantIds: ["a", "b"],
        consentedIds: ["a", "b"],
        declinedIds: ["b"],
      }),
    ).toBe("declined")
  })

  it("[P5-CALL-17b] the quality summary is built from records and bounded", () => {
    expect(qualitySummaryFor([])).toBeNull()
    expect(
      qualitySummaryFor([
        { name: "Anisa", quality: "excellent" },
        { name: "Bambang", quality: null },
      ]),
    ).toBe("Anisa: excellent")
    expect(
      qualitySummaryFor([
        { name: "A".repeat(200), quality: "good" },
      ])?.length,
    ).toBeLessThanOrEqual(240)
  })
})
