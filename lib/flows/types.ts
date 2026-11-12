/** Serialisable flow and SLA view types shared by Convex and the flow board. */

import type {
  AutomationAction,
  AutomationTrigger,
  FlowKey,
  FlowStatusTone,
} from "./definitions"

export type FlowStateView = {
  key: string
  label: string
  terminal: boolean
  tone: FlowStatusTone
}

export type FlowTransitionView = {
  from: string
  to: string
  guard: string
  requiresRole: "admin" | "teacher" | "student" | "system" | null
  slaHours: number | null
}

export type FlowSlaView = {
  key: string
  flowKey: string
  name: string
  targetMinutes: number
  escalationMinutes: number | null
  owner: string
  active: boolean
}

export type FlowAutomationView = {
  key: string
  flowKey: string
  kind: "assignment" | "reminder" | "escalation" | "notification"
  trigger: AutomationTrigger
  action: AutomationAction
  enabled: boolean
}

export type FlowDefinitionView = {
  key: FlowKey
  name: string
  owner: string
  description: string
  version: number
  active: boolean
  source: "default" | "configured"
  states: FlowStateView[]
  transitions: FlowTransitionView[]
  sla: FlowSlaView
  automations: FlowAutomationView[]
}

export type FlowDistributionRow = {
  state: string
  label: string
  count: number
  terminal: boolean
  tone: FlowStatusTone
}

export type StuckRecordView = {
  flowKey: FlowKey
  flowName: string
  recordId: string
  label: string
  state: string
  stateLabel: string
  ageMinutes: number
  ownerId: string | null
  ownerName: string | null
  dueAt: number | null
  overdue: boolean
  nextAction: string
}

export type FlowDefinitionInput = {
  flowKey: FlowKey
  description?: string
  active?: boolean
  transitions: {
    from: string
    to: string
    guard: string
    requiresRole?: "admin" | "teacher" | "student" | "system"
    slaHours?: number
  }[]
}

export type FlowOverview = {
  definition: FlowDefinitionView
  distribution: FlowDistributionRow[]
  stuck: StuckRecordView[]
}
