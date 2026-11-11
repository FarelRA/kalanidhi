import { describe, expect, it } from "vitest"

import * as auditModule from "../../convex/audit"
import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { NOW, seedAdmin, seedStudent } from "./fixtures"

describe("audit / append-only log", () => {
  it("[P1-LOG-06] the module exports no update or delete mutation", () => {
    expect(Object.keys(auditModule).sort()).toEqual([
      "appendAudit",
      "exportLogs",
      "get",
      "list",
    ])
  })

  it("[P1-LOG-02] filters by actor, action, entity, and request id", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")

    await t.withIdentity({ subject: "auth-admin" }).mutation(api.users.setRoles, {
      userId: target,
      roles: ["student", "teacher"],
      reason: "Verifikasi awal",
    })
    await t.withIdentity({ subject: "auth-admin" }).mutation(api.users.setRoles, {
      userId: target,
      roles: ["student"],
      reason: "Koreksi peran",
    })

    const identity = t.withIdentity({ subject: "auth-admin" })
    const byAction = await identity.query(api.audit.list, {
      kind: "audit",
      action: "users.setRoles",
    })
    expect(byAction.rows).toHaveLength(2)

    const byEntity = await identity.query(api.audit.list, {
      kind: "audit",
      entityType: "users",
      entityId: target,
    })
    expect(byEntity.rows).toHaveLength(2)

    const byActor = await identity.query(api.audit.list, {
      kind: "audit",
      actorId: "someone-else",
    })
    expect(byActor.rows).toHaveLength(0)
  })

  it("[P1-LOG-03] detail correlates events by entity", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")
    const identity = t.withIdentity({ subject: "auth-admin" })

    await identity.mutation(api.users.setRoles, {
      userId: target,
      roles: ["student", "teacher"],
      reason: "Verifikasi",
    })
    await identity.mutation(api.users.suspend, {
      userId: target,
      reason: "Pelanggaran",
    })

    const rows = await identity.query(api.audit.list, {
      kind: "audit",
      action: "users.setRoles",
    })
    const detail = await identity.query(api.audit.get, {
      kind: "audit",
      id: rows.rows[0].id,
    })
    expect(detail?.correlation.events.length).toBeGreaterThanOrEqual(1)
    expect(
      detail?.correlation.events.some(
        (event) => event.entityId === target && event.action === "users.suspend",
      ),
    ).toBe(true)
  })

  it("[P1-LOG-08] logs redact tokens, session values, and contact details", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")
    await t.run(async (ctx) => {
      await ctx.db.insert("authLogs", {
        userId: target,
        authUserId: "auth-target",
        kind: "sign_in",
        ipHash: "hashed-ip",
        userAgent: "secret-agent-value",
        requestId: "req-auth-1",
        createdAt: NOW,
      })
      await ctx.db.insert("notificationOutbox", {
        channel: "email",
        recipient: "person@example.test",
        template: "welcome",
        payload: { token: "secret-token-value" },
        status: "pending",
        attempts: 0,
        scheduledAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
      })
    })

    const identity = t.withIdentity({ subject: "auth-admin" })
    const auth = await identity.query(api.audit.list, {
      kind: "auth",
      requestId: "req-auth-1",
    })
    expect(JSON.stringify(auth)).not.toContain("hashed-ip")
    expect(JSON.stringify(auth)).not.toContain("secret-agent-value")

    const notifications = await identity.query(api.audit.list, {
      kind: "notifications",
    })
    const serialised = JSON.stringify(notifications)
    expect(serialised).toContain("p***@example.test")
    expect(serialised).not.toContain("person@example.test")
    expect(serialised).not.toContain("secret-token-value")
  })

  it("[P1-LOG-04] export is capsulated, logged, and scoped", async () => {
    const t = createTestDb()
    await seedAdmin(t, "auth-admin")
    const target = await seedStudent(t, "auth-target")
    const identity = t.withIdentity({ subject: "auth-admin" })

    await identity.mutation(api.users.setRoles, {
      userId: target,
      roles: ["student", "teacher"],
      reason: "Verifikasi",
    })
    const exported = await identity.mutation(api.audit.exportLogs, {
      kind: "audit",
      action: "users.setRoles",
      reason: "Audit kuartal",
    })
    expect(exported.rows).toHaveLength(1)

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "audit.export"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
  })

  it("[P1-LOG-01] unavailable log sources return an explicit note, not invented rows", async () => {
    const t = await (async () => {
      const db = createTestDb()
      await seedAdmin(db, "auth-admin")
      return db
    })()
    const result = await t
      .withIdentity({ subject: "auth-admin" })
      .query(api.audit.list, { kind: "errors" })
    expect(result.available).toBe(false)
    expect(result.rows).toEqual([])
    expect(result.note).toBeTruthy()
  })

  it("rejects logs.read for non-admin accounts", async () => {
    const t = createTestDb()
    await seedStudent(t, "auth-student")
    await expect(
      t.withIdentity({ subject: "auth-student" }).query(api.audit.list, {}),
    ).rejects.toThrow()
  })
})
