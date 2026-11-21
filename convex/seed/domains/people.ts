import { v } from "convex/values"

import type { Doc } from "../../_generated/dataModel"
import { internalMutation } from "../../_generated/server"
import { createSeedClock, DAY, HOUR } from "../lib/clock"
import { sha256 } from "../lib/hash"
import {
  accountSuffix,
  insertSeedUser,
  USER_AGENTS,
} from "../lib/identity"
import { teachersSeed as SEED_TEACHERS } from "../content/data"
import {
  SEED_ADMIN_PROFILE,
  SEED_USERS,
  seedEmail,
} from "../content/identities"

export const seedPeople = internalMutation({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    const clock = createSeedClock(args.now)
    const existing = await ctx.db.query("users").collect()
    const existingAdmin = existing.find(
      (user) => user.roles.includes("admin") && user.status === "active",
    )

    const adminResult = await insertSeedUser(
      ctx,
      {
        key: "admin",
        name: SEED_ADMIN_PROFILE.name,
        email: existingAdmin?.email ?? SEED_ADMIN_PROFILE.email,
        phone: SEED_ADMIN_PROFILE.phone,
        province: SEED_ADMIN_PROFILE.province,
        region: SEED_ADMIN_PROFILE.region,
        initials: SEED_ADMIN_PROFILE.initials,
        roles: ["admin"],
        createdAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
        updatedAt: clock.now,
        authUserId: existingAdmin?.authUserId ?? "seed-admin",
        existing: existingAdmin,
        roleActorId: "system",
        roleReason: "Admin bootstrap preserved across seed",
        includeMarketing: false,
        consentOverrides: {
          privacy: {
            source: "bootstrap",
            grantedAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
            createdAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
          },
          recording: {
            source: "bootstrap",
            grantedAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
            createdAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
          },
        },
        session: {
          authSessionId: "seed-session-admin",
          deviceName: "Peramban",
          userAgent: USER_AGENTS[1],
          createdAt: clock.ago(1),
          lastSeenAt: clock.ago(0),
          // Historical device: keep the row for the account history, but never
          // present it as a live session.
          expiresAt: clock.now - HOUR,
          onlyIfMissing: true,
        },
        authLog: {
          authUserId: existingAdmin?.authUserId ?? "seed-admin",
          ipHash: "seed-ip-admin",
          userAgent: USER_AGENTS[1],
          createdAt: clock.ago(1),
        },
        whatsapp: {
          expiresAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1),
          createdAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
          verifiedAt:
            clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 1) + 2 * HOUR,
          messageId: "seed-wa-admin",
        },
      },
      clock.now,
    )
    const admin = adminResult.user

    const byKey = new Map<string, Doc<"users">>()
    byKey.set("admin", admin)

    const teacherIndex = new Map(
      SEED_TEACHERS.map((teacher, index) => [teacher.key, index] as const),
    )
    const graduates = new Set(["anisa", "dimas", "purnomo"])

    const sellerFor = (seed: (typeof SEED_USERS)[number]) => {
      const teacher = SEED_TEACHERS.find((row) => row.key === seed.key)
      if (teacher) {
        const index = teacherIndex.get(teacher.key) ?? 0
        const active = teacher.status === "active"
        return {
          displayName: teacher.name,
          status: active ? ("active" as const) : ("pending" as const),
          onboardingChecklist: {
            payoutAccount: active,
            consent: true,
            firstWorkCard: active,
            taxDetails: active,
          },
          activatedAt: active ? clock.ago(120 - index * 9) : undefined,
          createdAt: clock.ago(126 - index * 9),
          updatedAt: clock.now,
          payout: active
            ? {
                bankCode: seed.key === "zadira" ? "BRI" : "BCA",
                accountName: teacher.name,
                accountNumberMasked: `****${accountSuffix(teacher.name)}`,
                accountRef: `vault:seed:${seed.key}`,
                verifiedBy: admin._id,
                verifiedAt: clock.ago(122 - index * 9),
                createdAt: clock.ago(124 - index * 9),
                updatedAt: clock.now,
              }
            : undefined,
        }
      }
      if (graduates.has(seed.key)) {
        const offset = 0
        return {
          displayName: seed.name,
          status: "active" as const,
          onboardingChecklist: {
            payoutAccount: true,
            consent: true,
            firstWorkCard: true,
            taxDetails: true,
          },
          activatedAt: clock.ago(300 + offset),
          createdAt: clock.ago(320 + offset),
          updatedAt: clock.now,
          payout: {
            bankCode: "BCA",
            accountName: seed.name,
            accountNumberMasked: `****${accountSuffix(seed.name)}`,
            accountRef: `vault:seed:${seed.key}`,
            verifiedBy: admin._id,
            verifiedAt: clock.ago(310 + offset),
            createdAt: clock.ago(315 + offset),
            updatedAt: clock.now,
          },
        }
      }
      if (seed.key === "galuh") {
        return {
          displayName: seed.name,
          status: "active" as const,
          onboardingChecklist: {
            payoutAccount: true,
            consent: true,
            firstWorkCard: true,
            taxDetails: true,
          },
          activatedAt: clock.ago(107),
          createdAt: clock.ago(109),
          updatedAt: clock.now,
          payout: {
            bankCode: "BNI",
            accountName: seed.name,
            accountNumberMasked: `****${accountSuffix(seed.name)}`,
            accountRef: "vault:seed:galuh",
            verifiedBy: admin._id,
            verifiedAt: clock.ago(107),
            createdAt: clock.ago(108),
            updatedAt: clock.now,
          },
        }
      }
      return undefined
    }

    for (const [index, seed] of SEED_USERS.entries()) {
      const result = await insertSeedUser(
        ctx,
        {
          key: seed.key,
          name: seed.name,
          email: seed.email,
          phone: seed.phone,
          province: seed.province,
          region: seed.region,
          initials: seed.initials,
          roles: seed.roles,
          createdAt: clock.ago(seed.joinedDaysAgo),
          updatedAt: clock.now,
          lastActiveAt: clock.ago(seed.lastActiveDaysAgo),
          projection: "workspace",
          index,
          whatsappVerifiedAt: clock.ago(seed.joinedDaysAgo - 1),
          roleActorId: admin._id,
          roleReason: "Penyiapan akun melalui undangan pengelola.",
          seller: sellerFor(seed),
          session: {
            authSessionId: `seed-session-${seed.key}`,
            createdAt: clock.ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
            lastSeenAt: clock.ago(seed.lastActiveDaysAgo),
            // Historical device, not an active session in the settings panel.
            expiresAt: clock.now - HOUR,
          },
          authLog: {
            ipHash: `seed-ip-${index}`,
            createdAt: clock.ago(Math.max(1, seed.lastActiveDaysAgo + 1)),
          },
          whatsapp: {
            expiresAt: clock.ago(seed.joinedDaysAgo) + HOUR,
            createdAt: clock.ago(seed.joinedDaysAgo),
            verifiedAt: clock.ago(seed.joinedDaysAgo) + 3 * 60_000,
            messageId: `seed-wa-${seed.key}`,
          },
          consentOverrides: {
            privacy: {
              source: "signup",
              grantedAt: clock.ago(seed.joinedDaysAgo),
              createdAt: clock.ago(seed.joinedDaysAgo),
            },
            marketing: {
              granted: index % 3 !== 0,
              grantedAt:
                index % 3 !== 0 ? clock.ago(seed.joinedDaysAgo) : undefined,
              revokedAt:
                index % 3 === 0
                  ? clock.ago(Math.max(1, seed.joinedDaysAgo - 45))
                  : undefined,
              createdAt: clock.ago(seed.joinedDaysAgo),
            },
            recording: {
              grantedAt: clock.ago(60),
              createdAt: clock.ago(60),
            },
          },
        },
        clock.now,
      )
      byKey.set(seed.key, result.user)
    }

    await ctx.db.insert("invites", {
      email: "rahayu.puspita86@gmail.com",
      name: "Rahayu Puspita",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-rahayu"),
      status: "pending",
      invitedBy: admin._id,
      reason: "Calon pengajar karawitan Bantul",
      expiresAt: clock.ahead(7),
      createdAt: clock.ago(2),
    })
    await ctx.db.insert("invites", {
      email: seedEmail("zadira"),
      name: "Zadira Ahmada",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-zadira"),
      status: "accepted",
      invitedBy: admin._id,
      acceptedBy: byKey.get("zadira")?._id,
        reason: "Pengajar Batik Bambu",
      expiresAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo - 8),
      createdAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo),
      acceptedAt: clock.ago(SEED_ADMIN_PROFILE.joinedDaysAgo) + DAY,
    })
    await ctx.db.insert("invites", {
      email: "sigit.pramono70@gmail.com",
      name: "Sigit Pramono",
      roles: ["teacher"],
      tokenHash: await sha256("seed-invite-revoked"),
      status: "revoked",
      invitedBy: admin._id,
      reason:
        "Jadwal mengajar bentrok, undangan dibatalkan atas permintaan calon pengajar.",
      expiresAt: clock.ago(20),
      createdAt: clock.ago(30),
    })

    return { users: byKey.size }
  },
})
