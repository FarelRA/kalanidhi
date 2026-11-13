import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { LOG_SEVERITIES } from "../lib/admin/log"
import {
  ORDER_CORRECTION_STATUSES,
  ORDER_DISPUTE_RESOLUTION_STATUSES,
  ORDER_STATUSES,
  SELLER_CHECKLIST_KEYS,
  WORK_ACCESS_LEVELS,
  WORK_CATEGORIES,
  WORK_KINDS,
} from "../lib/commerce/options"
import {
  ACCESS_LEVELS,
  BREAK_GLASS_ENTITY_TYPES,
  PRIVACY_REQUEST_KINDS,
} from "../lib/governance/options"
import {
  LEAD_INTENTS,
  LEAD_STATUSES,
  LEAD_TRANSITIONS,
} from "../lib/leads/options"
import {
  LESSON_ACCESS_LEVELS,
  LESSON_KINDS,
} from "../lib/learning/options"
import { CATALOG_STATUSES } from "../lib/content/status"
import {
  CONSENT_KINDS,
  NOTIFICATION_KEYS,
} from "../lib/settings/options"
import {
  SUPPORT_CHANNELS,
  SUPPORT_ESCALATIONS,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
} from "../lib/support/options"
import { WORKSPACE_ROLES, WORKSPACE_ROLE_LABELS } from "../lib/access/capabilities"

const root = path.resolve(__dirname, "..")

function read(relative: string): string {
  return readFileSync(path.join(root, relative), "utf8")
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length
}

describe("shared form option sources", () => {
  it("keeps every closed enum unique and exhaustive at runtime", () => {
    const groups = [
      WORK_KINDS,
      WORK_CATEGORIES,
      WORK_ACCESS_LEVELS,
      ORDER_STATUSES,
      ORDER_CORRECTION_STATUSES,
      ORDER_DISPUTE_RESOLUTION_STATUSES,
      SELLER_CHECKLIST_KEYS,
      LEAD_INTENTS,
      LEAD_STATUSES,
      LESSON_KINDS,
      LESSON_ACCESS_LEVELS,
      ACCESS_LEVELS,
      PRIVACY_REQUEST_KINDS,
      BREAK_GLASS_ENTITY_TYPES,
      CONSENT_KINDS,
      NOTIFICATION_KEYS,
      SUPPORT_STATUSES,
      SUPPORT_PRIORITIES,
      SUPPORT_CHANNELS,
      SUPPORT_ESCALATIONS,
      LOG_SEVERITIES,
      CATALOG_STATUSES,
      WORKSPACE_ROLES,
    ]
    for (const group of groups) {
      expect(group.length).toBeGreaterThan(0)
      expect(unique(group)).toBe(true)
    }
  })

  it("keeps order correction subsets inside the order status enum", () => {
    for (const status of ORDER_CORRECTION_STATUSES) {
      expect(ORDER_STATUSES).toContain(status)
    }
    for (const status of ORDER_DISPUTE_RESOLUTION_STATUSES) {
      expect(ORDER_STATUSES).toContain(status)
    }
  })

  it("keeps the lead state machine closed over known statuses", () => {
    expect(Object.keys(LEAD_TRANSITIONS).sort()).toEqual(
      [...LEAD_STATUSES].sort(),
    )
    for (const [from, targets] of Object.entries(LEAD_TRANSITIONS)) {
      expect(LEAD_STATUSES).toContain(from)
      for (const target of targets) {
        expect(LEAD_STATUSES).toContain(target)
      }
    }
  })

  it("offers every log severity in the filter, including info", () => {
    expect(LOG_SEVERITIES).toContain("info")
    expect(LOG_SEVERITIES).toContain("critical")
  })

  it("labels every workspace role used by the people drawer", () => {
    expect(Object.keys(WORKSPACE_ROLE_LABELS).sort()).toEqual(
      [...WORKSPACE_ROLES].sort(),
    )
  })
})

describe("forms read their option lists from shared modules", () => {
  const cases: [string, string[]][] = [
    [
      "components/workspace/commerce/works-live.tsx",
      ["WORK_KINDS", "WORK_CATEGORIES", "WORK_ACCESS_LEVEL_LABELS"],
    ],
    [
      "components/workspace/commerce/orders-live.tsx",
      ["ORDER_CORRECTION_STATUSES", "ORDER_DISPUTE_RESOLUTION_STATUSES"],
    ],
    [
      "components/workspace/governance/people-live.tsx",
      ["WORKSPACE_ROLES", "SELLER_CHECKLIST_KEYS"],
    ],
    [
      "components/workspace/governance/leads-live.tsx",
      ["LEAD_TRANSITIONS", "LEAD_STATUS_LABELS"],
    ],
    [
      "components/workspace/governance/log-live.tsx",
      ["LOG_SEVERITIES"],
    ],
    [
      "components/workspace/governance/governance-board-live.tsx",
      ["PRIVACY_REQUEST_KINDS", "BREAK_GLASS_ENTITY_TYPES"],
    ],
    [
      "components/workspace/governance/settings-panel-live.tsx",
      ["CONSENT_KINDS", "NOTIFICATION_KEYS"],
    ],
    [
      "components/workspace/learning/live-learning-board.tsx",
      ["LESSON_KINDS", "LESSON_ACCESS_LEVELS"],
    ],
    [
      "components/workspace/governance/support-inbox-live.tsx",
      ["SUPPORT_STATUS_LABELS", "SUPPORT_PRIORITY_LABELS"],
    ],
    [
      "components/commerce/checkout-form.tsx",
      ["SPLIT_PERCENTAGES"],
    ],
  ]

  for (const [file, imports] of cases) {
    it(`${file} imports ${imports.join(", ")}`, () => {
      const source = read(file)
      for (const symbol of imports) {
        expect(source).toContain(symbol)
      }
    })
  }

  it("no longer restates the work kind and category options", () => {
    const source = read("components/workspace/commerce/works-live.tsx")
    expect(source).not.toContain('<option value="product">')
    expect(source).not.toContain('<option value="batik">')
  })

  it("no longer restates the order correction statuses", () => {
    const source = read("components/workspace/commerce/orders-live.tsx")
    expect(source).not.toContain('<option value="in_progress">')
    expect(source).not.toContain('<option value="disputed">')
  })

  it("no longer restates the privacy kinds or break-glass entities", () => {
    const source = read(
      "components/workspace/governance/governance-board-live.tsx",
    )
    expect(source).not.toContain('<option value="call_recording">')
    expect(source).not.toContain('<option value="deletion">')
  })

  it("no longer hardcodes the revenue split percentages in checkout", () => {
    const source = read("components/commerce/checkout-form.tsx")
    expect(source).not.toContain("Pengrajin 70%")
    expect(source).not.toContain('style={{ width: "70%" }}')
  })

  it("the management role options come from the shared role list", () => {
    const source = read("components/workspace/governance/people-live.tsx")
    expect(source).not.toContain('(["student", "teacher", "admin"] as const)')
  })

  it("support canned replies come from Convex, not the component", () => {
    const source = read(
      "components/workspace/governance/support-inbox-live.tsx",
    )
    expect(source).not.toContain('<option value="Terima kasih')
    expect(source).toContain("api.support.listCannedReplies")
  })

  it("convex validators consume the same shared enums", () => {
    const checks: [string, string][] = [
      ["convex/leads.ts", "LEAD_TRANSITIONS"],
      ["convex/commerce.ts", "WORK_KINDS"],
      ["convex/governance.ts", "PRIVACY_REQUEST_KINDS"],
      ["convex/support.ts", "SUPPORT_STATUSES"],
      ["convex/settings.ts", "CONSENT_KINDS"],
      ["convex/tables/content.ts", "LESSON_KINDS"],
      ["convex/tables/common.ts", "LOG_SEVERITIES"],
      ["lib/forms/lead-schema.ts", "LEAD_INTENTS"],
    ]
    for (const [file, symbol] of checks) {
      expect(read(file)).toContain(symbol)
    }
  })
})
