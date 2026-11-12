import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { createTestDb } from "../helpers/convex"
import { errorCode, seedAdmin, seedLead } from "./fixtures"

async function adminDb() {
  const t = createTestDb()
  const adminId = await seedAdmin(t, "auth-admin")
  return { t, adminId }
}

const publicLead = {
  intent: "student" as const,
  name: "Wahyu Pratama",
  email: "wahyu@example.test",
  whatsapp: "+62 800 1234",
  interest: "Batik tulis",
  message: "Ingin ikut jalur batik.",
  source: "landing",
  consent: true,
}

describe("leads / public form", () => {
  it("[P1-LEAD-01] the public landing mutation still accepts a guest lead", async () => {
    const t = createTestDb()
    const id = await t.mutation(api.leads.create, publicLead)
    expect(id).toBeTruthy()

    const lead = await t.run(async (ctx) => ctx.db.get(id))
    expect(lead?.status).toBe("new")
    expect(lead?.email).toBe("wahyu@example.test")
  })

  it("[P1-LEAD-01b] accepts a WhatsApp-only lead without email", async () => {
    const t = createTestDb()
    const id = await t.mutation(api.leads.create, {
      intent: "student",
      name: "Wahyu Pratama",
      whatsapp: "+62 800 1234",
      consent: true,
    })

    const lead = await t.run(async (ctx) => ctx.db.get(id))
    expect(lead?.whatsapp).toBe("+62 800 1234")
    expect(lead?.email).toBeUndefined()

    const adminId = await seedAdmin(t, "auth-admin")
    void adminId
    const identity = t.withIdentity({ subject: "auth-admin" })
    const list = await identity.query(api.leads.list, {})
    expect(list[0]?.email).toBeNull()
  })
})

describe("leads / CRM", () => {
  it("[P1-LEAD-02] admin lists and filters leads by saved view and query", async () => {
    const { t } = await adminDb()
    await seedLead(t, { status: "new", name: "Wahyu Pratama" })
    await seedLead(t, {
      status: "qualified",
      name: "Sanggar Lestari",
      intent: "institution",
      email: "sanggar@example.test",
    })

    const identity = t.withIdentity({ subject: "auth-admin" })
    const all = await identity.query(api.leads.list, {})
    expect(all).toHaveLength(2)

    const fresh = await identity.query(api.leads.list, { view: "new" })
    expect(fresh).toHaveLength(1)
    expect(fresh[0]?.name).toBe("Wahyu Pratama")

    const institutions = await identity.query(api.leads.list, {
      view: "institutions",
    })
    expect(institutions).toHaveLength(1)
    expect(institutions[0]?.name).toBe("Sanggar Lestari")

    const searched = await identity.query(api.leads.list, { q: "sanggar" })
    expect(searched).toHaveLength(1)
  })

  it("[P1-LEAD-03] assignment, notes, and follow-up are recorded and audited", async () => {
    const { t, adminId } = await adminDb()
    const leadId = await seedLead(t)
    const identity = t.withIdentity({ subject: "auth-admin" })

    await identity.mutation(api.leads.assign, {
      leadId,
      ownerId: adminId,
      reason: "Pemilik awal",
    })
    await identity.mutation(api.leads.addNote, {
      leadId,
      kind: "whatsapp",
      body: "Sudah dihubungi, minta jadwal.",
      followUpAt: 1_760_100_000_000,
    })

    const detail = await identity.query(api.leads.get, { id: leadId })
    expect(detail?.lead.owner?.id).toBe(adminId)
    expect(detail?.lead.notesCount).toBe(1)
    expect(detail?.lead.followUpAt).toBe(1_760_100_000_000)
    expect(detail?.assignments).toHaveLength(1)

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) =>
          q.eq("entityType", "leads").eq("entityId", leadId),
        )
        .collect(),
    )
    expect(audit.map((row) => row.action).sort()).toEqual([
      "leads.assign",
      "leads.note",
    ])
  })

  it("[P1-LEAD-04] status transitions follow the lead state machine", async () => {
    const { t } = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const leadId = await seedLead(t)

    await identity.mutation(api.leads.setStatus, {
      leadId,
      status: "contacted",
      reason: "Sudah dihubungi",
    })
    const lead = await t.run(async (ctx) => ctx.db.get(leadId))
    expect(lead?.status).toBe("contacted")

    const second = await seedLead(t, { email: "second@example.test" })
    const error = await identity
      .mutation(api.leads.setStatus, {
        leadId: second,
        status: "converted",
        reason: "Langsung konversi",
      })
      .catch((caught: unknown) => caught)
    expect(errorCode(error)).toBe("INVALID_TRANSITION")
  })

  it("[P1-LEAD-05] conversion requires qualification and returns the registration action", async () => {
    const { t } = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const leadId = await seedLead(t)

    const early = await identity
      .mutation(api.leads.convert, { leadId, reason: "Belum siap" })
      .catch((caught: unknown) => caught)
    expect(errorCode(early)).toBe("INVALID_TRANSITION")

    await identity.mutation(api.leads.setStatus, {
      leadId,
      status: "contacted",
      reason: "Dihubungi",
    })
    await identity.mutation(api.leads.setStatus, {
      leadId,
      status: "qualified",
      reason: "Siap mendaftar",
    })
    const result = await identity.mutation(api.leads.convert, {
      leadId,
      reason: "Sudah memilih jalur",
    })
    expect(result.status).toBe("converted")
    expect(result.registrationPath).toContain("/daftar?email=")
  })

  it("[P1-LEAD-06] lead summaries expose institution type, participants, and conversion time", async () => {
    const { t } = await adminDb()
    const identity = t.withIdentity({ subject: "auth-admin" })
    const leadId = await t.mutation(api.leads.create, {
      intent: "institution",
      name: "Sanggar Lestari",
      email: "sanggar@example.test",
      institution: "Sanggar Lestari",
      institutionType: "Sekolah dasar",
      participants: 28,
      consent: true,
    })

    const list = await identity.query(api.leads.list, { view: "institutions" })
    expect(list[0]?.institutionType).toBe("Sekolah dasar")
    expect(list[0]?.participants).toBe(28)
    expect(list[0]?.convertedAt).toBeNull()

    await identity.mutation(api.leads.setStatus, {
      leadId,
      status: "contacted",
      reason: "Dihubungi",
    })
    await identity.mutation(api.leads.setStatus, {
      leadId,
      status: "qualified",
      reason: "Siap mendaftar",
    })
    await identity.mutation(api.leads.convert, {
      leadId,
      reason: "Konversi ke pendaftaran",
    })

    const detail = await identity.query(api.leads.get, { id: leadId })
    expect(detail?.lead.convertedAt).toBeTypeOf("number")
  })

  it("[P1-EXP-03] export is scoped and logged", async () => {
    const { t } = await adminDb()
    await seedLead(t)
    const identity = t.withIdentity({ subject: "auth-admin" })

    const result = await identity.mutation(api.leads.exportLeads, {
      view: "new",
      reason: "Laporan mingguan",
    })
    expect(result.rows).toHaveLength(1)

    const audit = await t.run(async (ctx) =>
      ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "leads.export"))
        .collect(),
    )
    expect(audit).toHaveLength(1)
    expect(audit[0]?.actorId).toBeTruthy()
  })

  it("rejects CRM reads for non-admin accounts", async () => {
    const t = createTestDb()
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        authUserId: "auth-student",
        name: "Siswa",
        email: "siswa@example.test",
        emailVerified: true,
        phone: "6280000000000",
        province: "DI Yogyakarta",
        whatsappVerified: true,
        initials: "SI",
        region: "Yogyakarta",
        roles: ["student"],
        status: "active",
        createdAt: 1_760_000_000_000,
        updatedAt: 1_760_000_000_000,
      })
    })
    await expect(
      t.withIdentity({ subject: "auth-student" }).query(api.leads.list, {}),
    ).rejects.toThrow()
  })
})
