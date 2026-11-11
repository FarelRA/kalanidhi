/**
 * The single capability registry.
 *
 * Every route, navigation item, component action, and Convex function checks
 * one of these strings. Roles are never checked directly outside
 * `lib/access/policy.ts` and `convex/access.ts`.
 */
export const CAPABILITIES = [
  // Learning and teaching
  "learn",
  "teach",
  "assess",
  "submissions.submit",
  "submissions.grade",
  "submissions.escalate",
  "certificates.read.own",
  "certificates.read.cohort",
  "certificates.manage",
  "certificates.revoke",
  "works.own",
  "works.review",
  "works.moderate",
  // Commerce
  "buy",
  "sell",
  "orders.buy",
  "orders.sell",
  "orders.read.own",
  "orders.read.all",
  "payments.manage",
  "payouts.view.own",
  "payouts.release",
  // Communication
  "messages.read.own",
  "messages.moderate",
  "calls.start",
  "calls.monitor",
  "schedule.read.own",
  "schedule.manage",
  "schedule.read.all",
  // Support and operations
  "support.request",
  "support.manage",
  "people.read",
  "people.manage",
  "content.publish",
  "stats.read",
  "stats.teach",
  "leads.read",
  "leads.write",
  "flows.manage",
  "logs.read",
  "governance.manage",
  "settings.platform",
  // Derived marker used by the shell for operator labels.
  "operate",
] as const

export type Capability = (typeof CAPABILITIES)[number]

export const WORKSPACE_ROLES = ["student", "teacher", "admin"] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const ACCOUNT_STATUSES = [
  "active",
  "suspended",
  "invited",
  "deleted",
] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** Capabilities that an admin account must never hold, even when another role is also attached. */
export const ADMIN_FORBIDDEN_CAPABILITIES: readonly Capability[] = [
  "learn",
  "teach",
  "assess",
  "submissions.submit",
  "submissions.grade",
  "sell",
  "orders.sell",
  "payouts.view.own",
  "works.review",
  "works.own",
]

export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value)
}
