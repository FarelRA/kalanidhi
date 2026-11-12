import { describe, expect, it } from "vitest"

import { api } from "../../convex/_generated/api"
import { FLOW_KEYS, FLOW_SPECS } from "../../lib/flows/definitions"
import {
  as,
  auditActions,
  createDb,
  errorCode,
  NOW,
  seedLead,
  seedSla,
  seedWorld,
} from "./fixtures"

describe("flows / definitions", () => {
  it("[P6-FLOW-01] every domain has states, guarded transitions, and an SLA", async () => {
    const t = createDb()
    await seedWorld(t)
    const definitions = await as(t, "auth-admin").query(
      api.flows.listDefinitions,
      {},
    )
    expect(definitions.map((item) => item.key).sort()).toEqual(
      [...FLOW_KEYS].sort(),
    )
    for (const definition of definitions) {
      expect(definition.states.length, definition.key).toBeGreaterThan(0)
      expect(definition.transitions.length, definition.key).toBeGreaterThan(0)
      expect(definition.sla.targetMinutes, definition.key).toBeGreaterThan(0)
      for (const transition of definition.transitions) {
        expect(transition.guard.trim().length).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it("[P6-FLOW-02] invalid transition configuration is rejected", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")

    expect(
      await errorCode(
        identity.mutation(api.flows.saveDefinition, {
          flowKey: "lead",
          transitions: [
            { from: "ghost", to: "contacted", guard: "Tidak ada keadaan" },
          ],
        }),
      ),
    ).toBe("INVALID_FLOW")

    expect(
      await errorCode(
        identity.mutation(api.flows.saveDefinition, {
          flowKey: "lead",
          transitions: [
            { from: "converted", to: "contacted", guard: "Terminal tidak keluar" },
          ],
        }),
      ),
    ).toBe("INVALID_FLOW")

    expect(
      await errorCode(
        identity.mutation(api.flows.saveDefinition, {
          flowKey: "lead",
          transitions: [
            { from: "new", to: "contacted", guard: "Pendek" },
            { from: "new", to: "contacted", guard: "Transisi ganda" },
          ],
        }),
      ),
    ).toBe("INVALID_FLOW")
  })

  it("[P6-FLOW-03] lead runtime transitions match the configured definition", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")
    const spec = FLOW_SPECS.lead

    for (const transition of spec.transitions) {
      const leadId = await seedLead(t, { status: transition.from as "new" })
      await identity.mutation(api.leads.setStatus, {
        leadId,
        status: transition.to as "contacted",
        reason: `Uji transisi ${transition.from} ke ${transition.to}`,
      })
      const lead = await t.run(async (ctx) => ctx.db.get(leadId))
      expect(lead?.status, `${transition.from} → ${transition.to}`).toBe(
        transition.to,
      )
    }

    const defined = new Set(
      spec.transitions.map((item) => `${item.from}->${item.to}`),
    )
    const illegal = [
      ["new", "converted"],
      ["new", "closed"],
      ["converted", "contacted"],
      ["qualified", "new"],
    ] as const
    for (const [from, to] of illegal) {
      if (defined.has(`${from}->${to}`)) continue
      const leadId = await seedLead(t, { status: from })
      expect(
        await errorCode(
          identity.mutation(api.leads.setStatus, {
            leadId,
            status: to,
            reason: "Transisi tidak sah",
          }),
        ),
        `${from} → ${to}`,
      ).toBe("INVALID_TRANSITION")
    }
  })

  it("[P6-FLOW-04] automation rules use a closed trigger and action vocabulary", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")

    await identity.mutation(api.flows.saveAutomationRule, {
      key: "flow.support.assign.round_robin",
      flowKey: "support",
      kind: "assignment",
      trigger: "on_create",
      action: "assign_owner",
      enabled: true,
    })
    const rules = await identity.query(api.flows.automationRules, {
      flowKey: "support",
    })
    expect(
      rules.some((rule) => rule.key === "flow.support.assign.round_robin"),
    ).toBe(true)
    expect(await auditActions(t)).toContain("flows.automation.save")

    expect(
      await errorCode(
        identity.mutation(api.flows.saveAutomationRule, {
          key: "flow.support.script",
          flowKey: "support",
          kind: "assignment",
          trigger: "on_create",
          action: "eval_script" as "assign_owner",
          enabled: true,
        }),
      ),
    ).not.toBeNull()
  })
})

describe("flows / stuck records and override", () => {
  it("[P6-FLOW-06] stuck records are sorted by age and link the real record", async () => {
    const t = createDb()
    await seedWorld(t)
    const older = await seedLead(t, {
      email: "older@example.test",
      createdAt: NOW - 20 * 3_600_000,
    })
    const newer = await seedLead(t, {
      email: "newer@example.test",
      createdAt: NOW - 2 * 3_600_000,
    })

    const rows = await as(t, "auth-admin").query(api.flows.stuckRecords, {
      flowKey: "lead",
    })
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows[0]?.recordId).toBe(older)
    expect(rows[0]?.ageMinutes).toBeGreaterThanOrEqual(rows[1]?.ageMinutes ?? 0)
    expect(rows.some((row) => row.recordId === newer)).toBe(true)
  })

  it("[P6-FLOW-07] manual override requires a reason, validates the transition, and writes audit", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")
    const leadId = await seedLead(t)

    expect(
      await errorCode(
        identity.mutation(api.flows.manualOverride, {
          flowKey: "lead",
          recordId: leadId,
          toState: "contacted",
          reason: "pendek",
        }),
      ),
    ).toBe("REASON_REQUIRED")

    expect(
      await errorCode(
        identity.mutation(api.flows.manualOverride, {
          flowKey: "lead",
          recordId: leadId,
          toState: "converted",
          reason: "Mencoba melompati kualifikasi.",
        }),
      ),
    ).toBe("INVALID_TRANSITION")

    const result = await identity.mutation(api.flows.manualOverride, {
      flowKey: "lead",
      recordId: leadId,
      toState: "contacted",
      reason: "Pemilik lead sudah menghubungi melalui WhatsApp.",
    })
    expect(result.from).toBe("new")
    expect(result.to).toBe("contacted")
    const lead = await t.run(async (ctx) => ctx.db.get(leadId))
    expect(lead?.status).toBe("contacted")
    expect(await auditActions(t)).toContain("flows.override")
  })

  it("[P6-FLOW-09] SLA thresholds are editable and used by the queue", async () => {
    const t = createDb()
    await seedWorld(t)
    const identity = as(t, "auth-admin")
    await seedSla(t, { flowKey: "lead", targetMinutes: 30 })

    expect(
      await errorCode(
        identity.mutation(api.flows.saveSlaPolicy, {
          flowKey: "lead",
          name: "Kontak lead",
          targetMinutes: 60,
          escalationMinutes: 30,
        }),
      ),
    ).toBe("INVALID_SLA")

    await identity.mutation(api.flows.saveSlaPolicy, {
      flowKey: "lead",
      name: "Kontak lead",
      targetMinutes: 30,
      escalationMinutes: 60,
    })
    const slas = await identity.query(api.flows.slas, { flowKey: "lead" })
    expect(slas[0]?.targetMinutes).toBe(30)
    expect(slas[0]?.escalationMinutes).toBe(60)
    expect(await auditActions(t)).toContain("flows.sla.save")
  })
})
