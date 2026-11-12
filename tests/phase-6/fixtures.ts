import { convexTest } from "convex-test"

import { api } from "../../convex/_generated/api"
import schema from "../../convex/schema"
import type { Id } from "../../convex/_generated/dataModel"

export const NOW = 1_760_000_000_000

export function createDb() {
  return convexTest(schema)
}

export type Db = ReturnType<typeof createDb>

export async function seedUser(
  t: Db,
  input: {
    authUserId: string
    name?: string
    email?: string
    roles?: ("student" | "teacher" | "admin")[]
    status?: "active" | "suspended" | "invited" | "deleted"
  },
): Promise<Id<"users">> {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      authUserId: input.authUserId,
      name: input.name ?? input.authUserId,
      email: input.email ?? `${input.authUserId}@example.test`,
      emailVerified: true,
      phone: "6280000000000",
      province: "DI Yogyakarta",
      whatsappVerified: true,
      initials: (input.name ?? input.authUserId).slice(0, 2).toUpperCase(),
      region: "Yogyakarta",
      roles: input.roles ?? ["student"],
      status: input.status ?? "active",
      createdAt: NOW,
      updatedAt: NOW,
    })
    for (const role of input.roles ?? ["student"]) {
      await ctx.db.insert("roleAssignments", {
        userId,
        role,
        action: "grant",
        actorId: "system",
        reason: "Phase 6 test setup",
        createdAt: NOW,
      })
    }
    return userId
  })
}

export async function seedWorld(t: Db) {
  const adminId = await seedUser(t, {
    authUserId: "auth-admin",
    name: "Nadia Kusuma",
    roles: ["admin"],
  })
  const adminTwoId = await seedUser(t, {
    authUserId: "auth-admin-two",
    name: "Raka Pradana",
    roles: ["admin"],
  })
  const studentId = await seedUser(t, {
    authUserId: "auth-student",
    name: "Anisa Rahmawati",
    roles: ["student"],
  })
  const outsiderId = await seedUser(t, {
    authUserId: "auth-outsider",
    name: "Joko Purnomo",
    roles: ["student"],
  })
  const teacherId = await seedUser(t, {
    authUserId: "auth-teacher",
    name: "Bambang Hardjono",
    roles: ["teacher"],
  })
  return { adminId, adminTwoId, studentId, outsiderId, teacherId }
}

export function as(t: Db, authUserId: string) {
  return t.withIdentity({ subject: authUserId })
}

export async function errorCode(
  promise: Promise<unknown>,
): Promise<string | null> {
  try {
    await promise
    return null
  } catch (error) {
    const data = (error as { data?: { code?: string } }).data
    return data?.code ?? (error as Error).message
  }
}

export async function auditActions(t: Db): Promise<string[]> {
  return await t.run(async (ctx) => {
    const rows = await ctx.db.query("auditLogs").collect()
    return rows.map((row) => row.action)
  })
}

export async function seedWork(
  t: Db,
  input: {
    makerId: Id<"users">
    title?: string
    slug?: string
    pathId?: string
    status?: "draft" | "review" | "published" | "paused" | "sold_out"
  },
): Promise<Id<"works">> {
  const slug = input.slug ?? `karya-${Math.random().toString(36).slice(2, 8)}`
  return await t.run(async (ctx) =>
    ctx.db.insert("works", {
      order: 1,
      slug,
      title: input.title ?? "Kain Soga Giriloyo",
      category: "batik",
      kind: "product",
      maker: "Anisa Rahmawati",
      makerRole: "Peserta",
      teacher: "Bambang Hardjono",
      region: "Yogyakarta",
      price: 850_000,
      unit: "lembar",
      technique: "Batik tulis",
      techniqueNote: "Pewarnaan soga alami.",
      workCard: "KN-KRT-001",
      description: "Kain batik tulis dengan pewarna soga.",
      makerId: input.makerId,
      pathId: input.pathId ?? "batik-tulis-soga",
      status: input.status ?? "published",
      createdAt: NOW,
    }),
  )
}

export async function seedWorkCard(
  t: Db,
  input: {
    workId: Id<"works">
    makerId: Id<"users">
    status?:
      | "draft"
      | "submitted"
      | "teacher_confirmed"
      | "admin_review"
      | "published"
      | "paused"
      | "sold_out"
  },
): Promise<Id<"workCards">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("workCards", {
      workId: input.workId,
      makerId: input.makerId,
      serial: "KN-KRT-001",
      title: "Kain Soga Giriloyo",
      technique: "Batik tulis",
      materials: "Katun primisima",
      provenance: "Giriloyo, Yogyakarta",
      permission: "Izin komunitas Giriloyo",
      accessLevel: "community",
      status: input.status ?? "published",
      createdAt: NOW,
      updatedAt: NOW,
    }),
  )
}

export async function seedLead(
  t: Db,
  input: {
    email?: string
    name?: string
    status?: "new" | "contacted" | "qualified" | "converted" | "lost" | "closed" | "spam"
    createdAt?: number
  } = {},
): Promise<Id<"leads">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("leads", {
      intent: "student",
      name: input.name ?? "Wahyu Pratama",
      email: input.email ?? "wahyu@example.test",
      whatsapp: "+62 800 1234",
      consent: true,
      status: input.status ?? "new",
      source: "landing",
      createdAt: input.createdAt ?? NOW,
      updatedAt: NOW,
    }),
  )
}

export async function seedTicket(
  t: Db,
  input: {
    requesterId: Id<"users">
    subject?: string
    status?: "open" | "pending" | "resolved" | "closed"
    priority?: "low" | "normal" | "high" | "urgent"
    createdAt?: number
    firstResponseAt?: number
  },
): Promise<Id<"supportTickets">> {
  return await t.run(async (ctx) =>
    ctx.db.insert("supportTickets", {
      code: `DKN-2026-${Math.floor(Math.random() * 900_000 + 100_000)}`,
      requesterId: input.requesterId,
      requesterName: "Anisa Rahmawati",
      requesterEmail: "auth-student@example.test",
      subject: input.subject ?? "Pembayaran belum cocok",
      priority: input.priority ?? "normal",
      status: input.status ?? "open",
      channel: "chat",
      firstResponseAt: input.firstResponseAt,
      createdAt: input.createdAt ?? NOW,
      updatedAt: NOW,
    }),
  )
}

export async function seedConversation(
  t: Db,
  input: { userId: Id<"users">; title?: string },
): Promise<Id<"conversations">> {
  return await t.run(async (ctx) => {
    const conversationId = await ctx.db.insert("conversations", {
      kind: "support",
      title: input.title ?? "Dukungan kain soga",
      status: "open",
      supportRequestedBy: input.userId,
      supportConsentAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    })
    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: input.userId,
      role: "member",
      joinedAt: NOW,
    })
    await ctx.db.insert("messages", {
      conversationId,
      senderId: input.userId,
      kind: "text",
      body: "Pesan asli di percakapan tidak boleh disalin.",
      createdAt: NOW,
    })
    return conversationId
  })
}

export async function seedSetting(
  t: Db,
  key: string,
  value: unknown,
): Promise<void> {
  await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique()
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: NOW })
    } else {
      await ctx.db.insert("settings", { key, value, updatedAt: NOW })
    }
  })
}

export async function seedSla(
  t: Db,
  input: {
    flowKey: string
    key?: string
    name?: string
    targetMinutes: number
    escalationMinutes?: number
  },
): Promise<void> {
  await t.run(async (ctx) => {
    await ctx.db.insert("slaPolicies", {
      key: input.key ?? `sla:${input.flowKey}`,
      flowKey: input.flowKey,
      name: input.name ?? "SLA uji",
      targetMinutes: input.targetMinutes,
      escalationMinutes: input.escalationMinutes,
      owner: "Tim operasi",
      active: true,
      updatedAt: NOW,
    })
  })
}

export async function supportMessages(t: Db, ticketId: Id<"supportTickets">) {
  return await t.run(async (ctx) =>
    ctx.db
      .query("supportMessages")
      .withIndex("by_ticketId", (q) => q.eq("ticketId", ticketId))
      .collect(),
  )
}

export const publicTicket = async (
  t: Db,
  authUserId: string,
  subject: string,
  body?: string,
) =>
  await as(t, authUserId).mutation(api.support.create, {
    subject,
    body,
  })
