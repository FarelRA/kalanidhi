import { readFileSync, readdirSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { LOG_KINDS } from "../lib/admin/log"
import {
  AUTH_LOG_KINDS,
  ROLE_ACTIONS,
  SELLER_STATUSES,
} from "../lib/admin/people"
import {
  DISPUTE_STATUSES,
  DISPUTE_STATUS_TONES,
  LEDGER_ACCOUNT_LABELS,
  ORDER_CHANNELS,
  ORDER_STATUSES,
  ORDER_STATUS_TONES,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_TONES,
  PAYOUT_STATUSES,
  PAYOUT_STATUS_TONES,
  REFUND_STATUSES,
  REFUND_STATUS_TONES,
  WORK_CATEGORIES,
  WORK_KINDS,
  WORK_READINESS_LABELS,
  WORK_STAGES,
  WORK_STATUSES,
  WORK_STATUS_TONES,
} from "../lib/commerce/options"
import {
  CALL_KINDS,
  CALL_PARTICIPANT_ROLES,
  CALL_SCOPES,
  CALL_STATUSES,
} from "../lib/calls/options"
import { CONTENT_REVISION_STATUSES } from "../lib/content/status"
import {
  CERTIFICATE_EVENT_KINDS,
  CERTIFICATE_STATUSES,
} from "../lib/credentials/options"
import {
  BREAK_GLASS_ENTITY_TYPES,
  PRIVACY_REQUEST_KINDS,
  TAKEDOWN_TARGET_LABELS,
} from "../lib/governance/options"
import { LEAD_STATUSES } from "../lib/leads/options"
import {
  COHORT_STATUSES,
  ENROLLMENT_STATUSES,
  LESSON_ACCESS_LEVELS,
  LESSON_KINDS,
  PATH_STATUSES,
  SESSION_KINDS,
  SESSION_STATUSES,
} from "../lib/learning/options"
import {
  CONVERSATION_KINDS,
  CONVERSATION_STATUSES,
} from "../lib/messaging/options"
import {
  API_KEY_STATUSES,
  INTEGRATION_KEYS,
  INTEGRATION_STATUS_LABELS,
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOK_STATUSES,
} from "../lib/settings/options"
import { SUPPORT_PRIORITIES, SUPPORT_STATUSES } from "../lib/support/options"

const ROOT = process.cwd()

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8")
}

function workspaceFiles(
  directory = "components/workspace",
  extensions = [".tsx"],
): string[] {
  return readdirSync(path.join(ROOT, directory), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = path.join(directory, entry.name)
      if (entry.isDirectory()) return workspaceFiles(relative, extensions)
      return entry.isFile() &&
        extensions.some((extension) => entry.name.endsWith(extension))
        ? [relative]
        : []
    })
}

const WORKSPACE_FILES = [
  ...workspaceFiles("components/workspace"),
  ...workspaceFiles("lib/workspace", [".ts", ".tsx"]),
]


describe("workspace data sources", () => {
  it("keeps the closed enums aligned with the Convex schema", () => {
    expect(WORK_KINDS).toEqual(["product", "service"])
    expect(WORK_CATEGORIES).toEqual(["batik", "layanan"])
    expect(WORK_STATUSES).toEqual([
      "draft",
      "review",
      "published",
      "paused",
      "sold_out",
    ])
    expect(ORDER_STATUSES).toContain("awaiting_payment")
    expect(ORDER_CHANNELS).toContain("institution")
    expect(Object.keys(LEDGER_ACCOUNT_LABELS)).toContain("teacher")
    expect(PAYMENT_STATUSES).toContain("expired")
    expect(PAYOUT_STATUSES).toContain("reversed")
    expect(REFUND_STATUSES).toContain("paid")
    expect(DISPUTE_STATUSES).toContain("closed")
    expect(LESSON_KINDS).toContain("practice")
    expect(LESSON_ACCESS_LEVELS).toContain("certified")
    expect(COHORT_STATUSES).toContain("enrolling")
    expect(ENROLLMENT_STATUSES).toContain("pending_payment")
    expect(PATH_STATUSES).toContain("mapping")
    expect(SESSION_KINDS).toContain("office_hours")
    expect(SESSION_STATUSES).toContain("cancelled")
    expect(SUPPORT_STATUSES).toContain("resolved")
    expect(SUPPORT_PRIORITIES).toContain("urgent")
    expect(LEAD_STATUSES).toContain("converted")
    expect(LOG_KINDS).toContain("errors")
    expect(AUTH_LOG_KINDS).toContain("impersonation")
    expect(ROLE_ACTIONS).toContain("grant")
    expect(SELLER_STATUSES).toContain("active")
    expect(CALL_KINDS).toEqual(["audio", "video"])
    expect(CALL_STATUSES).toContain("missed")
    expect(CALL_SCOPES).toContain("cohort")
    expect(CALL_PARTICIPANT_ROLES).toContain("host")
    expect(CONTENT_REVISION_STATUSES).toContain("scheduled")
    expect(CERTIFICATE_STATUSES).toEqual(["issued", "revoked", "replaced"])
    expect(CERTIFICATE_EVENT_KINDS).toEqual(["issue", "revoke", "replace"])
    expect(INTEGRATION_KEYS).toContain("payment_gateway")
    expect(Object.keys(INTEGRATION_STATUS_LABELS)).toContain("healthy")
    expect(API_KEY_STATUSES).toContain("revoked")
    expect(WEBHOOK_STATUSES).toContain("paused")
    expect(WEBHOOK_DELIVERY_STATUSES).toContain("dead")
    expect(CONVERSATION_KINDS).toContain("support")
    expect(CONVERSATION_STATUSES).toContain("archived")
    expect(PRIVACY_REQUEST_KINDS).toContain("correction")
    expect(BREAK_GLASS_ENTITY_TYPES).toContain("call_recording")
    expect(Object.keys(TAKEDOWN_TARGET_LABELS)).toContain("work")
  })

  it("labels and tones every closed status enum", () => {
    expect(Object.keys(WORK_STATUS_TONES).sort()).toEqual(
      [...WORK_STATUSES].sort(),
    )
    expect(Object.keys(ORDER_STATUS_TONES).sort()).toEqual(
      [...ORDER_STATUSES].sort(),
    )
    expect(Object.keys(PAYMENT_STATUS_TONES).sort()).toEqual(
      [...PAYMENT_STATUSES].sort(),
    )
    expect(Object.keys(PAYOUT_STATUS_TONES).sort()).toEqual(
      [...PAYOUT_STATUSES].sort(),
    )
    expect(Object.keys(REFUND_STATUS_TONES).sort()).toEqual(
      [...REFUND_STATUSES].sort(),
    )
    expect(Object.keys(DISPUTE_STATUS_TONES).sort()).toEqual(
      [...DISPUTE_STATUSES].sort(),
    )
  })

  it("derives the work readiness checklist from one shared map", () => {
    expect(Object.keys(WORK_READINESS_LABELS)).toEqual([
      "image",
      "title",
      "price",
      "unit",
      "technique",
      "maker",
      "teacher",
      "path",
      "permission",
      "provenance",
      "materials",
    ])
    expect(WORK_STAGES.map((stage) => stage.id)).toEqual([
      "draft",
      "submitted",
      "teacher_confirmed",
      "admin_review",
      "published",
    ])
  })

  it("live components import the shared option modules instead of restating enums", () => {
    const expectations: [string, string[]][] = [
      [
        "components/workspace/commerce/works-live.tsx",
        ["WORK_STAGES", "WORK_READINESS_LABELS", "WORK_STATUSES"],
      ],
      [
        "components/workspace/commerce/payout-ledger-live.tsx",
        ["PAYOUT_STATUSES", "SPLIT_PERCENTAGES"],
      ],
      [
        "components/workspace/governance/governance-board-live.tsx",
        ["PRIVACY_REQUEST_KINDS", "BREAK_GLASS_ENTITY_TYPES"],
      ],
      [
        "components/workspace/governance/leads-live.tsx",
        ["LEAD_STATUS_LABELS", "LEAD_INTENT_LABELS", "LEAD_TRANSITIONS"],
      ],
      [
        "components/workspace/governance/log-live.tsx",
        ["LOG_KINDS", "LOG_KIND_LABELS"],
      ],
      [
        "components/workspace/governance/people-live.tsx",
        ["WORKSPACE_ROLES"],
      ],
      [
        "components/workspace/governance/settings-panel-live.tsx",
        ["CONSENT_KINDS", "NOTIFICATION_KEYS"],
      ],
      [
        "components/workspace/governance/support-inbox-live.tsx",
        ["SUPPORT_STATUS_LABELS", "SUPPORT_PRIORITY_LABELS"],
      ],
      [
        "components/workspace/learning/live-learning-board.tsx",
        [
          "LESSON_KIND_LABELS",
          "LESSON_ACCESS_LABELS",
          "COHORT_STATUS_LABELS",
          "ENROLLMENT_STATUS_LABELS",
        ],
      ],
      [
        "components/workspace/learning/live-schedule-board.tsx",
        ["SESSION_KIND_LABELS", "SESSION_STATUS_LABELS"],
      ],
      [
        "components/workspace/credentials/live-credential-board.tsx",
        ["CERTIFICATE_STATUSES", "CERTIFICATE_STATUS_LABELS"],
      ],
      [
        "components/workspace/communication/call-room-live.tsx",
        ["CALL_KIND_LABELS", "CALL_STATUS_LABELS", "CALL_STATUS_TONES"],
      ],
      [
        "components/workspace/communication/message-center-live.tsx",
        ["CONVERSATION_KIND_LABELS", "CONVERSATION_STATUS_LABELS"],
      ],
    ]

    for (const [file, symbols] of expectations) {
      const source = read(file)
      for (const symbol of symbols) {
        expect(source, `${file} must import ${symbol}`).toContain(symbol)
      }
    }
  })

  it("workspace files never carry the split percentages as literals", () => {
    for (const file of WORKSPACE_FILES) {
      const source = read(file)
      expect(source, `${file} must not hardcode 70 / 15 / 15`).not.toContain(
        "70 / 15 / 15",
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toMatch(
        /width:\s*"70%"/,
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toMatch(
        /width:\s*"15%"/,
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toMatch(
        /header:\s*"70%"/,
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toContain(
        "70/15",
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toMatch(
        /\b70%/,
      )
      expect(source, `${file} must use SPLIT_PERCENTAGES`).not.toMatch(
        /\b15%/,
      )
    }
    for (const file of ["lib/workspace/access.ts", "lib/workspace/types.ts"]) {
      const source = read(file)
      expect(source).not.toContain("70/15")
      expect(source).not.toMatch(/\b70%/)
      expect(source).not.toMatch(/\b15%/)
    }
  })

  it("workspace files never hardcode fixture entity names", () => {
    const forbidden = [
      "Anisa Rahmawati",
      "Bambang Hardjono",
      "Sri Sriningsih",
      "Nadia Kusuma",
      "Fajar Nugroho",
      "Giriloyo",
      "Lasem",
      "Batik Tulis Soga",
    ]
    for (const file of WORKSPACE_FILES) {
      const source = read(file)
      for (const name of forbidden) {
        expect(source, `${file} must not hardcode ${name}`).not.toContain(name)
      }
    }
  })

  it("Convex read paths share the same closed enums as the workspace", () => {
    expect(read("convex/audit.ts")).toContain("LOG_KINDS")
    expect(read("convex/commerce.ts")).toContain("WORK_READINESS_LABELS")
    expect(read("convex/governance.ts")).toContain("BREAK_GLASS_ENTITY_TYPES")
  })
})
