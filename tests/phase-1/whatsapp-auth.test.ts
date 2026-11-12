import { describe, expect, it } from "vitest"

import { api, internal } from "../../convex/_generated/api"
import { createTestDb, seedAccount } from "../helpers/convex"
import { errorCode } from "./fixtures"

function tokenFromWaUrl(waUrl: string): string {
  const text = new URL(waUrl).searchParams.get("text") ?? ""
  return text.replace(/^Verifikasi KalaNidhi:\s*/, "").trim()
}

async function errorCodeOf(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise
    return null
  } catch (error) {
    return errorCode(error)
  }
}

describe("WhatsApp identity", () => {
  it("normalizes the phone, stores the province, and rejects duplicates or unknown provinces", async () => {
    const t = createTestDb()
    await seedAccount(t, { authUserId: "auth-wa-one" })
    await seedAccount(t, { authUserId: "auth-wa-two" })

    const first = t.withIdentity({ subject: "auth-wa-one" })
    const result = await first.mutation(api.users.completeProfile, {
      phone: "0812-3456-7890",
      province: "DI Yogyakarta",
    })

    expect(result.waUrl).toContain(
      "https://wa.me/6287784454555?text=",
    )
    expect(decodeURIComponent(result.waUrl)).toContain(
      "Verifikasi KalaNidhi:",
    )
    expect(result.expiresAt).toBeGreaterThan(Date.now())

    const state = await first.query(api.users.verificationState)
    expect(state?.phone).toBe("6281234567890")
    expect(state?.province).toBe("DI Yogyakarta")
    expect(state?.whatsappVerified).toBe(false)
    expect(state?.pendingExpiresAt).toBeGreaterThan(Date.now())
    expect(JSON.stringify(state)).not.toContain(
      tokenFromWaUrl(result.waUrl),
    )

    const second = t.withIdentity({ subject: "auth-wa-two" })
    expect(
      await errorCodeOf(
        second.mutation(api.users.completeProfile, {
          phone: "6281234567890",
          province: "Bali",
        }),
      ),
    ).toBe("PHONE_TAKEN")

    expect(
      await errorCodeOf(
        first.mutation(api.users.completeProfile, {
          phone: "0812 3456 7891",
          province: "Atlantis",
        }),
      ),
    ).toBe("INVALID_PROVINCE")

    expect(
      await errorCodeOf(
        first.mutation(api.users.completeProfile, {
          phone: "12345",
          province: "Bali",
        }),
      ),
    ).toBe("INVALID_PHONE")
  })

  it("verifies a token only for the matching phone and is idempotent", async () => {
    const t = createTestDb()
    const userId = await seedAccount(t, { authUserId: "auth-wa-verify" })
    const identity = t.withIdentity({ subject: "auth-wa-verify" })

    const profile = await identity.mutation(api.users.completeProfile, {
      phone: "0813-1111-2222",
      province: "Jawa Barat",
    })
    const token = tokenFromWaUrl(profile.waUrl)

    const mismatch = await t.mutation(internal.users.verifyWhatsappToken, {
      token,
      phone: "6289999999999",
    })
    expect(mismatch.status).toBe("phone_mismatch")

    let user = await t.run(async (ctx) => ctx.db.get(userId))
    expect(user?.whatsappVerified).toBe(false)

    const verified = await t.mutation(internal.users.verifyWhatsappToken, {
      token,
      phone: "081311112222",
      messageId: "wamid-1",
    })
    expect(verified.status).toBe("verified")

    user = await t.run(async (ctx) => ctx.db.get(userId))
    expect(user?.phone).toBe("6281311112222")
    expect(user?.whatsappVerified).toBe(true)
    expect(user?.whatsappVerifiedAt).toBeTruthy()

    const again = await t.mutation(internal.users.verifyWhatsappToken, {
      token,
      phone: "6281311112222",
    })
    expect(again.status).toBe("already_verified")

    const audits = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) =>
          q.eq("action", "users.whatsappVerified"),
        )
        .collect(),
    )
    expect(audits).toHaveLength(1)
  })

  it("rejects an expired token without verifying the account", async () => {
    const t = createTestDb()
    const userId = await seedAccount(t, { authUserId: "auth-wa-expired" })
    const identity = t.withIdentity({ subject: "auth-wa-expired" })

    const profile = await identity.mutation(api.users.completeProfile, {
      phone: "0814-2222-3333",
      province: "Bali",
    })
    const token = tokenFromWaUrl(profile.waUrl)

    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query("whatsappVerifications")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect()
      for (const row of rows) {
        await ctx.db.patch(row._id, { expiresAt: Date.now() - 1_000 })
      }
    })

    const result = await t.mutation(internal.users.verifyWhatsappToken, {
      token,
      phone: "6281422223333",
    })
    expect(result.status).toBe("expired")

    const user = await t.run(async (ctx) => ctx.db.get(userId))
    expect(user?.whatsappVerified).toBe(false)
  })

  it("resend expires the previous pending token", async () => {
    const t = createTestDb()
    await seedAccount(t, { authUserId: "auth-wa-resend" })
    const identity = t.withIdentity({ subject: "auth-wa-resend" })

    const first = await identity.mutation(api.users.completeProfile, {
      phone: "0815-3333-4444",
      province: "Jawa Tengah",
    })
    const firstToken = tokenFromWaUrl(first.waUrl)

    const second = await identity.mutation(api.users.resendVerification, {})
    const secondToken = tokenFromWaUrl(second.waUrl)
    expect(secondToken).not.toBe(firstToken)
    expect(second.expiresAt).toBeGreaterThanOrEqual(first.expiresAt)

    const old = await t.mutation(internal.users.verifyWhatsappToken, {
      token: firstToken,
      phone: "6281533334444",
    })
    expect(old.status).toBe("expired")

    const fresh = await t.mutation(internal.users.verifyWhatsappToken, {
      token: secondToken,
      phone: "6281533334444",
    })
    expect(fresh.status).toBe("verified")
  })

  it("marks the bootstrap admin as WhatsApp-verified with the given identity", async () => {
    const t = createTestDb()
    const userId = await seedAccount(t, {
      authUserId: "auth-wa-bootstrap",
      roles: ["student"],
    })

    const adminId = await t.mutation(internal.users.bootstrapAdmin, {
      authUserId: "auth-wa-bootstrap",
      email: "bootstrap@example.test",
      name: "Nadia Kusuma",
      phone: "0816-4444-5555",
      province: "DKI Jakarta",
    })
    expect(adminId).toBe(userId)

    const user = await t.run(async (ctx) => ctx.db.get(userId))
    expect(user?.roles).toEqual(["admin"])
    expect(user?.phone).toBe("6281644445555")
    expect(user?.province).toBe("DKI Jakarta")
    expect(user?.region).toBe("DKI Jakarta")
    expect(user?.whatsappVerified).toBe(true)
  })
})
